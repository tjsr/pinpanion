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
  passwordSalt: string; passwordHash: string; scavengerHuntOnly: number; createdAt: number;
};

async function registeredGame(env: Env, code: string): Promise<GameRecord | null> {
  const prefix = code.slice(0, 6);
  if (!env.PINGO_PLAYERS || !/^[234679ACDEFGHJKLMNPQRTUVWXYZ]{6}$/.test(prefix) ||
    (code !== prefix && !isNewGameCode(code))) return null;
  const rows = await env.PINGO_PLAYERS.prepare(
    'SELECT game_code AS gameCode, start_ms AS startMs, interval_ms AS intervalMs, pool_size AS poolSize, password_salt AS passwordSalt, password_hash AS passwordHash, scavenger_hunt_only AS scavengerHuntOnly, created_at_ms AS createdAt FROM games WHERE game_code LIKE ? LIMIT 2'
  ).bind(`${prefix}-%`).all();
  if (rows.results.length > 1) throw new Error('This game prefix matches more than one game.');
  const saved = rows.results[0] as GameRecord | undefined;
  if (!saved) return null;
  if (/^[0-9a-f]{64}$/i.test(saved.passwordHash) && env.PINGO_SIGNING_SECRET) {
    const verifier = await gamePasswordVerifier(env.PINGO_SIGNING_SECRET, saved.passwordHash);
    await env.PINGO_PLAYERS.prepare(
      'UPDATE games SET password_hash = ? WHERE game_code = ? AND password_hash = ?'
    ).bind(verifier, saved.gameCode, saved.passwordHash).run();
    saved.passwordHash = verifier;
  }
  return saved;
}

async function gameDetailsFor(env: Env, code: string): Promise<{
  gameCode: string; intervalMs: number; startMs: number; poolSize?: number;
  scavengerHuntOnly: boolean;
} | null> {
  const saved = await registeredGame(env, code);
  const canonical = saved?.gameCode ?? code;
  const decoded = verifiedGameDetails(canonical);
  if (!decoded || decoded.startMs > Date.now() + 60_000) return null;
  if (!isNewGameCode(canonical)) return { ...decoded, gameCode: canonical, scavengerHuntOnly: false };
  if (!saved || saved.startMs !== decoded.startMs || saved.intervalMs !== decoded.intervalMs ||
    saved.poolSize !== decoded.poolSize) return null;
  return { gameCode: canonical, intervalMs: saved.intervalMs, poolSize: saved.poolSize,
    scavengerHuntOnly: saved.scavengerHuntOnly === 1, startMs: saved.startMs };
}

async function gameModeRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'GET required.' }, 405);
  const game = new URL(request.url).searchParams.get('game') ?? '';
  const details = await gameDetailsFor(env, game);
  if (!details) return json({ error: 'Game is not registered.' }, 404);
  return json({ game: details.gameCode, scavengerHuntOnly: details.scavengerHuntOnly });
}

async function gameInfoFor(env: Env, game: string): Promise<{ infoUrl: string; tooltipText: string }> {
  if (!env.PINGO_PLAYERS) return { infoUrl: '', tooltipText: '' };
  const prefix = game.split('-')[0];
  const rows = await env.PINGO_PLAYERS.prepare(
    'SELECT info_url AS infoUrl, tooltip_text AS tooltipText FROM game_info WHERE game_code = ? OR game_code = ? ORDER BY CASE WHEN game_code = ? THEN 0 ELSE 1 END LIMIT 1'
  ).bind(prefix, game, prefix).all();
  return { infoUrl: String(rows.results[0]?.infoUrl ?? ''),
    tooltipText: String(rows.results[0]?.tooltipText ?? '') };
}

async function gameInfoRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PINGO_PLAYERS) return json({ error: 'Game storage is not configured.' }, 503);
  if (request.method === 'GET') {
    const game = new URL(request.url).searchParams.get('game') ?? '';
    const details = await gameDetailsFor(env, game);
    if (!details) return json({ error: 'Game is not registered.' }, 404);
    return json(await gameInfoFor(env, details.gameCode));
  }
  if (request.method !== 'POST') return json({ error: 'GET or POST required.' }, 405);
  let body: JsonObject;
  try {
    body = await limitedJson(request);
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const { game, infoUrl, tooltipText } = body;
  const details = typeof game === 'string' ? await gameDetailsFor(env, game) : null;
  if (!details) {
    return json({ error: 'Game is not registered.' }, 404);
  }
  const password = isNewGameCode(details.gameCode) ? body.passwordProof : body.password;
  if (typeof password !== 'string' || !await adminPasswordMatches(env, details.gameCode, password)) {
    return json({ error: 'Incorrect game admin password.' }, 401);
  }
  if (typeof infoUrl !== 'string' || typeof tooltipText !== 'string') {
    return json({ error: 'Invalid game info.' }, 400);
  }
  const url = infoUrl.trim();
  const tooltip = tooltipText.trim();
  const hasControl = (text: string, allowWhitespace: boolean) => [...text].some(character => {
    const code = character.charCodeAt(0);
    return (code < 32 && (!allowWhitespace || (code !== 9 && code !== 10 && code !== 13))) || code === 127;
  });
  if (url.length > 2048 || tooltip.length > 1000 || hasControl(url, false) ||
    hasControl(tooltip, true)) {
    return json({ error: 'The info link or tooltip text is invalid or too long.' }, 400);
  }
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname) {
        return json({ error: 'Enter an HTTPS game info link.' }, 400);
      }
    } catch {
      return json({ error: 'Enter an HTTPS game info link.' }, 400);
    }
  }
  await env.PINGO_PLAYERS.prepare(
    'INSERT INTO game_info (game_code, info_url, tooltip_text) VALUES (?, ?, ?) ON CONFLICT(game_code) DO UPDATE SET info_url = excluded.info_url, tooltip_text = excluded.tooltip_text'
  ).bind(details.gameCode.split('-')[0], url, tooltip).run();
  return json({ infoUrl: url, tooltipText: tooltip });
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
  const saved = await registeredGame(env, game);
  if (saved) {
    return !!env.PINGO_SIGNING_SECRET &&
      await gamePasswordProofMatches(credential, saved.passwordHash, env.PINGO_SIGNING_SECRET);
  }
  if (isNewGameCode(game)) return false;
  return !!env.PINGO_ADMIN_PASSWORD && await passwordMatches(env.PINGO_ADMIN_PASSWORD, credential);
}

