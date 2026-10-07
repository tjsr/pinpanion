import { captureMetadataMatches } from './photoMetadata.ts';

export type CropSquare = { x: number; y: number; size: number };

export type HuntPhoto = {
  key: string;
  boardCode: string;
  pinId: number;
  capturedAt: number;
  blob: Blob;
  metadataVersion?: 1;
};

const DATABASE_NAME = 'pingo-scavenger-hunt';
const STORE_NAME = 'photos';

export function boardStartedAt(code: string): number {
  const key = `pingo:board:${code}:createdAt`;
  try {
    const saved = Number(window.localStorage.getItem(key));
    if (Number.isSafeInteger(saved) && saved > 0) return saved;
    const startedAt = Date.now();
    window.localStorage.setItem(key, String(startedAt));
    return startedAt;
  } catch {
    return Date.now();
  }
}

export function photoIsValid(photo: Pick<HuntPhoto, 'capturedAt'>, startedAt: number): boolean {
  return Number.isSafeInteger(photo.capturedAt) && photo.capturedAt >= startedAt;
}

export function centeredSquare(width: number, height: number): CropSquare {
  const size = Math.min(width, height) * 0.65;
  return { size, x: (width - size) / 2, y: (height - size) / 2 };
}

export function moveSquare(square: CropSquare, dx: number, dy: number,
  width: number, height: number): CropSquare {
  return {
    ...square,
    x: Math.max(0, Math.min(width - square.size, square.x + dx)),
    y: Math.max(0, Math.min(height - square.size, square.y + dy)),
  };
}

export function resizeSquare(square: CropSquare, delta: number,
  width: number, height: number): CropSquare {
  const minimum = Math.max(24, Math.min(width, height) * 0.1);
  return { ...square,
    size: Math.max(minimum, Math.min(square.size + delta, width - square.x, height - square.y)) };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Photo storage is unavailable in this browser.'));
      return;
    }
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      store.createIndex('boardCode', 'boardCode');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Photo storage could not be opened.'));
  });
}

export async function loadBoardPhotos(boardCode: string): Promise<HuntPhoto[]> {
  const database = await openDatabase();
  try {
    const saved = await new Promise<HuntPhoto[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME).index('boardCode').getAll(boardCode);
      request.onsuccess = () => resolve(request.result as HuntPhoto[]);
      request.onerror = () => reject(request.error ?? new Error('Saved photos could not be read.'));
    });
    const checked = await Promise.all(saved.map(async photo => {
      if (photo.metadataVersion !== 1) return photo;
      try {
        return await captureMetadataMatches(photo.blob, photo.capturedAt) ? photo : null;
      } catch {
        return null;
      }
    }));
    return checked.filter((photo): photo is HuntPhoto => photo !== null);
  } finally {
    database.close(); 
  }
}

export async function saveBoardPhoto(boardCode: string, pinId: number,
  capturedAt: number, blob: Blob): Promise<HuntPhoto> {
  if (!await captureMetadataMatches(blob, capturedAt)) {
    throw new Error('The photo timestamp could not be verified. Please retake the photo.');
  }
  const photo: HuntPhoto = { blob, boardCode, capturedAt, key: `${boardCode}:${pinId}`,
    metadataVersion: 1, pinId };
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(photo);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Photo could not be saved.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Photo could not be saved.'));
    });
    return photo;
  } finally {
    database.close(); 
  }
}
