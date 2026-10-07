import { BOARD_SIZE, DEFAULT_POOL_SIZE, DRAW_BATCH_SIZE, DRAW_INTERVAL_SECONDS,
  boardCodeForGame, boardPins, isBoardCodeForGame, isNewGameCode, scheduledCount,
  usablePinsFrom, winningLines } from './game.ts';
import {
  callerPinSignatureIsValid, callerSigningKey, createRegisteredGameCode,
  drawBatchKeys, drawIds, drawIdsFromBatchKeys, gamePasswordProofMatches, gamePasswordVerifier,
  passwordMatches,
  signPinCount, verifiedGameDetails
} from './secure.ts';
import { makeCode } from '../guess/game.ts';

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
  return Response.json(value, { headers: { 'Cache-Control': 'no-store' }, status });
}

async function limitedJson(request: Request): Promise<JsonObject> {
  if (Number(request.headers.get('content-length') ?? 0) > 4096 || !request.body) {
    throw new Error('Request body is too large or missing.');
  }
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
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
  for (const part of parts) {
    bytes.set(part, offset); offset += part.length; 
  }
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

type GameRecord = {
  gameCode: string; startMs: number; intervalMs: number; poolSize: number;
  passwordSalt: string; passwordHash: string; createdAt: number;
};

async function registeredGame(env: Env, code: string): Promise<GameRecord | null> {
  if (!env.PINGO_PLAYERS || !isNewGameCode(code)) return null;
  const rows = await env.PINGO_PLAYERS.prepare(
    'SELECT game_code AS gameCode, start_ms AS startMs, interval_ms AS intervalMs, pool_size AS poolSize, password_salt AS passwordSalt, password_hash AS passwordHash, created_at_ms AS createdAt FROM games WHERE game_code = ?'
  ).bind(code).all();
  const saved = rows.results[0] as GameRecord | undefined;
  if (!saved) return null;
  if (/^[0-9a-f]{64}$/i.test(saved.passwordHash) && env.PINGO_SIGNING_SECRET) {
    const verifier = await gamePasswordVerifier(env.PINGO_SIGNING_SECRET, saved.passwordHash);
    await env.PINGO_PLAYERS.prepare(
      'UPDATE games SET password_hash = ? WHERE game_code = ? AND password_hash = ?'
    ).bind(verifier, code, saved.passwordHash).run();
    saved.passwordHash = verifier;
  }
  return saved;
}

async function gameDetailsFor(env: Env, code: string): Promise<{ intervalMs: number; startMs: number; poolSize?: number } | null> {
  const decoded = verifiedGameDetails(code);
  if (!decoded || decoded.startMs > Date.now() + 60_000) return null;
  if (!isNewGameCode(code)) return decoded;
  const saved = await registeredGame(env, code);
  if (!saved || saved.startMs !== decoded.startMs || saved.intervalMs !== decoded.intervalMs ||
    saved.poolSize !== decoded.poolSize) return null;
  return { intervalMs: saved.intervalMs, poolSize: saved.poolSize, startMs: saved.startMs };
}

async function boardExists(env: Env, game: string, board: string): Promise<boolean> {
  if (!isBoardCodeForGame(board, game)) return false;
  if (!isNewGameCode(game)) return true;
  if (!env.PINGO_PLAYERS) return false;
  const rows = await env.PINGO_PLAYERS.prepare(
    'SELECT board_code FROM game_boards WHERE game_code = ? AND board_code = ? UNION SELECT board_id FROM scavenger_assignments WHERE game_code = ? AND board_id = ? LIMIT 1'
  ).bind(game, board, game, board).all();
  return rows.results.length > 0;
}

async function adminPasswordMatches(env: Env, game: string, credential: string): Promise<boolean> {
  if (isNewGameCode(game)) {
    const saved = await registeredGame(env, game);
    return !!saved && !!env.PINGO_SIGNING_SECRET &&
      await gamePasswordProofMatches(credential, saved.passwordHash, env.PINGO_SIGNING_SECRET);
  }
  return !!env.PINGO_ADMIN_PASSWORD && await passwordMatches(env.PINGO_ADMIN_PASSWORD, credential);
}

async function playerRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PINGO_PLAYERS) return json({ error: 'Player storage is not configured.' }, 503);
  if (request.method === 'GET') {
    const authorization = request.headers.get('Authorization') ?? '';
    const game = new URL(request.url).searchParams.get('game');
    const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!supplied || !(game ? await adminPasswordMatches(env, game, supplied)
      : (env.PINGO_ADMIN_PASSWORD && await passwordMatches(env.PINGO_ADMIN_PASSWORD, supplied)))) {
      return json({ error: 'Incorrect admin password.' }, 401);
    }
    const rows = await env.PINGO_PLAYERS.prepare(
      `SELECT registration_id AS registrationId, board_id AS boardId, game_code AS gameCode, player_name AS playerName, updated_at_ms AS updatedAt FROM players ${game ? 'WHERE game_code = ? ' : ''}ORDER BY updated_at_ms DESC`
    ).bind(...(game ? [game] : [])).all();
    return json({ players: rows.results });
  }
  if (request.method !== 'PUT') return json({ error: 'GET or PUT required.' }, 405);
  let body: JsonObject;
  try {
    body = await limitedJson(request); 
  } catch {
    return json({ error: 'Invalid request.' }, 400); 
  }
  const boardId = body.boardId;
  const gameCode = body.gameCode;
  const registrationId = body.registrationId;
  const playerName = typeof body.playerName === 'string' ? body.playerName.trim() : '';
  if (typeof boardId !== 'string' || typeof gameCode !== 'string' ||
    !await gameDetailsFor(env, gameCode) || !await boardExists(env, gameCode, boardId) ||
    typeof registrationId !== 'string' || !/^[0-9a-f]{32}$/i.test(registrationId) ||
    !playerName || playerName.length > 80 || /\p{Cc}/u.test(playerName)) {
    return json({ error: 'Invalid player details.' }, 400);
  }
  const updatedAt = Date.now();
  const ipAddress = request.headers.get('CF-Connecting-IP') ?? '';
  await env.PINGO_PLAYERS.prepare(
    'INSERT INTO players (registration_id, board_id, game_code, player_name, updated_at_ms, ip_address) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (game_code, registration_id) DO UPDATE SET board_id = excluded.board_id, player_name = excluded.player_name, updated_at_ms = excluded.updated_at_ms, ip_address = excluded.ip_address'
  ).bind(registrationId, boardId, gameCode, playerName, updatedAt, ipAddress).run();
  return json({ boardId, gameCode, playerName, updatedAt });
}

