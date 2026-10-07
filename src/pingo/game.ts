import { CODE_ALPHABET, CODE_PATTERN, createRandom, hashString, validPinsFrom } from '../guess/game.ts';
import type { Pin } from '../types.ts';

export const BOARD_SIZE = 25;
export const DRAW_BATCH_SIZE = 100;
export const DRAW_INTERVAL_MS = 30_000;
export const DRAW_BATCH_OFFSET_MS = 3_000_000;
export const GAME_TAG_CHARS = 11;
export const GAME_TIME_CHARS = 7;
export const GAME_CODE_LENGTH = 6;
export const PREVIOUS_TIMED_GAME_CODE_LENGTH = 8;
export const MAX_GAME_CODE_LENGTH = PREVIOUS_TIMED_GAME_CODE_LENGTH;
export const DRAW_INTERVAL_SECONDS = [10, 15, 20, 30] as const;
export type DrawIntervalSeconds = typeof DRAW_INTERVAL_SECONDS[number];
const BASE = BigInt(CODE_ALPHABET.length);
const TIME_BITS = 32;
const MAX_TIME = (1n << BigInt(TIME_BITS)) - 1n;
const ROLLING_TIME_BITS = 26;
const ROLLING_PERIOD = 1n << BigInt(ROLLING_TIME_BITS);
const ROLLING_MASK = ROLLING_PERIOD - 1n;

export function usablePinsFrom(feed: { pins?: unknown }): Pin[] {
  const seen = new Set<number>();
  return validPinsFrom(feed).filter(pin => {
    if (!Number.isSafeInteger(pin.id) || pin.id < 0 || seen.has(pin.id)) return false;
    seen.add(pin.id);
    return true;
  });
}

export function boardPins(code: string, pins: Pin[]): Pin[] {
  if (!CODE_PATTERN.test(code)) throw new Error('Invalid board code.');
  if (pins.length < BOARD_SIZE) throw new Error('At least 25 usable pins are required.');
  const indexes = Array.from({ length: pins.length }, (_, index) => index);
  const random = createRandom(hashString(`${code}:PINGO:BOARD`));
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [indexes[index], indexes[other]] = [indexes[other], indexes[index]];
  }
  return indexes.slice(0, BOARD_SIZE).map(index => pins[index]);
}

export function boardCodeFromTimestamp(epochMs: number): string {
  if (!Number.isSafeInteger(epochMs) || epochMs < 0) throw new Error('Invalid board creation time.');
  return encodeBase28(BigInt(epochMs) % (BASE ** 4n), 4);
}

export function encodeBase28(value: bigint, width: number): string {
  if (value < 0n || value >= BASE ** BigInt(width)) throw new Error('Value is outside code range.');
  let rest = value;
  let result = '';
  for (let index = 0; index < width; index += 1) {
    result = CODE_ALPHABET[Number(rest % BASE)] + result;
    rest /= BASE;
  }
  return result;
}

export function decodeBase28(value: string): bigint {
  let result = 0n;
  for (const letter of value) {
    const digit = CODE_ALPHABET.indexOf(letter);
    if (digit < 0) throw new Error('Invalid code alphabet.');
    result = result * BASE + BigInt(digit);
  }
  return result;
}

function reverseBits(value: bigint, bits: number): bigint {
  if (value < 0n || value >= (1n << BigInt(bits))) throw new Error('Timestamp is outside game code range.');
  let reversed = 0n;
  for (let bit = 0; bit < bits; bit += 1) {
    reversed = (reversed << 1n) | ((value >> BigInt(bit)) & 1n);
  }
  return reversed;
}

export function reverseBits32(value: bigint): bigint {
  return reverseBits(value, TIME_BITS);
}

export function timestampPayload(epochSeconds: number): string {
  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 0 || BigInt(epochSeconds) > MAX_TIME) {
    throw new Error('Invalid game start time.');
  }
  return encodeBase28(reverseBits32(BigInt(epochSeconds)), GAME_TIME_CHARS);
}

export function timestampFromPayload(payload: string): number {
  if (payload.length !== GAME_TIME_CHARS) throw new Error('Invalid game code length.');
  const reversed = decodeBase28(payload);
  if (reversed > MAX_TIME) throw new Error('Invalid game timestamp.');
  return Number(reverseBits32(reversed));
}

export function timestampFromGameCode(code: string): number {
  return gameDetailsFromCode(code).startMs;
}

export function timedGamePayload(epochSeconds: number, intervalSeconds: DrawIntervalSeconds): string {
  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 0) {
    throw new Error('Invalid game start time.');
  }
  const speed = DRAW_INTERVAL_SECONDS.indexOf(intervalSeconds);
  if (speed < 0) throw new Error('Invalid draw interval.');
  const lowSeconds = BigInt(epochSeconds) & ROLLING_MASK;
  return encodeBase28((reverseBits(lowSeconds, ROLLING_TIME_BITS) << 2n) | BigInt(speed), GAME_CODE_LENGTH);
}

export function gameDetailsFromCode(code: string, nowMs = Date.now()): { startMs: number; intervalMs: number } {
  if (code.length === GAME_TIME_CHARS) {
    return { intervalMs: DRAW_INTERVAL_MS, startMs: timestampFromPayload(code) * 1_000 };
  }
  if (code.length !== GAME_CODE_LENGTH && code.length !== PREVIOUS_TIMED_GAME_CODE_LENGTH) {
    throw new Error('Invalid game code length.');
  }
  const payload = decodeBase28(code);
  const reversed = payload >> 2n;
  const intervalMs = DRAW_INTERVAL_SECONDS[Number(payload & 3n)] * 1_000;
  if (code.length === PREVIOUS_TIMED_GAME_CODE_LENGTH) {
    if (reversed > MAX_TIME) throw new Error('Invalid game timestamp.');
    return { intervalMs, startMs: Number(reverseBits32(reversed)) * 1_000 };
  }
  if (reversed >= ROLLING_PERIOD || !Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error('Invalid game timestamp.');
  }
  const nowSeconds = BigInt(Math.floor(nowMs / 1_000));
  let startSeconds = (nowSeconds & ~ROLLING_MASK) | reverseBits(reversed, ROLLING_TIME_BITS);
  if (startSeconds > nowSeconds) startSeconds -= ROLLING_PERIOD;
  if (startSeconds < 0n) throw new Error('Invalid game timestamp.');
  return {
    intervalMs,
    startMs: Number(startSeconds) * 1_000,
  };
}

export function drawIntervalFromGameCode(code: string): number {
  return gameDetailsFromCode(code).intervalMs;
}

export function scheduledCount(startMs: number, nowMs: number, intervalMs = DRAW_INTERVAL_MS): number {
  if (nowMs < startMs) return 0;
  return Math.floor((nowMs - startMs) / intervalMs) + 1;
}

export function winningLines(boardIds: number[], calledIds: Iterable<number>): number[][] {
  if (boardIds.length !== BOARD_SIZE) throw new Error('A board needs 25 pins.');
  const called = new Set(calledIds);
  const lines: number[][] = [];
  for (let row = 0; row < 5; row += 1) {
    const cells = Array.from({ length: 5 }, (_, column) => row * 5 + column);
    if (cells.every(index => called.has(boardIds[index]))) lines.push(cells);
  }
  for (let column = 0; column < 5; column += 1) {
    const cells = Array.from({ length: 5 }, (_, row) => row * 5 + column);
    if (cells.every(index => called.has(boardIds[index]))) lines.push(cells);
  }
  return lines;
}
