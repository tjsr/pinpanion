import {
  DRAW_BATCH_OFFSET_MS, DRAW_BATCH_SIZE,
  GAME_CODE_LENGTH, GAME_TAG_CHARS, GAME_TIME_CHARS,
  PREVIOUS_TIMED_GAME_CODE_LENGTH, encodeBase28,
  gameCodeWithSettings, gameDetailsFromCode, isNewGameCode, timedGamePayload, timestampPayload
} from './game.ts';
import { CODE_ALPHABET } from '../guess/game.ts';
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
    { hash: 'SHA-256', name: 'HMAC' }, false, ['sign']);
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

export function createRegisteredGameCode(epochMs: number,
  intervalSeconds: DrawIntervalSeconds, poolSize: number): string {
  if (!Number.isSafeInteger(epochMs) || epochMs < 0) throw new Error('Invalid game start time.');
  return gameCodeWithSettings(Math.floor(epochMs / 1_000), intervalSeconds, poolSize);
}

const GAME_PASSWORD_ITERATIONS = 100_000;

function hex(bytes: Uint8Array): string {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function unhex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Invalid password hash.');
  return new Uint8Array(value.match(/../g)!.map(byte => parseInt(byte, 16)));
}

async function deriveGamePassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({
    hash: 'SHA-256', iterations: GAME_PASSWORD_ITERATIONS, name: 'PBKDF2',
    salt: new Uint8Array(salt).buffer,
  }, key, 256));
}

export async function hashGamePassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: hex(await deriveGamePassword(password, salt)), salt: hex(salt) };
}

export async function gamePasswordHash(password: string, salt: string): Promise<string> {
  return hex(await deriveGamePassword(password, unhex(salt)));
}

export async function gamePasswordVerifier(secret: string, proof: string): Promise<string> {
  if (!/^[0-9a-f]{64}$/i.test(proof)) throw new Error('Invalid game password proof.');
  return `v2:${hex(await hmac(secret, proof.toLowerCase()))}`;
}

export async function gamePasswordProofMatches(proof: string, verifier: string,
  secret: string): Promise<boolean> {
  return /^[0-9a-f]{64}$/i.test(proof) && /^v2:[0-9a-f]{64}$/i.test(verifier) &&
    sameBytes(unhex((await gamePasswordVerifier(secret, proof)).slice(3)), unhex(verifier.slice(3)));
}

export function verifiedGameDetails(code: string): { startMs: number; intervalMs: number; poolSize?: number } | null {
  if (isNewGameCode(code)) {
    try {
      return gameDetailsFromCode(code); 
    } catch {
      return null; 
    }
  }
  if (![GAME_CODE_LENGTH, GAME_TIME_CHARS, PREVIOUS_TIMED_GAME_CODE_LENGTH].includes(code.length) ||
    [...code].some(letter => !CODE_ALPHABET.includes(letter))) return null;
  try {
    return gameDetailsFromCode(code); 
  } catch {
    return null; 
  }
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

export async function callerSigningKey(secret: string, game: string): Promise<string> {
  return hex(await hmac(secret, `pingo:caller-signature:v1:${game}`));
}

export async function callerPinSignatureIsValid(
  secret: string, game: string, count: number, at: number, signature: string
): Promise<boolean> {
  const scopedKey = await callerSigningKey(secret, game);
  const [current, legacy] = await Promise.all([
    pinCountSignatureIsValid(scopedKey, game, count, at, signature),
    pinCountSignatureIsValid(secret, game, count, at, signature),
  ]);
  return current || legacy;
}

export async function drawBatchKeys(secret: string, startMs: number, requestedCount: number): Promise<string[]> {
  if (!Number.isSafeInteger(startMs) || startMs < 0 ||
    !Number.isSafeInteger(requestedCount) || requestedCount < 0) throw new Error('Invalid draw request.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' }, false, ['sign']);
  const keys: string[] = [];
  for (let batch = 0; batch < Math.ceil(requestedCount / DRAW_BATCH_SIZE); batch += 1) {
    const value = encoder.encode(`draw:${startMs + batch * DRAW_BATCH_OFFSET_MS}`);
    keys.push(hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, value))));
  }
  return keys;
}

async function shuffledIdsFromKey(keyHex: string, ids: number[]): Promise<number[]> {
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error('Invalid draw batch key.');
  const keyBytes = unhex(keyHex);
  const keyMaterial = new ArrayBuffer(keyBytes.length);
  new Uint8Array(keyMaterial).set(keyBytes);
  const key = await crypto.subtle.importKey('raw', keyMaterial, 'AES-CTR', false, ['encrypt']);
  const randomBytes = new Uint8Array(await crypto.subtle.encrypt(
    { counter: new Uint8Array(16), length: 64, name: 'AES-CTR' },
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

export async function drawIdsFromBatchKeys(
  keys: string[], ids: number[], requestedCount: number
): Promise<number[]> {
  if (!Number.isSafeInteger(requestedCount) || requestedCount < 0) throw new Error('Invalid draw count.');
  const wanted = Math.min(requestedCount, ids.length);
  if (keys.length < Math.ceil(wanted / DRAW_BATCH_SIZE)) throw new Error('Draw batch keys are unavailable.');
  const selected: number[] = [];
  const seen = new Set<number>();
  for (let batch = 0; selected.length < wanted; batch += 1) {
    const shuffled = await shuffledIdsFromKey(keys[batch], ids);
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

export async function drawIds(
  secret: string, startMs: number, ids: number[], requestedCount: number
): Promise<number[]> {
  const keys = await drawBatchKeys(secret, startMs, Math.min(requestedCount, ids.length));
  return drawIdsFromBatchKeys(keys, ids, requestedCount);
}