async function gamesRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'GET required.' }, 405);
  if (!env.PINGO_PLAYERS) return json({ error: 'Game storage is not configured.' }, 503);
  const rows = await env.PINGO_PLAYERS.prepare(
    'SELECT game_code AS gameCode, start_ms AS startMs, interval_ms AS intervalMs, pool_size AS poolSize FROM games ORDER BY created_at_ms DESC'
  ).bind().all();
  return json({ games: rows.results });
}

async function gameSaltRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'GET required.' }, 405);
  const game = new URL(request.url).searchParams.get('game') ?? '';
  const saved = await registeredGame(env, game);
  return saved ? json({ salt: saved.passwordSalt }) : json({ error: 'Game is not registered.' }, 404);
}

async function boardRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PINGO_PLAYERS) return json({ error: 'Board storage is not configured.' }, 503);
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const game = url.searchParams.get('game') ?? '';
    const board = url.searchParams.get('board') ?? '';
    if (!await gameDetailsFor(env, game) || !await boardExists(env, game, board)) {
      return json({ error: 'Board is not registered for this game.' }, 404);
    }
    return json({ board, game });
  }
  if (request.method !== 'POST') return json({ error: 'GET or POST required.' }, 405);
  let body: JsonObject;
  try {
    body = await limitedJson(request); 
  } catch {
    return json({ error: 'Invalid request.' }, 400); 
  }
  const game = body.game;
  if (typeof game !== 'string' || !isNewGameCode(game)) return json({ error: 'A registered game is required.' }, 400);
  const details = await gameDetailsFor(env, game);
  if (!details || !details.poolSize) return json({ error: 'Game is not registered.' }, 404);
  if ((await pinsFor(env)).length < details.poolSize) return json({ error: 'The game pin pool is unavailable.' }, 503);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const board = boardCodeForGame(makeCode(), game);
    const inserted = await env.PINGO_PLAYERS.prepare(
      'INSERT OR IGNORE INTO game_boards (game_code, board_code, created_at_ms) VALUES (?, ?, ?)'
    ).bind(game, board, Date.now()).run() as { meta?: { changes?: number } };
    if (inserted.meta?.changes === 1) return json({ board, game }, 201);
  }
  throw new Error('No available board code was found.');
}

