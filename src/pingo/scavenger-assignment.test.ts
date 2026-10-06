import { describe, expect, it, vi } from 'vitest';
import { createGameCode } from './secure.ts';
import worker, { localDayFor } from './worker.ts';

type Assignment = { boardId: string; nickname: string; createdAt: number };

function memoryDatabase() {
  const devices = new Map<string, string>();
  const assignments = new Map<string, Assignment>();
  const boards = new Set<string>();
  return {
    assignments,
    prepare: (query: string) => ({ bind: (...values: unknown[]) => ({
      run: async () => {
        if (query.includes('INTO scavenger_devices')) {
          const [game, device, zone] = values as string[];
          const key = `${game}:${device}`;
          if (!devices.has(key)) devices.set(key, zone);
          return { meta: { changes: devices.get(key) === zone ? 1 : 0 } };
        }
        if (query.includes('INTO scavenger_assignments')) {
          const [game, device, day, boardId, nickname, createdAt] = values as
            [string, string, string, string, string, number];
          const key = `${game}:${device}:${day}`;
          if (assignments.has(key) || boards.has(boardId)) return { meta: { changes: 0 } };
          assignments.set(key, { boardId, nickname, createdAt });
          boards.add(boardId);
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected query: ${query}`);
      },
      all: async () => {
        if (query.includes('FROM scavenger_devices')) {
          const [game, device] = values as string[];
          const timeZone = devices.get(`${game}:${device}`);
          return { results: timeZone ? [{ timeZone }] : [] };
        }
        if (query.includes('FROM scavenger_assignments')) {
          const [game, device, day] = values as string[];
          const assignment = assignments.get(`${game}:${device}:${day}`);
          return { results: assignment ? [assignment] : [] };
        }
        throw new Error(`Unexpected query: ${query}`);
      }
    }) })
  };
}

describe('scavenger assignment', () => {
  it('calculates the day at local midnight, including daylight saving time', () => {
    expect(localDayFor(Date.UTC(2026, 0, 1, 12, 59), 'Australia/Sydney')).toBe('2026-01-01');
    expect(localDayFor(Date.UTC(2026, 0, 1, 13, 0), 'Australia/Sydney')).toBe('2026-01-02');
    expect(localDayFor(Date.UTC(2026, 6, 1, 13, 59), 'Australia/Sydney')).toBe('2026-07-01');
    expect(localDayFor(Date.UTC(2026, 6, 1, 14, 0), 'Australia/Sydney')).toBe('2026-07-02');
  });

  it('returns the same board once per local day and keeps the first time zone and nickname', async () => {
    const now = vi.spyOn(Date, 'now');
    const beforeMidnight = Date.UTC(2026, 9, 5, 12, 59);
    const gameCode = createGameCode(beforeMidnight - 60_000);
    const deviceId = '0123456789abcdef0123456789abcdef';
    const database = memoryDatabase();
    const env = { PINGO_PLAYERS: database, PINGO_ADMIN_PASSWORD: 'pinny',
      PINGO_SIGNING_SECRET: 'test signing secret',
      ASSETS: { fetch: async () => Response.json({ pins: [] }) } };
    const assign = async (nickname: string, timeZone = 'Australia/Sydney', id = deviceId) => {
      const response = await worker.fetch(new Request('https://pingo.test/api/pingo/scavenger', {
        method: 'POST', body: JSON.stringify({ gameCode, deviceId: id, nickname, timeZone })
      }), env);
      expect(response.status).toBe(200);
      return response.json() as Promise<{ boardId: string; nickname: string; localDay: string; existing: boolean }>;
    };
    try {
      now.mockReturnValue(beforeMidnight);
      const first = await assign('Alice');
      expect(first).toMatchObject({ nickname: 'Alice', localDay: '2026-10-05', existing: false });
      const repeat = await assign('Changed name', 'Pacific/Honolulu');
      expect(repeat).toMatchObject({ boardId: first.boardId, nickname: 'Alice', existing: true });
      expect(database.assignments.size).toBe(1);
      now.mockReturnValue(Date.UTC(2026, 9, 5, 13, 0));
      const nextDay = await assign('Alice', 'Pacific/Honolulu');
      expect(nextDay).toMatchObject({ localDay: '2026-10-06', existing: false });
      expect(nextDay.boardId).not.toBe(first.boardId);
      expect(database.assignments.size).toBe(2);
      const otherDevice = await assign('Bob', 'Australia/Sydney', 'abcdef0123456789abcdef0123456789');
      expect(otherDevice.boardId).not.toBe(nextDay.boardId);
      expect(database.assignments.size).toBe(3);
    } finally { now.mockRestore(); }
  });

  it('requires a nickname and a valid time zone', async () => {
    const gameCode = createGameCode(Date.now() - 60_000);
    const env = { PINGO_PLAYERS: memoryDatabase(), PINGO_ADMIN_PASSWORD: 'pinny',
      PINGO_SIGNING_SECRET: 'test signing secret',
      ASSETS: { fetch: async () => Response.json({ pins: [] }) } };
    const request = (nickname: string, timeZone: string) => worker.fetch(new Request('https://pingo.test/api/pingo/scavenger', {
      method: 'POST', body: JSON.stringify({ gameCode,
        deviceId: '0123456789abcdef0123456789abcdef', nickname, timeZone })
    }), env);
    expect((await request('', 'Australia/Sydney')).status).toBe(400);
    expect((await request('Alice', 'Not/AZone')).status).toBe(400);
  });
});
