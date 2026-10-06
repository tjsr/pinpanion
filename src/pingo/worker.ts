import { CODE_PATTERN, makeCode } from '../guess/game.ts';
import { boardPins, DRAW_BATCH_SIZE, DRAW_INTERVAL_SECONDS, scheduledCount, usablePinsFrom, winningLines } from './game.ts';
import {
  createTimedGameCode, drawIds, passwordMatches, pinCountSignatureIsValid,
  signPinCount, verifiedGameDetails, verifiedGameStart
} from './secure.ts';

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  PINGO_PLAYERS?: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        run(): Promise<unknown>;
        all(): Promise<{ results: Record<string, unknown>[] }>;
      };
    };
  };
  PINGO_ADMIN_PASSWORD?: string;
  PINGO_SIGNING_SECRET?: string;
}

type JsonObject = Record<string, unknown>;

function json(value: JsonObject, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function limitedJson(request: Request): Promise<JsonObject> {
  if (Number(request.headers.get('content-length') ?? 0) > 4096 || !request.body) {
    throw new Error('Request body is too large or missing.');
  }
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) throw new Error('Request body is too large.');
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JSON body.');
  return parsed as JsonObject;
}

async function pinsFor(env: Env) {
  const response = await env.ASSETS.fetch('https://assets.local/pins.json');
  if (!response.ok) throw new Error('Pin catalog is unavailable.');
  const feed = await response.json() as { pins?: unknown };
  const pins = usablePinsFrom(feed);
  if (pins.length < 25) throw new Error('Pin catalog has fewer than 25 usable pins.');
  return pins;
}

async function playerRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PINGO_PLAYERS) return json({ error: 'Player storage is not configured.' }, 503);
  if (request.method === 'GET') {
    const authorization = request.headers.get('Authorization') ?? '';
    if (!env.PINGO_ADMIN_PASSWORD ||
      !await passwordMatches(env.PINGO_ADMIN_PASSWORD, authorization.startsWith('Bearer ') ? authorization.slice(7) : '')) {
      return json({ error: 'Incorrect admin password.' }, 401);
    }
    const rows = await env.PINGO_PLAYERS.prepare(
      'SELECT registration_id AS registrationId, board_id AS boardId, game_code AS gameCode, player_name AS playerName, updated_at_ms AS updatedAt FROM players ORDER BY updated_at_ms DESC'
    ).bind().all();
    return json({ players: rows.results });
  }
  if (request.method !== 'PUT') return json({ error: 'GET or PUT required.' }, 405);
  let body: JsonObject;
  try { body = await limitedJson(request); }
  catch { return json({ error: 'Invalid request.' }, 400); }
  const boardId = body.boardId;
  const gameCode = body.gameCode;
  const registrationId = body.registrationId;
  const playerName = typeof body.playerName === 'string' ? body.playerName.trim() : '';
  if (typeof boardId !== 'string' || !CODE_PATTERN.test(boardId) ||
    typeof gameCode !== 'string' || verifiedGameStart(gameCode) === null ||
    verifiedGameStart(gameCode)! > Date.now() + 60_000 ||
    typeof registrationId !== 'string' || !/^[0-9a-f]{32}$/i.test(registrationId) ||
    !playerName || playerName.length > 80 || /[\x00-\x1f\x7f]/.test(playerName)) {
    return json({ error: 'Invalid player details.' }, 400);
  }
  const updatedAt = Date.now();
  const ipAddress = request.headers.get('CF-Connecting-IP') ?? '';
  await env.PINGO_PLAYERS.prepare(
    'INSERT INTO players (registration_id, board_id, game_code, player_name, updated_at_ms, ip_address) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (game_code, registration_id) DO UPDATE SET board_id = excluded.board_id, player_name = excluded.player_name, updated_at_ms = excluded.updated_at_ms, ip_address = excluded.ip_address'
  ).bind(registrationId, boardId, gameCode, playerName, updatedAt, ipAddress).run();
  return json({ boardId, gameCode, playerName, updatedAt });
}

