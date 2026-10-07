import type { Pin } from '../types.ts';

export const CODE_ALPHABET = '234679ACDEFGHJKLMNPQRTUVWXYZ';
export const CODE_PATTERN = /^[234679ACDEFGHJKLMNPQRTUVWXYZ]{4}$/;
export const BOARD_SIZE = 24;

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidPin(pin: unknown): pin is Pin {
  if (!pin || typeof pin !== 'object') return false;
  const candidate = pin as Partial<Pin>;
  return typeof candidate.name === 'string' && candidate.name.trim().length > 0 &&
    typeof candidate.image_name === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:webp|png|jpe?g)$/i.test(candidate.image_name);
}

export function validPinsFrom(feed: { pins?: unknown }): Pin[] {
  if (!Array.isArray(feed?.pins)) throw new Error('Pin feed has no pins array.');
  return feed.pins.filter(isValidPin);
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function boardIndexes(code: string, player: 1 | 2, count: number): number[] {
  if (!CODE_PATTERN.test(code)) throw new Error('Invalid game code.');
  if (!Number.isInteger(count) || count < BOARD_SIZE) throw new Error('At least 24 valid pins are required.');
  const indexes = Array.from({ length: count }, (_, index) => index);
  const random = createRandom(hashString(`${code}:P${player}:BOARD`));
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [indexes[index], indexes[other]] = [indexes[other], indexes[index]];
  }
  return indexes.slice(0, BOARD_SIZE);
}

export function targetIndex(code: string, player: 1 | 2): number {
  if (!CODE_PATTERN.test(code)) throw new Error('Invalid game code.');
  return Math.floor(createRandom(hashString(`${code}:P${player}:TARGET`))() * BOARD_SIZE);
}

export function generateGame(code: string, pins: Pin[]) {
  const player1 = boardIndexes(code, 1, pins.length).map(index => pins[index]);
  const player2 = boardIndexes(code, 2, pins.length).map(index => pins[index]);
  return {
    boards: { 1: player1, 2: player2 },
    targets: { 1: player1[targetIndex(code, 1)], 2: player2[targetIndex(code, 2)] },
  };
}

export function makeCode(randomValues: Uint32Array = crypto.getRandomValues(new Uint32Array(4))): string {
  return Array.from(randomValues, value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
}