export function localDayFor(timestamp: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit', month: '2-digit', timeZone, year: 'numeric',
  }).formatToParts(new Date(timestamp));
  const part = (name: string) => parts.find(value => value.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

async function scavengerRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  if (!env.PINGO_PLAYERS) return json({ error: 'Scavenger storage is not configured.' }, 503);
  let body: JsonObject;
  try {
    body = await limitedJson(request); 
  } catch {
    return json({ error: 'Invalid request.' }, 400); 
  }
  const gameCode = body.gameCode;
  const deviceId = body.deviceId;
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const timeZone = body.timeZone;
  if (typeof gameCode !== 'string' || !await gameDetailsFor(env, gameCode) ||
    typeof deviceId !== 'string' || !/^[0-9a-f]{32}$/i.test(deviceId) ||
    !nickname || nickname.length > 80 || /\p{Cc}/u.test(nickname) ||
    typeof timeZone !== 'string' || timeZone.length > 64) {
    return json({ error: 'Invalid scavenger details.' }, 400);
  }
  try {
    localDayFor(Date.now(), timeZone); 
  } catch {
    return json({ error: 'Invalid time zone.' }, 400); 
  }

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
    const boardId = isNewGameCode(gameCode) ? boardCodeForGame(makeCode(), gameCode) : makeCode();
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
  try {
    body = await limitedJson(request); 
  } catch {
    return json({ error: 'Invalid request.' }, 400); 
  }
  const url = new URL(request.url);
  if (url.pathname === '/api/pingo/create') {
    if (typeof body.password !== 'string' ||
      !await passwordMatches(env.PINGO_ADMIN_PASSWORD!, body.password)) {
      return json({ error: 'Incorrect site admin password.' }, 401);
    }
    if (!env.PINGO_PLAYERS) return json({ error: 'Game storage is not configured.' }, 503);
    const intervalSeconds = body.intervalSeconds ?? 30;
    const poolSize = body.poolSize ?? DEFAULT_POOL_SIZE;
    const passwordSalt = body.passwordSalt;
    const passwordHash = body.passwordHash;
    if (typeof intervalSeconds !== 'number' ||
      !DRAW_INTERVAL_SECONDS.some(value => value === intervalSeconds) ||
      typeof poolSize !== 'number' || !Number.isSafeInteger(poolSize) ||
      poolSize < BOARD_SIZE || poolSize % BOARD_SIZE !== 0 ||
      typeof passwordSalt !== 'string' || !/^[0-9a-f]{32}$/i.test(passwordSalt) ||
      typeof passwordHash !== 'string' || !/^[0-9a-f]{64}$/i.test(passwordHash)) {
      return json({ error: 'Invalid game settings or game admin password.' }, 400);
    }
    if (poolSize > (await pinsFor(env)).length) return json({ error: 'The pin pool exceeds the catalog.' }, 400);
    const now = Date.now();
    const game = createRegisteredGameCode(now, intervalSeconds as 10 | 15 | 20 | 30, poolSize);
    const verifier = await gamePasswordVerifier(env.PINGO_SIGNING_SECRET!, passwordHash);
    const inserted = await env.PINGO_PLAYERS.prepare(
      'INSERT OR IGNORE INTO games (game_code, start_ms, interval_ms, pool_size, password_salt, password_hash, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(game, Math.floor(now / 1_000) * 1_000, intervalSeconds * 1_000,
      poolSize, passwordSalt, verifier, now).run() as { meta?: { changes?: number } };
    if (inserted.meta?.changes !== 1) return json({ error: 'A game with these settings was created this second. Try again.' }, 409);
    return json({ game, intervalMs: intervalSeconds * 1_000, poolSize }, 201);
  }
  if (typeof body.game !== 'string' || typeof (isNewGameCode(body.game) ? body.passwordProof : body.password) !== 'string') {
    return json({ error: 'Invalid game code or password.' }, 400);
  }
  const details = await gameDetailsFor(env, body.game);
  if (!details) return json({ error: 'Game is not registered.' }, 404);
  if (!await adminPasswordMatches(env, body.game,
    isNewGameCode(body.game) ? body.passwordProof as string : body.password as string)) {
    return json({ error: 'Incorrect game admin password.' }, 401);
  }
  const { startMs, intervalMs } = details;
  const catalog = await pinsFor(env);
  if (details.poolSize && catalog.length < details.poolSize) return json({ error: 'The game pin pool is unavailable.' }, 503);
  const pins = details.poolSize ? catalog.slice(0, details.poolSize) : catalog;
  const clockCount = scheduledCount(startMs, Date.now(), intervalMs);
  const requested = body.pin === undefined ? clockCount : body.pin;
  const at = body.at === undefined ? startMs + (clockCount - 1) * intervalMs : body.at;
  if (typeof requested !== 'number' || !Number.isSafeInteger(requested) || requested < 0 ||
    typeof at !== 'number' || !Number.isSafeInteger(at) || at < 0) return json({ error: 'Invalid pin count.' }, 400);
  const count = Math.min(requested, pins.length);
  const limit = Math.min(pins.length,
    Math.max(DRAW_BATCH_SIZE, Math.ceil((count + 1) / DRAW_BATCH_SIZE) * DRAW_BATCH_SIZE));
  const drawKeys = await drawBatchKeys(env.PINGO_SIGNING_SECRET!, startMs, pins.length);
  const ids = await drawIdsFromBatchKeys(drawKeys, pins.map(pin => pin.id), limit);
  const signingKey = await callerSigningKey(env.PINGO_SIGNING_SECRET!, body.game);
  const sig = await signPinCount(env.PINGO_SIGNING_SECRET!, body.game, count, at);
  return json({ at, drawKeys, game: body.game, ids, intervalMs, pin: count,
    poolSize: pins.length, sig, signingKey, startMs });
}