async function manageLoginRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  let body: JsonObject;
  try {
    body = await limitedJson(request);
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const { game, sitePassword } = body;
  const details = typeof game === 'string' ? await gameDetailsFor(env, game) : null;
  const gameCredential = details && isNewGameCode(details.gameCode)
    ? body.passwordProof : body.gamePassword;
  if (typeof game !== 'string' || typeof sitePassword !== 'string' ||
    typeof gameCredential !== 'string') {
    return json({ error: 'Enter a game code and both admin passwords.' }, 400);
  }
  if (!details) return json({ error: 'Game is not registered.' }, 404);
  if (!env.PINGO_ADMIN_PASSWORD || !await passwordMatches(env.PINGO_ADMIN_PASSWORD, sitePassword) ||
    !await adminPasswordMatches(env, details.gameCode, gameCredential)) {
    return json({ error: 'Incorrect system or game admin password.' }, 401);
  }
  return json({ game: details.gameCode });
}

async function playerRequest(request: Request, env: Env): Promise<Response> {
  if (!env.PINGO_PLAYERS) return json({ error: 'Player storage is not configured.' }, 503);
  if (request.method === 'GET') {
    const authorization = request.headers.get('Authorization') ?? '';
    const requestedGame = new URL(request.url).searchParams.get('game');
    const details = requestedGame ? await gameDetailsFor(env, requestedGame) : null;
    if (requestedGame && !details) return json({ error: 'Game is not registered.' }, 404);
    const game = details?.gameCode;
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
  const requestedGameCode = body.gameCode;
  const details = typeof requestedGameCode === 'string'
    ? await gameDetailsFor(env, requestedGameCode) : null;
  const gameCode = details?.gameCode;
  const registrationId = body.registrationId;
  const playerName = typeof body.playerName === 'string' ? body.playerName.trim() : '';
  if (typeof boardId !== 'string' || typeof gameCode !== 'string' ||
    !await boardExists(env, gameCode, boardId) ||
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
    'SELECT game_code AS gameCode, start_ms AS startMs, interval_ms AS intervalMs, pool_size AS poolSize, scavenger_hunt_only AS scavengerHuntOnly FROM games ORDER BY created_at_ms DESC'
  ).bind().all();
  return json({ games: rows.results.map(row => ({ ...row,
    scavengerHuntOnly: row.scavengerHuntOnly === 1 })) });
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
    const details = await gameDetailsFor(env, game);
    if (!details || !await boardExists(env, details.gameCode, board)) {
      return json({ error: 'Board is not registered for this game.' }, 404);
    }
    return json({ board, game: details.gameCode,
      scavengerHuntOnly: details.scavengerHuntOnly });
  }
  if (request.method !== 'POST') return json({ error: 'GET or POST required.' }, 405);
  let body: JsonObject;
  try {
    body = await limitedJson(request); 
  } catch {
    return json({ error: 'Invalid request.' }, 400); 
  }
  const details = typeof body.game === 'string' ? await gameDetailsFor(env, body.game) : null;
  const game = details?.gameCode;
  if (!game || !isNewGameCode(game)) return json({ error: 'A registered game is required.' }, 400);
  if (!details || !details.poolSize) return json({ error: 'Game is not registered.' }, 404);
  if (details.scavengerHuntOnly) return json({ error: 'This game only allows scavenger hunt boards.' }, 403);
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
  const details = typeof body.gameCode === 'string'
    ? await gameDetailsFor(env, body.gameCode) : null;
  const gameCode = details?.gameCode;
  const deviceId = body.deviceId;
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const timeZone = body.timeZone;
  if (!gameCode ||
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
    const scavengerHuntOnly = body.scavengerHuntOnly ?? false;
    if (typeof intervalSeconds !== 'number' ||
      !DRAW_INTERVAL_SECONDS.some(value => value === intervalSeconds) ||
      typeof poolSize !== 'number' || !Number.isSafeInteger(poolSize) ||
      poolSize < BOARD_SIZE || poolSize % BOARD_SIZE !== 0 ||
      typeof passwordSalt !== 'string' || !/^[0-9a-f]{32}$/i.test(passwordSalt) ||
      typeof passwordHash !== 'string' || !/^[0-9a-f]{64}$/i.test(passwordHash) ||
      typeof scavengerHuntOnly !== 'boolean') {
      return json({ error: 'Invalid game settings or game admin password.' }, 400);
    }
    if (poolSize > (await pinsFor(env)).length) return json({ error: 'The pin pool exceeds the catalog.' }, 400);
    const now = Date.now();
    const game = createRegisteredGameCode(now, intervalSeconds as 10 | 15 | 20 | 30, poolSize);
    if (await registeredGame(env, game)) {
      return json({ error: 'A game was created with this prefix this second. Try again.' }, 409);
    }
    const verifier = await gamePasswordVerifier(env.PINGO_SIGNING_SECRET!, passwordHash);
    const inserted = await env.PINGO_PLAYERS.prepare(
      'INSERT OR IGNORE INTO games (game_code, start_ms, interval_ms, pool_size, password_salt, password_hash, scavenger_hunt_only, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(game, Math.floor(now / 1_000) * 1_000, intervalSeconds * 1_000,
      poolSize, passwordSalt, verifier, scavengerHuntOnly ? 1 : 0, now).run() as { meta?: { changes?: number } };
    if (inserted.meta?.changes !== 1) return json({ error: 'A game with these settings was created this second. Try again.' }, 409);
    return json({ game, intervalMs: intervalSeconds * 1_000, poolSize, scavengerHuntOnly }, 201);
  }
  if (typeof body.game !== 'string') {
    return json({ error: 'Invalid game code or password.' }, 400);
  }
  const details = await gameDetailsFor(env, body.game);
  if (!details) return json({ error: 'Game is not registered.' }, 404);
  const game = details.gameCode;
  const credential = isNewGameCode(game) ? body.passwordProof : body.password;
  if (typeof credential !== 'string' || !await adminPasswordMatches(env, game, credential)) {
    return json({ error: 'Incorrect game admin password.' }, 401);
  }
  const { startMs, intervalMs } = details;
  const catalog = await pinsFor(env);
  if (details.poolSize && catalog.length < details.poolSize) return json({ error: 'The game pin pool is unavailable.' }, 503);
  const pins = details.poolSize ? catalog.slice(0, details.poolSize) : catalog;
  if (details.scavengerHuntOnly) {
    const info = await gameInfoFor(env, game);
    return json({ at: startMs, drawKeys: [], game, ids: [], intervalMs,
      pin: 0, poolSize: pins.length, scavengerHuntOnly: true, sig: '', signingKey: '',
      startMs, ...info });
  }
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
  const signingKey = await callerSigningKey(env.PINGO_SIGNING_SECRET!, game);
  const sig = await signPinCount(env.PINGO_SIGNING_SECRET!, game, count, at);
  const info = await gameInfoFor(env, game);
  return json({ at, drawKeys, game, ids, intervalMs, pin: count,
    poolSize: pins.length, scavengerHuntOnly: details.scavengerHuntOnly,
    sig, signingKey, startMs, ...info });
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
  if (previous.scavengerHuntOnly === 1) {
    return json({ error: 'Scavenger hunt games do not have caller rollover.' }, 403);
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
    'INSERT OR IGNORE INTO games (game_code, start_ms, interval_ms, pool_size, password_salt, password_hash, scavenger_hunt_only, created_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(successor, details.startMs, previous.intervalMs, previous.poolSize,
    previous.passwordSalt, previous.passwordHash, previous.scavengerHuntOnly, Date.now()).run();
  const saved = await registeredGame(env, successor);
  if (!saved || saved.passwordSalt !== previous.passwordSalt || saved.passwordHash !== previous.passwordHash ||
    saved.scavengerHuntOnly !== previous.scavengerHuntOnly) {
    throw new Error('Successor game code is already used by another game.');
  }
  return json({ game: successor, intervalMs: saved.intervalMs, poolSize: saved.poolSize,
    scavengerHuntOnly: saved.scavengerHuntOnly === 1 });
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
  if (details.scavengerHuntOnly) {
    return json({ error: 'Scavenger hunt games have no called pins to verify.' }, 403);
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
        if (url.pathname === '/api/pingo/game-mode') return await gameModeRequest(request, env);
        if (url.pathname === '/api/pingo/salt') return await gameSaltRequest(request, env);
        if (url.pathname === '/api/pingo/board') return await boardRequest(request, env);
        if (url.pathname === '/api/pingo/rollover') return await rolloverRequest(request, env);
        if (url.pathname === '/api/pingo/scavenger') return await scavengerRequest(request, env);
        if (url.pathname === '/api/pingo/game-info') return await gameInfoRequest(request, env);
        if (url.pathname === '/api/pingo/manage-login') return await manageLoginRequest(request, env);
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
