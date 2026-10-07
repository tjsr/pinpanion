import {
  GAME_CODE_LENGTH, boardCodeFromTimestamp, boardPins, decodeBase28, drawIntervalFromGameCode,
  encodeBase28, gameDetailsFromCode, scheduledCount, timedGamePayload, timestampFromPayload,
  timestampPayload, usablePinsFrom, winningLines
} from './game.ts';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createGameCode, createTimedGameCode, drawIds, pinCountSignatureIsValid, signPinCount,
  verifiedGameStart
} from './secure.ts';
import type { Pin } from '../types.ts';
import { webcrypto } from 'node:crypto';
import worker from './worker.ts';

const pins = Array.from({ length: 130 }, (_, id) => ({ id, image_name: `pin-${id}.webp`, name: `Pin ${id}` })) as Pin[];
const secret = 'unit-test-secret-with-sufficient-length';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
});

describe('Pingo generation', () => {
  it('derives a four-character board code from the time a player joins', () => {
    expect(boardCodeFromTimestamp(0)).toBe('2222');
    expect(boardCodeFromTimestamp(1)).toBe('2223');
    expect(boardCodeFromTimestamp(28)).toBe('2232');
    expect(boardCodeFromTimestamp(1_791_200_000_123)).toMatch(/^[234679ACDEFGHJKLMNPQRTUVWXYZ]{4}$/);
    expect(boardCodeFromTimestamp(1_791_200_000_123)).toBe(boardCodeFromTimestamp(1_791_200_000_123));
    expect(() => boardCodeFromTimestamp(-1)).toThrow();
  });
  it('uses 25 unique catalog IDs and keeps the board repeatable', () => {
    const usable = usablePinsFrom({ pins: [null, { ...pins[0], id: -1 }, ...pins, { ...pins[1] }] });
    expect(usable).toHaveLength(pins.length);
    const first = boardPins('XY6D', usable).map(pin => pin.id);
    expect(first).toEqual(boardPins('XY6D', usable).map(pin => pin.id));
    expect(first).toHaveLength(25);
    expect(new Set(first).size).toBe(25);
  });

  it.each([
    [0, '2222222'],
    [1, '7HTUEDM'],
    [946_684_800, '23R3LU7'],
    [1_704_067_200, '22ZE6LP'],
    [2_147_483_647, 'DXLMPN4'],
    [2_147_483_648, '2222223'],
    [4_294_967_295, 'DXLMPN6'],
  ])('encodes 32-bit epoch second %i as %s', (seconds, code) => {
    expect(timestampPayload(seconds)).toBe(code);
    expect(timestampFromPayload(code)).toBe(seconds);
  });

  it('fits 26 timestamp bits and two speed bits in six base-28 characters', () => {
    expect(GAME_CODE_LENGTH).toBe(6);
    expect(28 ** 5).toBeLessThan(2 ** 28);
    expect(28 ** 6).toBeGreaterThan(2 ** 28);
    expect(28 ** 6).toBeLessThan(2 ** 29);
    expect(() => encodeBase28(0xffff_ffffn, 6)).toThrow();
    expect(decodeBase28(encodeBase28(0xffff_ffffn, 7))).toBe(0xffff_ffffn);
    expect(() => timestampPayload(0x1_0000_0000)).toThrow();
    expect(() => timestampPayload(-1)).toThrow();
  });

  it.each([
    [0, 10, '222222'], [0, 15, '222223'], [0, 20, '222224'], [0, 30, '222226'],
    [1, 10, 'CUF74D'], [1_704_067_200, 20, '23QUZA'],
    [1_791_283_371, 10, 'HZHG7R'], [1_791_283_371, 30, 'HZHG7V'],
    [4_294_967_295, 30, 'LMRD7L'],
  ] as const)('encodes epoch second %i at %is as %s', (seconds, intervalSeconds, code) => {
    expect(timedGamePayload(seconds, intervalSeconds)).toBe(code);
    expect(gameDetailsFromCode(code, seconds * 1_000)).toEqual({
      intervalMs: intervalSeconds * 1_000, startMs: seconds * 1_000,
    });
    expect(Number(decodeBase28(code) % 4n)).toBe([10, 15, 20, 30].indexOf(intervalSeconds));
  });

  it('restores the most recent timestamp across a leading-bit boundary', () => {
    const seconds = 1_791_283_371;
    const periodMs = 2 ** 26 * 1_000;
    const code = timedGamePayload(seconds, 15);
    expect(gameDetailsFromCode(code, seconds * 1_000 + periodMs - 1).startMs).toBe(seconds * 1_000);
    expect(gameDetailsFromCode(code, seconds * 1_000 + periodMs).startMs).toBe(seconds * 1_000 + periodMs);
  });

  it('keeps seven- and eight-character games valid and rejects impossible timestamps', () => {
    expect(drawIntervalFromGameCode(createGameCode(1_704_067_200_000))).toBe(30_000);
    expect(gameDetailsFromCode('226XDKAP')).toEqual({ intervalMs: 20_000, startMs: 1_704_067_200_000 });
    expect(() => gameDetailsFromCode('ZZZZZZZZ')).toThrow();
    expect(() => gameDetailsFromCode('ZZZZZZ')).toThrow();
    expect(() => timedGamePayload(0, 12 as 10)).toThrow();
    expect(scheduledCount(1_000, 10_999, 10_000)).toBe(1);
    expect(scheduledCount(1_000, 11_000, 10_000)).toBe(2);
  });

  it('uses the decoded epoch second as the start of 30-second intervals', () => {
    const time = 1_791_200_000_000;
    expect(scheduledCount(time, time - 1)).toBe(0);
    expect(scheduledCount(time, time)).toBe(1);
    expect(scheduledCount(time, time + 30_000)).toBe(2);
  });

  it('recognizes rows and columns, but not diagonals', () => {
    const board = Array.from({ length: 25 }, (_, index) => index);
    expect(winningLines(board, [0, 6, 12, 18, 24])).toEqual([]);
    expect(winningLines(board, [0, 1, 2, 3, 4, 5, 10, 15, 20])).toEqual([
      [0, 1, 2, 3, 4], [0, 5, 10, 15, 20],
    ]);
  });

  it('creates a seven-character game ID, signs count overrides, and draws distinct batches', async () => {
    const game = await createGameCode(1_791_200_000_123);
    expect(game).toBe('22UFAJF');
    expect(await verifiedGameStart(game)).toBe(1_791_200_000_000);
    expect(await verifiedGameStart('22UFAJ!')).toBeNull();
    const sig = await signPinCount(secret, game, 101, 1_791_200_005_000);
    expect(await pinCountSignatureIsValid(secret, game, 101, 1_791_200_005_000, sig)).toBe(true);
    expect(await pinCountSignatureIsValid(secret, game, 102, 1_791_200_005_000, sig)).toBe(false);
    const ids = pins.map(pin => pin.id);
    const first = await drawIds(secret, 1_791_200_000_123, ids, 120);
    expect(first).toEqual(await drawIds(secret, 1_791_200_000_123, ids, 120));
    expect(new Set(first).size).toBe(120);
    expect(first.slice(0, 100)).not.toEqual(first.slice(20, 120));
  });
});