async function rolloverRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  if (!env.PINGO_PLAYERS) return json({ error: 'Game storage is not configured.' }, 503);
  let body: JsonObject;
  try {
    body = await limitedJson(request);
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const { game, passwordProof, pin, at, sig } = body;
  if (typeof game !== 'string' || !isNewGameCode(game) || typeof passwordProof !== 'string' ||
    typeof pin !== 'number' || !Number.isSafeInteger(pin) ||
    typeof at !== 'number' || !Number.isSafeInteger(at) || typeof sig !== 'string') {
    return json({ error: 'Invalid rollover request.' }, 400);
  }
  const previous = await registeredGame(env, game);
  if (!previous) return json({ error: 'Game is not registered.' }, 404);
  if (!await adminPasswordMatches(env, game, passwordProof)) {
    return json({ error: 'Incorrect game admin password.' }, 401);
  }
  if (pin !== previous.poolSize || at < previous.startMs || at > Date.now() ||
    !await callerPinSignatureIsValid(env.PINGO_SIGNING_SECRET!, game, pin, at, sig)) {
    return json({ error: 'A signed final pin call is required.' }, 403);
  }
  if (Date.now() < at + previous.intervalMs * 5) {
    return json({ error: 'The next game is not due yet.' }, 409);
  }
  if ((await pinsFor(env)).length < previous.poolSize) {
    return json({ error: 'The game pin pool is unavailable.' }, 503);
  }
  let successor: string | undefined;
  const existing = await env.PINGO_PLAYERS.prepare(
    'SELECT successor_game_code AS successorGameCode FROM game_successors WHERE game_code = ?'
  ).bind(game).all();
  successor = existing.results[0]?.successorGameCode as string | undefined;
  for (let attempt = 0; !successor && attempt < 12; attempt += 1) {
    const startMs = Math.floor(Date.now() / 1_000) * 1_000 - attempt * 1_000;
    if (startMs < previous.startMs) break;
    const candidate = createRegisteredGameCode(startMs,
      (previous.intervalMs / 1_000) as 10 | 15 | 20 | 30, previous.poolSize);
    if (await registeredGame(env, candidate)) continue;
    await env.PINGO_PLAYERS.prepare(
      'INSERT OR IGNORE INTO game_successors (game_code, successor_game_code) VALUES (?, ?)'
    ).bind(game, candidate).run();
    const selected = await env.PINGO_PLAYERS.prepare(
      'SELECT successor_game_code AS successorGameCode FROM game_successors WHERE game_code = ?'
    ).bind(game).all();
    successor = selected.results[0]?.successorGameCode as string | undefined;
  }
  if (!successor) return json({ error: 'No available successor game code was found.' }, 503);
  const details = verifiedGameDetails(successor);
  if (!details || details.intervalMs !== previous.intervalMs || details.poolSize !== previous.poolSize) {
    throw new Error('Saved successor settings do not match the previous game.');
  }
  await env.PINGO_PLAYERS.prepare(
    'INSERT OR IGNORE INTO games (game_code, start_ms, interval_ms, pool_size, password_salt, password_hash, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(successor, details.startMs, previous.intervalMs, previous.poolSize,
    previous.passwordSalt, previous.passwordHash, Date.now()).run();
  const saved = await registeredGame(env, successor);
  if (!saved || saved.passwordSalt !== previous.passwordSalt || saved.passwordHash !== previous.passwordHash) {
    throw new Error('Successor game code is already used by another game.');
  }
  return json({ game: successor, intervalMs: saved.intervalMs, poolSize: saved.poolSize });
}

