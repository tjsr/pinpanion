import { CODE_ALPHABET, CODE_PATTERN, createRandom, hashString, validPinsFrom } from '../guess/game.ts';
import type { Pin } from '../types.ts';

export const BOARD_SIZE = 25;
export const DRAW_BATCH_SIZE = 100;
export const DRAW_INTERVAL_MS = 30_000;
export const DRAW_BATCH_OFFSET_MS = 3_000_000;
export const GAME_TAG_CHARS = 11;
export const GAME_TIME_CHARS = 7;
export const GAME_CODE_LENGTH = 6;
export const GAME_SETTINGS_CHARS = 3;
export const GAME_WITH_SETTINGS_LENGTH = GAME_CODE_LENGTH + 1 + GAME_SETTINGS_CHARS;
export const BOARD_WITH_SETTINGS_LENGTH = 4 + 1 + GAME_SETTINGS_CHARS;
export const PREVIOUS_TIMED_GAME_CODE_LENGTH = 8;
export const MAX_GAME_CODE_LENGTH = GAME_WITH_SETTINGS_LENGTH;
export const DRAW_INTERVAL_SECONDS = [10, 15, 20, 30] as const;
export const DEFAULT_POOL_SIZE = 150;
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
  const poolSize = boardPoolSize(code) ?? pins.length;
  if (pins.length < poolSize || poolSize < BOARD_SIZE) throw new Error('The pin pool is unavailable.');
  const indexes = Array.from({ length: poolSize }, (_, index) => index);
  const random = createRandom(hashString(`${code}:PINGO:BOARD`));
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [indexes[index], indexes[other]] = [indexes[other], indexes[index]];
  }
  return indexes.slice(0, BOARD_SIZE).map(index => pins[index]);
}

export function settingsCode(intervalSeconds: DrawIntervalSeconds, poolSize: number): string {
  const speed = DRAW_INTERVAL_SECONDS.indexOf(intervalSeconds);
  if (speed < 0 || !Number.isSafeInteger(poolSize) || poolSize < BOARD_SIZE ||
    poolSize % BOARD_SIZE !== 0 || poolSize / BOARD_SIZE > Number((BASE ** 3n - 1n) >> 2n)) {
    throw new Error('Invalid game settings.');
  }
  return encodeBase28(BigInt((poolSize / BOARD_SIZE) * 4 + speed), GAME_SETTINGS_CHARS);
}

export function settingsFromCode(suffix: string): { intervalMs: number; poolSize: number } {
  if (suffix.length !== GAME_SETTINGS_CHARS) throw new Error('Invalid game settings.');
  const packed = decodeBase28(suffix);
  const units = Number(packed >> 2n);
  if (units < 1) throw new Error('Invalid pin pool size.');
  return { intervalMs: DRAW_INTERVAL_SECONDS[Number(packed & 3n)] * 1_000,
    poolSize: units * BOARD_SIZE };
}

export function isNewGameCode(code: string): boolean {
  return code.length === GAME_WITH_SETTINGS_LENGTH && code[GAME_CODE_LENGTH] === '-';
}

export function isBoardCodeForGame(board: string, game: string): boolean {
  if (isNewGameCode(game)) return board.length === BOARD_WITH_SETTINGS_LENGTH &&
    CODE_PATTERN.test(board.slice(0, 4)) && board[4] === '-' &&
    board.slice(5) === game.slice(GAME_CODE_LENGTH + 1);
  return CODE_PATTERN.test(board);
}

export function boardCodeForGame(baseCode: string, game: string): string {
  if (!CODE_PATTERN.test(baseCode) || !isNewGameCode(game)) throw new Error('Invalid game or board code.');
  settingsFromCode(game.slice(GAME_CODE_LENGTH + 1));
  return `${baseCode}-${game.slice(GAME_CODE_LENGTH + 1)}`;
}

export function boardPoolSize(code: string): number | null {
  if (CODE_PATTERN.test(code)) return null;
  if (code.length !== BOARD_WITH_SETTINGS_LENGTH || !CODE_PATTERN.test(code.slice(0, 4)) ||
    code[4] !== '-') throw new Error('Invalid board code.');
  return settingsFromCode(code.slice(5)).poolSize;
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

export function gameCodeWithSettings(epochSeconds: number,
  intervalSeconds: DrawIntervalSeconds, poolSize = DEFAULT_POOL_SIZE): string {
  if (!Number.isSafeInteger(epochSeconds) || epochSeconds < 0) throw new Error('Invalid game start time.');
  const lowSeconds = BigInt(epochSeconds) & ROLLING_MASK;
  return `${encodeBase28(reverseBits(lowSeconds, ROLLING_TIME_BITS), GAME_CODE_LENGTH)}-${settingsCode(intervalSeconds, poolSize)}`;
}

export function gameDetailsFromCode(code: string, nowMs = Date.now()): { startMs: number; intervalMs: number; poolSize?: number } {
  if (code.length === GAME_TIME_CHARS) {
    return { intervalMs: DRAW_INTERVAL_MS, startMs: timestampFromPayload(code) * 1_000 };
  }
  const newFormat = isNewGameCode(code);
  if (!newFormat && code.length !== GAME_CODE_LENGTH && code.length !== PREVIOUS_TIMED_GAME_CODE_LENGTH) {
    throw new Error('Invalid game code length.');
  }
  const payload = decodeBase28(newFormat ? code.slice(0, GAME_CODE_LENGTH) : code);
  const reversed = newFormat ? payload : payload >> 2n;
  const settings = newFormat ? settingsFromCode(code.slice(GAME_CODE_LENGTH + 1)) : null;
  const intervalMs = settings?.intervalMs ?? DRAW_INTERVAL_SECONDS[Number(payload & 3n)] * 1_000;
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
    ...(settings ? { poolSize: settings.poolSize } : {}),
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
