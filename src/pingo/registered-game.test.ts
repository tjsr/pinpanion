import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Pin } from '../types.ts';
import { boardCodeForGame, boardPins, gameCodeWithSettings, gameDetailsFromCode, isBoardCodeForGame,
  settingsCode, settingsFromCode } from './game.ts';
import { drawIdsFromBatchKeys, gamePasswordHash, hashGamePassword, signPinCount } from './secure.ts';
import worker from './worker.ts';

beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true }); });

const pins = Array.from({ length: 200 }, (_, id) =>
  ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];

function database() {
  const games = new Map<string, Record<string, unknown>>();
  const successors = new Map<string, string>();
  const boards = new Map<string, string>();
  const devices = new Map<string, string>();
  const hunts = new Map<string, Record<string, unknown>>();
  const players = new Map<string, Record<string, unknown>>();
  return {
    games, successors, boards, hunts,
    prepare: (query: string) => ({ bind: (...values: unknown[]) => ({
      run: async () => {
        if (query.startsWith('INSERT OR IGNORE INTO games')) {
          const [gameCode, startMs, intervalMs, poolSize, passwordSalt, passwordHash, createdAt] = values;
          if (games.has(String(gameCode))) return { meta: { changes: 0 } };
          games.set(String(gameCode), { gameCode, startMs, intervalMs, poolSize,
            passwordSalt, passwordHash, createdAt });
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('UPDATE games SET password_hash')) {
          const [verifier, gameCode, oldHash] = values;
          const saved = games.get(String(gameCode));
          if (!saved || saved.passwordHash !== oldHash) return { meta: { changes: 0 } };
          saved.passwordHash = verifier;
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('INSERT OR IGNORE INTO game_successors')) {
          const [game, successor] = values.map(String);
          if (successors.has(game) || [...successors.values()].includes(successor)) {
            return { meta: { changes: 0 } };
          }
          successors.set(game, successor);
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('INSERT OR IGNORE INTO game_boards')) {
          const [game, board] = values;
          if (boards.has(String(board))) return { meta: { changes: 0 } };
          boards.set(String(board), String(game));
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('INSERT OR IGNORE INTO scavenger_devices')) {
          const [game, device, zone] = values;
          const key = `${game}:${device}`;
          if (devices.has(key)) return { meta: { changes: 0 } };
          devices.set(key, String(zone));
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('INSERT OR IGNORE INTO scavenger_assignments')) {
          const [game, device, day, boardId, nickname, createdAt] = values;
          const key = `${game}:${device}:${day}`;
          if (hunts.has(key) || [...hunts.values()].some(row => row.boardId === boardId)) {
            return { meta: { changes: 0 } };
          }
          hunts.set(key, { boardId, nickname, createdAt, gameCode: game });
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('INSERT INTO players')) {
          const [registrationId, boardId, gameCode, playerName, updatedAt] = values;
          players.set(`${gameCode}:${registrationId}`, { registrationId, boardId,
            gameCode, playerName, updatedAt });
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected SQL: ${query}`);
      },
      all: async () => {
        if (query.includes('FROM game_successors')) {
          const successorGameCode = successors.get(String(values[0]));
          return { results: successorGameCode ? [{ successorGameCode }] : [] };
        }
        if (query.includes('FROM games WHERE')) {
          const found = games.get(String(values[0]));
          return { results: found ? [found] : [] };
        }
        if (query.includes('FROM games ORDER BY')) {
          return { results: [...games.values()] };
        }
        if (query.includes('FROM game_boards')) {
          const [game, board] = values;
          const assigned = [...hunts.values()].some(row => row.gameCode === game && row.boardId === board);
          return { results: boards.get(String(board)) === game || assigned ? [{ board_code: board }] : [] };
        }
        if (query.includes('FROM scavenger_devices')) {
          const zone = devices.get(`${values[0]}:${values[1]}`);
          return { results: zone ? [{ timeZone: zone }] : [] };
        }
        if (query.includes('FROM scavenger_assignments')) {
          const row = hunts.get(`${values[0]}:${values[1]}:${values[2]}`);
          return { results: row ? [row] : [] };
        }
        if (query.includes('FROM players')) {
          return { results: [...players.values()].filter(row => !values.length || row.gameCode === values[0]) };
        }
        throw new Error(`Unexpected SQL: ${query}`);
      }
    }) })
  };
}

describe('registered games and bounded pin pools', () => {
  it.each([10, 15, 20, 30] as const)('round trips %is and 25-pin increments in YYY', speed => {
    for (const pool of [25, 50, 150, 200]) {
      expect(settingsFromCode(settingsCode(speed, pool))).toEqual({
        intervalMs: speed * 1_000, poolSize: pool
      });
    }
    expect(() => settingsCode(speed, 151)).toThrow();
    expect(gameDetailsFromCode(gameCodeWithSettings(Math.floor(Date.now() / 1_000), speed)).poolSize).toBe(150);
  });

  it('registers a game, authenticates its admin, and keeps boards and calls inside the first N pins', async () => {
    const db = database();
    const env = { PINGO_PLAYERS: db, PINGO_ADMIN_PASSWORD: 'site-secret',
      PINGO_SIGNING_SECRET: 'test-signing-secret',
      ASSETS: { fetch: async () => Response.json({ pins }) } };
    const request = (path: string, body: Record<string, unknown>) => worker.fetch(new Request(`https://pingo.test${path}`, {
      method: 'POST', body: JSON.stringify(body)
    }), env);
    const { salt, hash } = await hashGamePassword('game-secret');
    const rejected = await request('/api/pingo/create', { password: 'wrong',
      passwordSalt: salt, passwordHash: hash, intervalSeconds: 15, poolSize: 50 });
    expect(rejected.status).toBe(401);
    const created = await request('/api/pingo/create', { password: 'site-secret',
      passwordSalt: salt, passwordHash: hash, intervalSeconds: 15, poolSize: 50 });
    expect(created.status).toBe(201);
    const { game } = await created.json() as { game: string };
    expect(game).toMatch(/^[234679ACDEFGHJKLMNPQRTUVWXYZ]{6}-[234679ACDEFGHJKLMNPQRTUVWXYZ]{3}$/);
    expect(gameDetailsFromCode(game)).toMatchObject({ intervalMs: 15_000, poolSize: 50 });
    expect(db.games.get(game)?.passwordHash).toMatch(/^v2:[0-9a-f]{64}$/);
    expect(String(db.games.get(game)?.passwordSalt)).toMatch(/^[0-9a-f]{32}$/);
    db.games.get(game)!.passwordHash = hash;
    const gameSalt = await worker.fetch(new Request(`https://pingo.test/api/pingo/salt?game=${game}`), env);
    expect(await gameSalt.json()).toEqual({ salt });
    expect(db.games.get(game)?.passwordHash).toMatch(/^v2:[0-9a-f]{64}$/);
    expect(await gamePasswordHash('game-secret', salt)).toBe(hash);

    const listing = await worker.fetch(new Request('https://pingo.test/api/pingo/games'), env);
    expect((await listing.json() as { games: unknown[] }).games).toMatchObject([
      { gameCode: game, intervalMs: 15_000, poolSize: 50 }
    ]);
    const wrongAdmin = await request('/api/pingo/admin', { game, passwordProof: 'site-secret' });
    expect(wrongAdmin.status).toBe(401);
    const admin = await request('/api/pingo/admin', { game, passwordProof: hash, pin: 50 });
    expect(admin.status).toBe(200);
    const calls = await admin.json() as { ids: number[]; drawKeys: string[];
      signingKey: string; poolSize: number; pin: number };
    expect(calls.poolSize).toBe(50);
    expect(calls.ids).toHaveLength(50);
    expect(calls.ids.every(id => id < 50)).toBe(true);
    expect(calls.signingKey).toMatch(/^[0-9a-f]{64}$/);
    expect(await drawIdsFromBatchKeys(calls.drawKeys,
      pins.slice(0, 50).map(pin => pin.id), 50)).toEqual(calls.ids);

    const issued = await request('/api/pingo/board', { game });
    expect(issued.status).toBe(201);
    const { board } = await issued.json() as { board: string };
    expect(isBoardCodeForGame(board, game)).toBe(true);
    expect(board.slice(5)).toBe(game.slice(7));
    expect(boardPins(board, pins).every(pin => pin.id < 50)).toBe(true);
    const known = await worker.fetch(new Request(`https://pingo.test/api/pingo/board?game=${game}&board=${board}`), env);
    expect(known.status).toBe(200);
    const unissued = boardCodeForGame('ACDE', game);
    if (unissued !== board) {
      const unknown = await worker.fetch(new Request(`https://pingo.test/api/pingo/board?game=${game}&board=${unissued}`), env);
      expect(unknown.status).toBe(404);
      const rejectedCheck = await worker.fetch(new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=${unissued}`), env);
      expect(rejectedCheck.status).toBe(404);
    }
    const verify = await worker.fetch(new Request(`https://pingo.test/api/pingo/verify?game=${game}&board=${board}`), env);
    expect(verify.status).toBe(200);
    expect((await verify.json() as { matchedIds: number[] }).matchedIds.every(id => id < 50)).toBe(true);
    const localAt = Date.now();
    const localSig = await signPinCount(calls.signingKey, game, 2, localAt);
    const localVerify = await worker.fetch(new Request(
      `https://pingo.test/api/pingo/verify?${new URLSearchParams({ game, board,
        pin: '2', at: String(localAt), sig: localSig })}`), env);
    expect(localVerify.status).toBe(200);
    expect((await localVerify.json() as { count: number }).count).toBe(2);
    const registrationId = '0123456789abcdef0123456789abcdef';
    const player = await worker.fetch(new Request('https://pingo.test/player', {
      method: 'PUT', body: JSON.stringify({ boardId: board, gameCode: game,
        registrationId, playerName: 'Alice' })
    }), env);
    expect(player.status).toBe(200);
    const playerList = await worker.fetch(new Request(`https://pingo.test/player?game=${game}`, {
      headers: { Authorization: `Bearer ${hash}` }
    }), env);
    expect((await playerList.json() as { players: unknown[] }).players).toMatchObject([
      { boardId: board, gameCode: game, playerName: 'Alice' }
    ]);
    const deniedPlayers = await worker.fetch(new Request(`https://pingo.test/player?game=${game}`, {
      headers: { Authorization: 'Bearer wrong-password' }
    }), env);
    expect(deniedPlayers.status).toBe(401);
  });

  it('starts exactly one successor after five draw intervals with the same settings and password', async () => {
    const db = database();
    const env = { PINGO_PLAYERS: db, PINGO_ADMIN_PASSWORD: 'site-secret',
      PINGO_SIGNING_SECRET: 'test-signing-secret',
      ASSETS: { fetch: async () => Response.json({ pins }) } };
    const request = (path: string, body: Record<string, unknown>) => worker.fetch(new Request(`https://pingo.test${path}`, {
      method: 'POST', body: JSON.stringify(body)
    }), env);
    const now = vi.spyOn(Date, 'now');
    try {
      const start = Date.now();
      now.mockReturnValue(start);
      const { salt, hash } = await hashGamePassword('game-secret');
      const created = await request('/api/pingo/create', { password: 'site-secret',
        passwordSalt: salt, passwordHash: hash, intervalSeconds: 15, poolSize: 50 });
      const { game } = await created.json() as { game: string };
      const final = await request('/api/pingo/admin', { game, passwordProof: hash,
        pin: 50, at: Math.floor(start / 1_000) * 1_000 });
      const call = await final.json() as { pin: number; at: number; sig: string; signingKey: string };
      const localSig = await signPinCount(call.signingKey, game, call.pin, call.at);
      const rollover = { game, passwordProof: hash, pin: call.pin, at: call.at, sig: localSig };
      expect((await request('/api/pingo/rollover', rollover)).status).toBe(409);
      now.mockReturnValue(call.at + 75_000);
      expect((await request('/api/pingo/rollover', { ...rollover, sig: 'invalid' })).status).toBe(403);
      expect((await request('/api/pingo/rollover', { ...rollover, passwordProof: 'wrong' })).status).toBe(401);
      const first = await request('/api/pingo/rollover', rollover);
      const second = await request('/api/pingo/rollover', rollover);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const { game: nextGame } = await first.json() as { game: string };
      expect((await second.json() as { game: string }).game).toBe(nextGame);
      expect(nextGame).not.toBe(game);
      expect(gameDetailsFromCode(nextGame)).toMatchObject({ intervalMs: 15_000, poolSize: 50 });
      expect(db.games.size).toBe(2);
      expect(db.successors.get(game)).toBe(nextGame);
      expect(db.games.get(nextGame)).toMatchObject({ passwordSalt: salt,
        passwordHash: db.games.get(game)?.passwordHash });
      const successorAdmin = await request('/api/pingo/admin', { game: nextGame, passwordProof: hash });
      expect(successorAdmin.status).toBe(200);
    } finally { now.mockRestore(); }
  });

  it('gives a scavenger the same suffixed board on repeat', async () => {
    const db = database();
    const env = { PINGO_PLAYERS: db, PINGO_ADMIN_PASSWORD: 'site-secret',
      PINGO_SIGNING_SECRET: 'test-signing-secret',
      ASSETS: { fetch: async () => Response.json({ pins }) } };
    const { salt, hash } = await hashGamePassword('game-secret');
    const now = vi.spyOn(Date, 'now');
    try {
      const start = Date.now();
      now.mockReturnValue(start);
      const create = await worker.fetch(new Request('https://pingo.test/api/pingo/create', {
        method: 'POST', body: JSON.stringify({ password: 'site-secret', passwordSalt: salt, passwordHash: hash,
          intervalSeconds: 30, poolSize: 150 })
      }), env);
      const { game } = await create.json() as { game: string };
      const join = () => worker.fetch(new Request('https://pingo.test/api/pingo/scavenger', {
        method: 'POST', body: JSON.stringify({ gameCode: game,
          deviceId: '0123456789abcdef0123456789abcdef', nickname: 'Alice', timeZone: 'Australia/Sydney' })
      }), env);
      const first = await join();
      const second = await join();
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const assigned = await first.json() as { boardId: string; existing: boolean };
      expect(assigned.existing).toBe(false);
      expect(isBoardCodeForGame(assigned.boardId, game)).toBe(true);
      expect(await second.json()).toMatchObject({ boardId: assigned.boardId, existing: true });
      expect(db.hunts.size).toBe(1);
    } finally { now.mockRestore(); }
  });
});