async function verifyRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'GET required.' }, 405);
  const url = new URL(request.url);
  const game = url.searchParams.get('game') ?? '';
  const board = url.searchParams.get('board') ?? '';
  const details = await gameDetailsFor(env, game);
  if (!details || !isBoardCodeForGame(board, game)) {
    return json({ error: 'Invalid game or board code.' }, 400);
  }
  if (!await boardExists(env, game, board)) return json({ error: 'Board is not registered for this game.' }, 404);
  const { startMs, intervalMs } = details;
  let count = scheduledCount(startMs, Date.now(), intervalMs);
  if (url.searchParams.has('pin') || url.searchParams.has('at') || url.searchParams.has('sig')) {
    const pin = Number(url.searchParams.get('pin'));
    const at = Number(url.searchParams.get('at'));
    const sig = url.searchParams.get('sig') ?? '';
    if (!url.searchParams.has('pin') || !url.searchParams.has('at') ||
      !Number.isSafeInteger(pin) || pin < 0 || !Number.isSafeInteger(at) || at < 0 ||
      (pin > 0 && at < startMs) ||
      !await callerPinSignatureIsValid(env.PINGO_SIGNING_SECRET!, game, pin, at, sig)) {
      return json({ error: 'Invalid pin override signature.' }, 403);
    }
    count = pin;
  }
  const catalog = await pinsFor(env);
  if (details.poolSize && catalog.length < details.poolSize) return json({ error: 'The game pin pool is unavailable.' }, 503);
  const pins = details.poolSize ? catalog.slice(0, details.poolSize) : catalog;
  count = Math.min(count, pins.length);
  const ids = await drawIds(env.PINGO_SIGNING_SECRET!, startMs, pins.map(pin => pin.id), count);
  const boardIds = boardPins(board, pins).map(pin => pin.id);
  const called = new Set(ids);
  return json({
    board, checkedAt: Date.now(), count, game, intervalMs,
    matchedIds: boardIds.filter(id => called.has(id)),
    winningLines: winningLines(boardIds, called),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/player' || url.pathname.startsWith('/api/pingo/')) {
      if (url.pathname === '/player') {
        try {
          return await playerRequest(request, env); 
        } catch (error) {
          console.error(JSON.stringify({ event: 'pingo_player_error', message: error instanceof Error ? error.message : 'Unknown error' }));
          return json({ error: 'Player request failed.' }, 500);
        }
      }
      if (!env.PINGO_ADMIN_PASSWORD || !env.PINGO_SIGNING_SECRET) {
        return json({ error: 'Pingo is not configured.' }, 503);
      }
      try {
        if (url.pathname === '/api/pingo/games') return await gamesRequest(request, env);
        if (url.pathname === '/api/pingo/salt') return await gameSaltRequest(request, env);
        if (url.pathname === '/api/pingo/board') return await boardRequest(request, env);
        if (url.pathname === '/api/pingo/rollover') return await rolloverRequest(request, env);
        if (url.pathname === '/api/pingo/scavenger') return await scavengerRequest(request, env);
        if (url.pathname === '/api/pingo/create' || url.pathname === '/api/pingo/admin') {
          return await adminRequest(request, env);
        }
        if (url.pathname === '/api/pingo/verify') return await verifyRequest(request, env);
        return json({ error: 'Unknown endpoint.' }, 404);
      } catch (error) {
        console.error(JSON.stringify({ event: 'pingo_api_error',
          message: error instanceof Error ? error.message : 'Unknown error', path: url.pathname }));
        return json({ error: 'Pingo request failed.' }, 500);
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed.', { status: 405 });
    if (url.pathname === '/pins.json' || url.pathname.startsWith('/assets/')) return env.ASSETS.fetch(request);
    return env.ASSETS.fetch(new Request(new URL('/shell', request.url), request));
  },
};