describe('Pingo verification API', () => {
  it('marks only calls at or after the encoded game start', async () => {
    const startMs = 1_791_200_000_000;
    const game = createGameCode(startMs);
    const board = 'XY6D';
    const env = {
      ASSETS: { fetch: async () => Response.json({ pins }) },
      PINGO_ADMIN_PASSWORD: 'test password', PINGO_SIGNING_SECRET: secret,
    };
    const request = new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=${board}`);
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(startMs - 1_000);
      const before = await worker.fetch(request, env);
      expect(before.status).toBe(200);
      expect(await before.json()).toMatchObject({ count: 0, matchedIds: [], winningLines: [] });

      now.mockReturnValue(startMs);
      const first = await worker.fetch(request, env);
      const firstCall = await drawIds(secret, startMs, pins.map(pin => pin.id), 1);
      const boardIds = boardPins(board, pins).map(pin => pin.id);
      expect(await first.json()).toMatchObject({ count: 1,
        matchedIds: boardIds.filter(id => firstCall.includes(id)) });

      now.mockReturnValue(startMs + 30_000);
      const second = await worker.fetch(request, env);
      expect((await second.json() as { count: number }).count).toBe(2);

      const earlyAt = startMs - 1_000;
      const sig = await signPinCount(secret, game, 1, earlyAt);
      const premature = await worker.fetch(new Request(
        `https://pingo.test/api/pingo/verify?game=${game}&board=${board}&pin=1&at=${earlyAt}&sig=${sig}`
      ), env);
      expect(premature.status).toBe(403);
    } finally {
      now.mockRestore(); 
    }
  });

  it('rejects unsigned future counts and accepts an admin-signed snapshot', async () => {
    const env = {
      ASSETS: { fetch: async () => Response.json({ pins }) },
      PINGO_ADMIN_PASSWORD: 'test password', PINGO_SIGNING_SECRET: secret,
    };
    const denied = await worker.fetch(new Request('https://pingo.test/api/pingo/create', {
      body: JSON.stringify({ password: 'wrong password' }), method: 'POST',
    }), env);
    expect(denied.status).toBe(401);
    const game = createTimedGameCode(Date.now() - 1_000, 30);
    expect(game).toHaveLength(6);
    expect(verifiedGameStart(game)).toBeGreaterThan(Date.now() - 3_000);
    const admin = await worker.fetch(new Request('https://pingo.test/api/pingo/admin', {
      body: JSON.stringify({ at: Date.now(), game, password: 'test password', pin: 10 }),
      headers: { 'Content-Type': 'application/json' }, method: 'POST',
    }), env);
    expect(admin.status).toBe(200);
    const signed = await admin.json() as { pin: number; at: number; sig: string };
    const unsigned = await worker.fetch(new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=XY6D&pin=100`), env);
    expect(unsigned.status).toBe(403);
    const checked = await worker.fetch(new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=XY6D&pin=${signed.pin}&at=${signed.at}&sig=${signed.sig}`), env);
    expect(checked.status).toBe(200);
    expect((await checked.json() as { count: number }).count).toBe(10);
  });

  it.each([10, 15, 20, 30] as const)('counts a legacy %is game at its interval', async intervalSeconds => {
    const startMs = 1_704_067_200_000;
    const game = createTimedGameCode(startMs, intervalSeconds);
    const env = { ASSETS: { fetch: async () => Response.json({ pins }) },
      PINGO_ADMIN_PASSWORD: 'test password', PINGO_SIGNING_SECRET: secret };
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(startMs);
      now.mockReturnValue(startMs + intervalSeconds * 1_000 - 1);
      const before = await worker.fetch(new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=XY6D`), env);
      expect((await before.json() as { count: number }).count).toBe(1);
      now.mockReturnValue(startMs + intervalSeconds * 1_000);
      const after = await worker.fetch(new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=XY6D`), env);
      expect((await after.json() as { count: number; intervalMs: number })).toMatchObject({ count: 2, intervalMs: intervalSeconds * 1_000 });
    } finally {
      now.mockRestore(); 
    }
  });
});