export function localDayFor(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(timestamp));
  const part = (name: string) => parts.find(value => value.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

async function scavengerRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  if (!env.PINGO_PLAYERS) return json({ error: 'Scavenger storage is not configured.' }, 503);
  let body: JsonObject;
  try { body = await limitedJson(request); }
  catch { return json({ error: 'Invalid request.' }, 400); }
  const gameCode = body.gameCode;
  const deviceId = body.deviceId;
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const timeZone = body.timeZone;
  if (typeof gameCode !== 'string' || verifiedGameStart(gameCode) === null ||
    verifiedGameStart(gameCode)! > Date.now() + 60_000 ||
    typeof deviceId !== 'string' || !/^[0-9a-f]{32}$/i.test(deviceId) ||
    !nickname || nickname.length > 80 || /[\x00-\x1f\x7f]/.test(nickname) ||
    typeof timeZone !== 'string' || timeZone.length > 64) {
    return json({ error: 'Invalid scavenger details.' }, 400);
  }
  try { localDayFor(Date.now(), timeZone); }
  catch { return json({ error: 'Invalid time zone.' }, 400); }

  const database = env.PINGO_PLAYERS;
  await database.prepare(
    'INSERT OR IGNORE INTO scavenger_devices (game_code, device_id, time_zone) VALUES (?, ?, ?)'
  ).bind(gameCode, deviceId, timeZone).run();
  const devices = await database.prepare(
    'SELECT time_zone AS timeZone FROM scavenger_devices WHERE game_code = ? AND device_id = ?'
  ).bind(gameCode, deviceId).all();
  const savedTimeZone = devices.results[0]?.timeZone;
  if (typeof savedTimeZone !== 'string') throw new Error('Scavenger device was not saved.');
  const now = Date.now();
  const localDay = localDayFor(now, savedTimeZone);
  const existing = await database.prepare(
    'SELECT board_id AS boardId, nickname, created_at_ms AS createdAt FROM scavenger_assignments WHERE game_code = ? AND device_id = ? AND local_day = ?'
  ).bind(gameCode, deviceId, localDay).all();
  if (existing.results.length) return json({ gameCode, localDay, ...existing.results[0], existing: true });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const boardId = makeCode();
    const inserted = await database.prepare(
      'INSERT OR IGNORE INTO scavenger_assignments (game_code, device_id, local_day, board_id, nickname, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(gameCode, deviceId, localDay, boardId, nickname, now).run() as { meta?: { changes?: number } };
    const assigned = await database.prepare(
      'SELECT board_id AS boardId, nickname, created_at_ms AS createdAt FROM scavenger_assignments WHERE game_code = ? AND device_id = ? AND local_day = ?'
    ).bind(gameCode, deviceId, localDay).all();
    if (assigned.results.length) return json({ gameCode, localDay, ...assigned.results[0], existing: inserted.meta?.changes !== 1 });
  }
  throw new Error('No available scavenger board code was found.');
}

async function adminRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  let body: JsonObject;
  try { body = await limitedJson(request); }
  catch { return json({ error: 'Invalid request.' }, 400); }
  if (typeof body.password !== 'string' ||
    !await passwordMatches(env.PINGO_ADMIN_PASSWORD!, body.password)) {
    return json({ error: 'Incorrect admin password.' }, 401);
  }
  const url = new URL(request.url);
  if (url.pathname === '/api/pingo/create') {
    const intervalSeconds = body.intervalSeconds ?? 30;
    if (typeof intervalSeconds !== 'number' ||
      !DRAW_INTERVAL_SECONDS.some(value => value === intervalSeconds)) {
      return json({ error: 'Invalid draw interval.' }, 400);
    }
    return json({ game: createTimedGameCode(Date.now(), intervalSeconds as 10 | 15 | 20 | 30) });
  }
  if (typeof body.game !== 'string') return json({ error: 'Invalid game code.' }, 400);
  const details = verifiedGameDetails(body.game);
  if (!details || details.startMs > Date.now() + 60_000) return json({ error: 'Invalid game code.' }, 400);
  const { startMs, intervalMs } = details;
  const pins = await pinsFor(env);
  const clockCount = scheduledCount(startMs, Date.now(), intervalMs);
  const requested = body.pin === undefined ? clockCount : body.pin;
  const at = body.at === undefined ? startMs + (clockCount - 1) * intervalMs : body.at;
  if (typeof requested !== 'number' || !Number.isSafeInteger(requested) || requested < 0 ||
    typeof at !== 'number' || !Number.isSafeInteger(at) || at < 0) return json({ error: 'Invalid pin count.' }, 400);
  const count = Math.min(requested, pins.length);
  const limit = Math.min(pins.length,
    Math.max(DRAW_BATCH_SIZE, Math.ceil((count + 1) / DRAW_BATCH_SIZE) * DRAW_BATCH_SIZE));
  const ids = await drawIds(env.PINGO_SIGNING_SECRET!, startMs, pins.map(pin => pin.id), limit);
  const sig = await signPinCount(env.PINGO_SIGNING_SECRET!, body.game, count, at);
  return json({ game: body.game, startMs, intervalMs, pin: count, at, sig, ids });
}

