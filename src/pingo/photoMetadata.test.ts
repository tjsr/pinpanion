import { addCaptureMetadata, captureMetadataMatches, formatPhotoTakenAt,
  readCaptureMetadata } from './photoMetadata.ts';
import { describe, expect, it } from 'vitest';

describe('scavenger photo timestamp', () => {
  it('writes the capture time into EXIF and reads it back from the JPEG', async () => {
    const capturedAt = new Date(2026, 9, 7, 14, 5, 9, 321).getTime();
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
    const photo = await addCaptureMetadata(jpeg, capturedAt);
    expect(await readCaptureMetadata(photo)).toBe(Math.floor(capturedAt / 1000) * 1000);
    expect(await captureMetadataMatches(photo, capturedAt)).toBe(true);
    expect(await captureMetadataMatches(photo, capturedAt + 1000)).toBe(false);
    expect(formatPhotoTakenAt(capturedAt)).toBe('Photo taken at 07/10/2026 14:05:09');
  });

  it('rejects blobs without a JPEG image or matching metadata', async () => {
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
    expect(await captureMetadataMatches(jpeg, Date.now())).toBe(false);
    await expect(addCaptureMetadata(new Blob(['not a JPEG']), Date.now())).rejects.toThrow('valid JPEG');
  });
});