describe('Pingo player API', () => {
  it('stores one registration per game and board, and requires the admin password to list it', async () => {
    const rows = new Map<string, Record<string, unknown>>();
    const database = {
      prepare: (_query: string) => ({ bind: (...values: unknown[]) => ({
        all: async () => ({ results: [...rows.values()] }),
        run: async () => {
          const [registrationId, boardId, gameCode, playerName, updatedAt, ipAddress] = values;
          rows.set(`${gameCode}:${registrationId}`, { boardId, gameCode, ipAddress, playerName, registrationId, updatedAt });
        },
      }) }),
    };
    const env = { ASSETS: { fetch: async () => Response.json({ pins }) },
      PINGO_ADMIN_PASSWORD: 'pinny', PINGO_PLAYERS: database, PINGO_SIGNING_SECRET: secret };
    const gameCode = createGameCode(Date.now());
    const registrationId = '0123456789abcdef0123456789abcdef';
    const put = (playerName: string) => worker.fetch(new Request('https://pingo.test/player', {
      body: JSON.stringify({ boardId: 'ACDE', gameCode, playerName, registrationId }),
      headers: { 'CF-Connecting-IP': '192.0.2.4', 'Content-Type': 'application/json' }, method: 'PUT',
    }), env);
    expect((await put('Alice')).status).toBe(200);
    expect((await put('Alice Smith')).status).toBe(200);
    expect(rows.size).toBe(1);
    expect(rows.get(`${gameCode}:${registrationId}`)).toMatchObject({ ipAddress: '192.0.2.4', playerName: 'Alice Smith' });
    expect(typeof rows.get(`${gameCode}:${registrationId}`)?.updatedAt).toBe('number');
    await worker.fetch(new Request('https://pingo.test/player', {
      body: JSON.stringify({ boardId: 'ACDE', gameCode, playerName: 'Bob', registrationId: 'fedcba9876543210fedcba9876543210' }),
      method: 'PUT',
    }), env);
    expect(rows.size).toBe(2);
    const denied = await worker.fetch(new Request('https://pingo.test/player'), env);
    expect(denied.status).toBe(401);
    const allowed = await worker.fetch(new Request('https://pingo.test/player', {
      headers: { Authorization: 'Bearer pinny' },
    }), env);
    expect(allowed.status).toBe(200);
    expect((await allowed.json() as { players: unknown[] }).players).toMatchObject([
      { boardId: 'ACDE', gameCode, playerName: 'Alice Smith' },
      { boardId: 'ACDE', gameCode, playerName: 'Bob' },
    ]);
    expect((await worker.fetch(new Request('https://pingo.test/player', {
      body: JSON.stringify({ boardId: 'ACDE', gameCode: 'invalid', playerName: 'Alice', registrationId }),
      method: 'PUT',
    }), env)).status).toBe(400);
  });
});