async function verifyRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'GET required.' }, 405);
  const url = new URL(request.url);
  const game = url.searchParams.get('game') ?? '';
  const board = url.searchParams.get('board') ?? '';
  const details = verifiedGameDetails(game);
  if (!details || details.startMs > Date.now() + 60_000 || !CODE_PATTERN.test(board)) {
    return json({ error: 'Invalid game or board code.' }, 400);
  }
  const { startMs, intervalMs } = details;
  let count = scheduledCount(startMs, Date.now(), intervalMs);
  if (url.searchParams.has('pin') || url.searchParams.has('at') || url.searchParams.has('sig')) {
    const pin = Number(url.searchParams.get('pin'));
    const at = Number(url.searchParams.get('at'));
    const sig = url.searchParams.get('sig') ?? '';
    if (!url.searchParams.has('pin') || !url.searchParams.has('at') ||
      !Number.isSafeInteger(pin) || pin < 0 || !Number.isSafeInteger(at) || at < 0 ||
      (pin > 0 && at < startMs) ||
      !await pinCountSignatureIsValid(env.PINGO_SIGNING_SECRET!, game, pin, at, sig)) {
      return json({ error: 'Invalid pin override signature.' }, 403);
    }
    count = pin;
  }
  const pins = await pinsFor(env);
  count = Math.min(count, pins.length);
  const ids = await drawIds(env.PINGO_SIGNING_SECRET!, startMs, pins.map(pin => pin.id), count);
  const boardIds = boardPins(board, pins).map(pin => pin.id);
  const called = new Set(ids);
  return json({
    game, board, count, intervalMs,
    matchedIds: boardIds.filter(id => called.has(id)),
    winningLines: winningLines(boardIds, called),
    checkedAt: Date.now()
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/player' || url.pathname.startsWith('/api/pingo/')) {
      if (url.pathname === '/player') {
        try { return await playerRequest(request, env); }
        catch (error) {
          console.error(JSON.stringify({ event: 'pingo_player_error', message: error instanceof Error ? error.message : 'Unknown error' }));
          return json({ error: 'Player request failed.' }, 500);
        }
      }
      if (!env.PINGO_ADMIN_PASSWORD || !env.PINGO_SIGNING_SECRET) {
        return json({ error: 'Pingo is not configured.' }, 503);
      }
      try {
        if (url.pathname === '/api/pingo/scavenger') return await scavengerRequest(request, env);
        if (url.pathname === '/api/pingo/create' || url.pathname === '/api/pingo/admin') {
          return await adminRequest(request, env);
        }
        if (url.pathname === '/api/pingo/verify') return await verifyRequest(request, env);
        return json({ error: 'Unknown endpoint.' }, 404);
      } catch (error) {
        console.error(JSON.stringify({ event: 'pingo_api_error', path: url.pathname,
          message: error instanceof Error ? error.message : 'Unknown error' }));
        return json({ error: 'Pingo request failed.' }, 500);
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed.', { status: 405 });
    if (url.pathname === '/pins.json' || url.pathname.startsWith('/assets/')) return env.ASSETS.fetch(request);
    return env.ASSETS.fetch(new Request(new URL('/shell', request.url), request));
  }
};
