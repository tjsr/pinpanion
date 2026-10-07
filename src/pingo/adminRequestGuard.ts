const STORAGE_KEY = 'pingo:admin:requestGuard:v1';
const MIN_REQUEST_GAP_MS = 9_000;
const SERVICE_COOLDOWN_MS = 5 * 60_000;
const DAILY_WINDOW_MS = 24 * 60 * 60_000;
const DAILY_REQUEST_LIMIT = 5_000;

type GuardState = {
  blockedUntil: number;
  count: number;
  nextAtByKey: Record<string, number>;
  windowStart: number;
};

type GuardDenial = { allowed: false; reason: 'spacing' | 'service' | 'daily'; waitMs: number };
type GuardDecision = { allowed: true } | GuardDenial;

let memoryState: GuardState | null = null;

function freshState(now: number): GuardState {
  return { blockedUntil: 0, count: 0, nextAtByKey: {}, windowStart: now };
}

function readState(now: number): GuardState {
  let saved: GuardState | null = null;
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (text) saved = JSON.parse(text) as GuardState;
  } catch {
    saved = memoryState;
  }
  if (!saved || !Number.isFinite(saved.windowStart) || !Number.isFinite(saved.count) ||
    !saved.nextAtByKey || typeof saved.nextAtByKey !== 'object' ||
    !Number.isFinite(saved.blockedUntil)) return freshState(now);
  if (now - saved.windowStart >= DAILY_WINDOW_MS) {
    return { ...freshState(now), blockedUntil: saved.blockedUntil };
  }
  return saved;
}

function saveState(state: GuardState): void {
  memoryState = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); 
  } catch { /* In-memory limits still protect this tab when storage is unavailable. */ }
}

function requestAvailability(key: string, now: number): GuardDecision {
  const state = readState(now);
  if (state.blockedUntil > now) {
    return { allowed: false, reason: 'service', waitMs: state.blockedUntil - now };
  }
  if (state.count >= DAILY_REQUEST_LIMIT) {
    return { allowed: false, reason: 'daily',
      waitMs: Math.max(0, state.windowStart + DAILY_WINDOW_MS - now) };
  }
  const nextAt = state.nextAtByKey[key] ?? 0;
  if (nextAt > now) {
    return { allowed: false, reason: 'spacing', waitMs: nextAt - now };
  }
  return { allowed: true };
}

function reserveRequest(key: string, gapMs: number, now: number): GuardDecision {
  const decision = requestAvailability(key, now);
  if (!decision.allowed) return decision;
  const state = readState(now);
  saveState({ ...state, count: state.count + 1,
    nextAtByKey: { ...state.nextAtByKey, [key]: now + gapMs } });
  return decision;
}

export function adminRequestAvailability(game: string, now = Date.now()): GuardDecision {
  return requestAvailability(`admin:${game}`, now);
}

export function reserveAdminRequest(game: string, now = Date.now()): GuardDecision {
  return reserveRequest(`admin:${game}`, MIN_REQUEST_GAP_MS, now);
}

export function reserveRolloverRequest(game: string, now = Date.now()): GuardDecision {
  return reserveRequest(`rollover:${game}`, MIN_REQUEST_GAP_MS, now);
}

export function reservePingoPoll(key: string, intervalMs: number, now = Date.now()): GuardDecision {
  return reserveRequest(`poll:${key}`, Math.max(MIN_REQUEST_GAP_MS, intervalMs), now);
}

export function recordPingoResponse(status: number, now = Date.now()): void {
  if (status !== 429 && status < 500) return;
  const state = readState(now);
  saveState({ ...state, blockedUntil: Math.max(state.blockedUntil, now + SERVICE_COOLDOWN_MS) });
}

export function adminRequestWaitMessage(denial: GuardDenial): string {
  const seconds = Math.max(1, Math.ceil(denial.waitMs / 1_000));
  if (denial.reason === 'daily') return `Pingo request safety limit reached. Try again in ${Math.ceil(seconds / 60)} minutes.`;
  if (denial.reason === 'service') return `Pingo service is cooling down after an error. Try again in ${Math.ceil(seconds / 60)} minutes.`;
  return `Please wait ${seconds} seconds before the next Pingo request.`;
}
