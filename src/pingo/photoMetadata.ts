// Canvas removes camera EXIF when it crops a frame. Keep the page's capture time
// in the final JPEG as standard EXIF DateTimeOriginal and OffsetTimeOriginal tags.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Photo could not be read.'));
    reader.readAsArrayBuffer(blob);
  });
}

function exifSegment(capturedAt: number): Uint8Array {
  const date = new Date(capturedAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  const dateTime = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}\0`;
  const offsetMinutes = -date.getTimezoneOffset();
  const offset = `${offsetMinutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:` +
    `${pad(Math.abs(offsetMinutes) % 60)}\0`;
  const payload = new Uint8Array(6 + 56 + 20 + 7);
  payload.set(encoder.encode('Exif\0\0'));
  const view = new DataView(payload.buffer, 6);
  const short = (at: number, value: number) => view.setUint16(at, value, true);
  const long = (at: number, value: number) => view.setUint32(at, value, true);
  short(0, 0x4949); short(2, 42); long(4, 8);
  short(8, 1); short(10, 0x8769); short(12, 4); long(14, 1); long(18, 26);
  short(26, 2);
  short(28, 0x9003); short(30, 2); long(32, 20); long(36, 56);
  short(40, 0x9011); short(42, 2); long(44, 7); long(48, 76);
  payload.set(encoder.encode(dateTime), 6 + 56);
  payload.set(encoder.encode(offset), 6 + 76);
  const segment = new Uint8Array(payload.length + 4);
  segment.set([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
  segment.set(payload, 4);
  return segment;
}

export async function addCaptureMetadata(blob: Blob, capturedAt: number): Promise<Blob> {
  const bytes = await blobBytes(blob);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || !Number.isSafeInteger(capturedAt)) {
    throw new Error('The captured photo is not a valid JPEG.');
  }
  return new Blob([bytes.slice(0, 2).buffer as ArrayBuffer,
    exifSegment(capturedAt).buffer as ArrayBuffer, bytes.slice(2).buffer as ArrayBuffer],
  { type: 'image/jpeg' });
}

function readExif(payload: Uint8Array): number | null {
  if (decoder.decode(payload.slice(0, 6)) !== 'Exif\0\0') return null;
  const view = new DataView(payload.buffer, payload.byteOffset + 6, payload.length - 6);
  if (view.byteLength < 8 || view.getUint16(0, true) !== 0x4949 || view.getUint16(2, true) !== 42) return null;
  const short = (at: number) => at + 2 <= view.byteLength ? view.getUint16(at, true) : null;
  const long = (at: number) => at + 4 <= view.byteLength ? view.getUint32(at, true) : null;
  const entries = (offset: number) => {
    const count = short(offset);
    if (count === null || offset + 2 + count * 12 + 4 > view.byteLength) return [];
    return Array.from({ length: count }, (_, i) => offset + 2 + i * 12);
  };
  const main = long(4);
  if (main === null) return null;
  const pointer = entries(main).find(at => short(at) === 0x8769 && short(at + 2) === 4);
  const exif = pointer === undefined ? null : long(pointer + 8);
  if (exif === null) return null;
  const fields = entries(exif);
  const ascii = (tag: number) => {
    const at = fields.find(entry => short(entry) === tag && short(entry + 2) === 2);
    if (at === undefined) return null;
    const size = long(at + 4);
    const offset = long(at + 8);
    if (size === null || offset === null || offset + size > view.byteLength || size < 2) return null;
    return decoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset, size - 1));
  };
  const dateTime = ascii(0x9003);
  const offset = ascii(0x9011);
  const parts = dateTime?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  const zone = offset?.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!parts || !zone) return null;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  const checked = new Date(utc);
  if (checked.getUTCFullYear() !== year || checked.getUTCMonth() + 1 !== month ||
      checked.getUTCDate() !== day || checked.getUTCHours() !== hour ||
      checked.getUTCMinutes() !== minute || checked.getUTCSeconds() !== second ||
      Number(zone[2]) > 23 || Number(zone[3]) > 59) return null;
  const minutes = (Number(zone[2]) * 60 + Number(zone[3])) * (zone[1] === '+' ? 1 : -1);
  return utc - minutes * 60_000;
}

export async function readCaptureMetadata(blob: Blob): Promise<number | null> {
  const bytes = await blobBytes(blob);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let at = 2; at + 4 <= bytes.length && bytes[at] === 0xff;) {
    const marker = bytes[at + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const size = bytes[at + 2] * 256 + bytes[at + 3];
    if (size < 2 || at + 2 + size > bytes.length) break;
    if (marker === 0xe1) {
      const result = readExif(bytes.subarray(at + 4, at + 2 + size));
      if (result !== null) return result;
    }
    at += 2 + size;
  }
  return null;
}

export async function captureMetadataMatches(blob: Blob, capturedAt: number): Promise<boolean> {
  return await readCaptureMetadata(blob) === Math.floor(capturedAt / 1000) * 1000;
}

export function formatPhotoTakenAt(capturedAt: number): string {
  const date = new Date(capturedAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Photo taken at ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
