import { CODE_ALPHABET } from '../guess/game.ts';
import {
  DRAW_BATCH_OFFSET_MS, DRAW_BATCH_SIZE,
  encodeBase28, GAME_CODE_LENGTH, GAME_TIME_CHARS,
  GAME_TAG_CHARS, PREVIOUS_TIMED_GAME_CODE_LENGTH,
  gameDetailsFromCode, timedGamePayload, timestampPayload
} from './game.ts';
import type { DrawIntervalSeconds } from './game.ts';

const encoder = new TextEncoder();

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function passwordMatches(expected: string, supplied: string): Promise<boolean> {
  return sameBytes(await digest(expected), await digest(supplied));
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function tag(secret: string, value: string): Promise<string> {
  const bytes = await hmac(secret, value);
  let number = 0n;
  for (const byte of bytes.slice(0, 6)) number = (number << 8n) | BigInt(byte);
  return encodeBase28(number, GAME_TAG_CHARS);
}

function sameCode(left: string, right: string): boolean {
  return sameBytes(encoder.encode(left), encoder.encode(right));
}

export function createGameCode(epochMs: number): string {
  if (!Number.isSafeInteger(epochMs) || epochMs < 0) throw new Error('Invalid game start time.');
  return timestampPayload(Math.floor(epochMs / 1_000));
}

export function createTimedGameCode(epochMs: number, intervalSeconds: DrawIntervalSeconds): string {
  if (!Number.isSafeInteger(epochMs) || epochMs < 0) throw new Error('Invalid game start time.');
  return timedGamePayload(Math.floor(epochMs / 1_000), intervalSeconds);
}

export function verifiedGameDetails(code: string): { startMs: number; intervalMs: number } | null {
  if (![GAME_CODE_LENGTH, GAME_TIME_CHARS, PREVIOUS_TIMED_GAME_CODE_LENGTH].includes(code.length) ||
    [...code].some(letter => !CODE_ALPHABET.includes(letter))) return null;
  try { return gameDetailsFromCode(code); }
  catch { return null; }
}

export function verifiedGameStart(code: string): number | null {
  return verifiedGameDetails(code)?.startMs ?? null;
}

export async function signPinCount(secret: string, game: string, count: number, at: number): Promise<string> {
  if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(at) || at < 0) {
    throw new Error('Invalid pin count or timestamp.');
  }
  return tag(secret, `pin:${game}:${count}:${at}`);
}

export async function pinCountSignatureIsValid(
  secret: string, game: string, count: number, at: number, signature: string
): Promise<boolean> {
  if (!/^[234679ACDEFGHJKLMNPQRTUVWXYZ]{11}$/.test(signature)) return false;
  return sameCode(signature, await signPinCount(secret, game, count, at));
}

async function shuffledIds(secret: string, batchStartMs: number, ids: number[]): Promise<number[]> {
  const keyBytes = await hmac(secret, `draw:${batchStartMs}`);
  const keyMaterial = new ArrayBuffer(keyBytes.length);
  new Uint8Array(keyMaterial).set(keyBytes);
  const key = await crypto.subtle.importKey('raw', keyMaterial, 'AES-CTR', false, ['encrypt']);
  const randomBytes = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: new Uint8Array(16), length: 64 },
    key, new Uint8Array(Math.max(0, ids.length - 1) * 4)
  ));
  const shuffled = [...ids];
  let offset = 0;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = ((randomBytes[offset] << 24) | (randomBytes[offset + 1] << 16) |
      (randomBytes[offset + 2] << 8) | randomBytes[offset + 3]) >>> 0;
    offset += 4;
    const other = value % (index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

export async function drawIds(
  secret: string, startMs: number, ids: number[], requestedCount: number
): Promise<number[]> {
  if (!Number.isSafeInteger(requestedCount) || requestedCount < 0) throw new Error('Invalid draw count.');
  const wanted = Math.min(requestedCount, ids.length);
  const selected: number[] = [];
  const seen = new Set<number>();
  for (let batch = 0; selected.length < wanted; batch += 1) {
    const shuffled = await shuffledIds(secret, startMs + batch * DRAW_BATCH_OFFSET_MS, ids);
    for (const id of shuffled) {
      if (seen.has(id)) continue;
      seen.add(id);
      selected.push(id);
      if (selected.length % DRAW_BATCH_SIZE === 0 || selected.length === wanted) break;
    }
    if (seen.size === ids.length) break;
  }
  return selected.slice(0, wanted);
}
