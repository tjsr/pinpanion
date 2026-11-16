import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar, Box, Button, Checkbox, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, Paper, Stack, TextField, Toolbar, Tooltip, Typography
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { PinInfo } from '../components/PinInfo.tsx';
import QRCode from 'react-qr-code';
import { makeCode, normalizeCode } from '../guess/game.ts';
import { BOARD_WITH_SETTINGS_LENGTH, DEFAULT_POOL_SIZE, DRAW_INTERVAL_SECONDS,
  MAX_GAME_CODE_LENGTH, boardPins, drawIntervalFromGameCode, gameDetailsFromCode,
  isBoardCodeForGame, isNewGameCode, timestampFromGameCode, usablePinsFrom } from './game.ts';
import { HuntCaptureDialog, HuntPhotoCard, HuntPhotoPreview } from './ScavengerHunt.tsx';
import { boardStartedAt, loadBoardPhotos, photoIsValid, saveBoardPhoto } from './scavenger.ts';
import type { HuntPhoto } from './scavenger.ts';
import { formatPhotoTakenAt } from './photoMetadata.ts';
import { drawIdsFromBatchKeys, gamePasswordHash, hashGamePassword, signPinCount } from './secure.ts';
import { adminRequestAvailability, adminRequestWaitMessage,
  recordPingoResponse, reserveAdminRequest, reservePingoPoll,
  reserveRolloverRequest } from './adminRequestGuard.ts';

type Route = { kind: 'home' } |
  { kind: 'manage'; game: string } |
  { kind: 'join'; game: string } |
  { kind: 'board'; board: string; game: string; assignedHunt?: boolean } |
  { kind: 'scavenger'; game: string } |
  { kind: 'verify'; game: string; board: string } |
  { kind: 'caller' | 'admin'; game: string } |
  { kind: 'invalid' };

type AdminData = {
  game: string; startMs: number; pin: number; at: number; sig: string; ids: number[]; poolSize: number;
  drawKeys: string[]; signingKey: string; infoUrl?: string; tooltipText?: string;
  scavengerHuntOnly?: boolean;
};
type GameInfo = { infoUrl: string; tooltipText: string };
const SCAVENGER_DESCRIPTION = "To play Pingo scavenger hunt, find these pins in the wild - in your own collection or on other people's lanyards or trade boards and tables. Take photos of the pins specified to fill the board. When you've completed the board, follow the instructions applicable to that game.";

function GameInfoDetails({ game }: { game: string }) {
  const [info, setInfo] = useState<GameInfo>({ infoUrl: '', tooltipText: '' });
  useEffect(() => {
    if (!validGameCode(game)) return;
    let active = true;
    setInfo({ infoUrl: '', tooltipText: '' });
    fetch(`/api/pingo/game-info?${new URLSearchParams({ game })}`, { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json() as Partial<GameInfo>;
        if (active) setInfo({ infoUrl: typeof result.infoUrl === 'string' ? result.infoUrl : '',
          tooltipText: typeof result.tooltipText === 'string' ? result.tooltipText : '' });
      }).catch(() => { /* Game info is optional; the hunt remains available. */ });
    return () => { active = false; };
  }, [game]);
  if (!info.infoUrl && !info.tooltipText) return null;
  return <Paper variant="outlined" sx={{ p: 2 }}>
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h6">Game instructions</Typography>
        {info.tooltipText && <Tooltip title={info.tooltipText}>
          <IconButton aria-label="Game information tip" size="small"><InfoOutlinedIcon /></IconButton>
        </Tooltip>}
      </Stack>
      {info.tooltipText && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{info.tooltipText}</Typography>}
      {info.infoUrl && <Typography component="a" href={info.infoUrl}
        target="_blank" rel="noopener noreferrer" sx={{ overflowWrap: 'anywhere' }}>
        {info.infoUrl}
      </Typography>}
    </Stack>
  </Paper>;
}
type CallerSnapshot = Pick<AdminData, 'game' | 'pin' | 'at'>;

function dueDraw(data: AdminData, now: number, availablePins: number): { pin: number; at: number } | null {
  const interval = drawIntervalFromGameCode(data.game);
  const missed = Math.floor((now - data.at) / interval);
  const remaining = (data.poolSize ?? availablePins) - data.pin;
  if (missed < 1 || remaining < 1) return null;
  const advance = Math.min(missed, remaining);
  return { pin: data.pin + advance, at: data.at + advance * interval };
}

type Verification = {
  count: number; matchedIds: number[]; winningLines: number[][]; checkedAt: number;
};

type PlayerRecord = { registrationId: string; boardId: string; gameCode: string; playerName: string; updatedAt: number };

const ADMIN_SESSION_KEY = 'pingo:admin:password:';
const adminPasswordMemory = new Map<string, string>();
const LEGACY_ADMIN_SESSION_KEY = 'pingo:admin:password';
const STARTED_GAMES_KEY = 'pingo:admin:startedGames';
const SCAVENGER_DEVICE_KEY = 'pingo:scavenger:deviceId';

function validGameCode(code: unknown): code is string {
  if (typeof code !== 'string') return false;
  try { gameDetailsFromCode(code); return true; }
  catch { return false; }
}

function gameLinkCodeIsValid(code: string): boolean {
  return /^[234679ACDEFGHJKLMNPQRTUVWXYZ]{6}$/.test(code) || gameStartFromCode(code) !== null;
}

function startedGamesFromStorage(): string[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STARTED_GAMES_KEY) ?? '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter(validGameCode))] : [];
  } catch { return []; }
}

function rememberedAdminPassword(game: string): string {
  if (adminPasswordMemory.has(game)) return adminPasswordMemory.get(game)!;
  try { return game ? window.sessionStorage.getItem(isNewGameCode(game) ?
    `${ADMIN_SESSION_KEY}${game}` : LEGACY_ADMIN_SESSION_KEY) ?? '' : ''; }
  catch { return ''; }
}

function newRegistrationId(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}

function savedPlayer(boardId: string): { gameCode: string; playerName: string; registrationId: string } {
  try {
    const record = JSON.parse(window.localStorage.getItem(`pingo:player:${boardId}`) ?? '{}') as
      { gameCode?: unknown; playerName?: unknown; registrationId?: unknown };
    return {
      gameCode: typeof record.gameCode === 'string' ? normalizeCode(record.gameCode) :
        normalizeCode(window.localStorage.getItem(`pingo:board:${boardId}:game`) ?? ''),
      playerName: typeof record.playerName === 'string' ? record.playerName : '',
      registrationId: typeof record.registrationId === 'string' && /^[0-9a-f]{32}$/i.test(record.registrationId) ?
        record.registrationId : newRegistrationId()
    };
  } catch { return { gameCode: '', playerName: '', registrationId: newRegistrationId() }; }
}

export function routeFromLocation(): Route {
  const parts = window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const requestedGame = new URLSearchParams(window.location.search).get('game');
  const assignedHunt = new URLSearchParams(window.location.search).get('hunt') === '1';
  const joinedGame = requestedGame === null ? undefined : normalizeCode(requestedGame);
  if (joinedGame && !gameLinkCodeIsValid(joinedGame)) return { kind: 'invalid' };
  if (parts.length === 0) {
    return joinedGame ? { kind: 'join', game: joinedGame } : { kind: 'home' };
  }
  if (parts.length === 1 && joinedGame && isBoardCodeForGame(parts[0], joinedGame)) {
    return { kind: 'board', board: parts[0], game: joinedGame,
      ...(assignedHunt ? { assignedHunt: true } : {}) };
  }
  if (parts.length === 2 && parts[0] === 'join' && gameLinkCodeIsValid(parts[1])) {
    return { kind: 'join', game: parts[1] };
  }
  if (parts.length === 2 && parts[0] === 'scavenger' && gameLinkCodeIsValid(parts[1])) {
    return { kind: 'scavenger', game: parts[1] };
  }
  if (parts.length === 1 && (parts[0] === 'manage' || parts[0] === 'admin')) {
    return { kind: 'manage', game: joinedGame ?? '' };
  }
  if (parts.length === 1 && parts[0] === 'go') return { kind: 'caller', game: '' };
  if (parts.length === 2 && (parts[1] === 'go' || parts[1] === 'admin') && validGameCode(parts[0])) {
    return { kind: parts[1] === 'go' ? 'caller' : 'admin', game: parts[0] };
  }
  if (parts.length === 3 && parts[1] === 'verify' &&
    validGameCode(parts[0]) && isBoardCodeForGame(parts[2], parts[0])) {
    return { kind: 'verify', game: parts[0], board: parts[2] };
  }
  return { kind: 'invalid' };
}

function useRoute() {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  useEffect(() => {
    const onPop = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((path: string, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
    setRoute(routeFromLocation());
  }, []);
  return { route, navigate };
}

function PinCard({ pin, feed, large = false }: { pin: Pin; feed: PinCollectionData; large?: boolean }) {
  return <PinInfo pin={pin} displaySize={large ? 'large' : 'sm'}
    categories={feed.categories} paxs={feed.pax} events={feed.events}
    pinSets={feed.sets} groups={feed.groups} imagePrefix="https://pinpanion.com/imgs" />;
}

function gameStartFromCode(code: string): number | null {
  if (!validGameCode(code)) return null;
  try {
    const startMs = timestampFromGameCode(code);
    return startMs <= Date.now() ? startMs : null;
  } catch { return null; }
}

function GameStartTime({ startMs, game, heading = false }:
  { startMs: number; game: string; heading?: boolean }) {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date(startMs));
  return <Typography variant={heading ? 'h3' : 'h4'} component={heading ? 'h1' : 'p'}>
    Game {game} started at {time}
  </Typography>;
}

function BoardGrid({ board, feed, checked = new Set<number>(), winning = [], onToggle,
  huntPhotos, onHuntClick }:
  { board: Pin[]; feed: PinCollectionData; checked?: Set<number>; winning?: number[][];
    onToggle?: (pinId: number) => void; huntPhotos?: Map<number, HuntPhoto>;
    onHuntClick?: (pin: Pin) => void }) {
  const winningCells = new Set(winning.flat());
  return <Box className="pingo-board-scroll"><Box className="pingo-board" aria-label="Pingo board">
    {board.map((pin, index) => <Tooltip describeChild key={`${pin.id}-${index}`}
      title={huntPhotos?.get(pin.id) ? formatPhotoTakenAt(huntPhotos.get(pin.id)!.capturedAt) : ''}>
      <Box
        component={onToggle || onHuntClick ? 'button' : 'div'}
        type={onToggle || onHuntClick ? 'button' : undefined}
        className={`pingo-cell${onToggle || onHuntClick ? ' interactive' : ''}${checked.has(pin.id) ? ' checked' : ''}${winningCells.has(index) ? ' winner' : ''}`}
        aria-label={onHuntClick ? `${pin.name}, ${huntPhotos?.has(pin.id) ? 'view photo' : 'take photo'}` :
          `${pin.name}, ${checked.has(pin.id) ? (onToggle ? 'marked' : 'called') : (onToggle ? 'unmarked' : 'not called')}`}
        aria-pressed={onToggle ? checked.has(pin.id) : undefined}
        onClick={onHuntClick ? () => onHuntClick(pin) : onToggle ? () => onToggle(pin.id) : undefined}>
        <span className="pingo-cell-number">{index + 1}</span>
        {huntPhotos?.get(pin.id) ? <HuntPhotoCard pin={pin} photo={huntPhotos.get(pin.id)!} /> :
          <PinCard pin={pin} feed={feed} />}
        {checked.has(pin.id) && <svg className="pingo-check" viewBox="0 0 100 100"
          preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M9 10 L91 90 M91 10 L9 90" />
        </svg>}
      </Box>
    </Tooltip>)}
  </Box></Box>;
}

async function apiJson(response: Response): Promise<Record<string, unknown>> {
  recordPingoResponse(response.status);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    recordPingoResponse(503);
    throw new Error(`Pingo service is temporarily unavailable (HTTP ${response.status}). Please try again.`);
  }
  try { return await response.json() as Record<string, unknown>; }
  catch {
    recordPingoResponse(503);
    throw new Error(`Pingo service returned an invalid response (HTTP ${response.status}). Please try again.`);
  }
}

const gameProofCache = new Map<string, { password: string; proof: Promise<string> }>();

async function adminCredential(game: string, password: string): Promise<string> {
  if (!isNewGameCode(game)) return password;
  const cached = gameProofCache.get(game);
  if (cached?.password === password) return cached.proof;
  const proof = (async () => {
    const response = await fetch(`/api/pingo/salt?${new URLSearchParams({ game })}`, { cache: 'no-store' });
    const result = await apiJson(response);
    if (!response.ok) throw new Error(String(result.error ?? `Request failed: ${response.status}`));
    if (typeof result.salt !== 'string' || !/^[0-9a-f]{32}$/i.test(result.salt)) {
      throw new Error('Game password salt is unavailable.');
    }
    return gamePasswordHash(password, result.salt);
  })();
  gameProofCache.set(game, { password, proof });
  try { return await proof; }
  catch (error) {
    if (gameProofCache.get(game)?.proof === proof) gameProofCache.delete(game);
    throw error;
  }
}

async function postAdmin(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/pingo/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store'
  });
  const result = await apiJson(response);
  if (!response.ok) throw new Error(String(result.error ?? `Request failed: ${response.status}`));
  return result;
}

type ListedGame = { gameCode: string; startMs: number; intervalMs: number;
  poolSize: number; scavengerHuntOnly?: boolean };

export function HomePage({ navigate }: { navigate: (path: string) => void }) {
  const [games, setGames] = useState<ListedGame[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/pingo/games', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json() as { games?: ListedGame[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Games could not be loaded.');
        return result.games ?? [];
      })
      .then(result => { if (active) { setGames(result); setLoading(false); } })
      .catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : 'Games could not be loaded.'); setLoading(false); } });
    return () => { active = false; };
  }, []);
  return <Stack spacing={2}>
    <Typography variant="h3" component="h1">Join a Pingo game</Typography>
    {loading && <Typography>Loading games…</Typography>}
    {error && <Typography role="alert" color="error">{error}</Typography>}
    {!loading && !error && !games.length && <Typography>No games are available yet.</Typography>}
    {games.map(game => <Paper key={game.gameCode} variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="h5">Game {game.gameCode}</Typography>
        <Typography>{game.poolSize} possible pins · one pin every {game.intervalMs / 1_000}s ·
          started {new Date(game.startMs).toLocaleString()}</Typography>
        {game.scavengerHuntOnly && <Typography variant="body2">Scavenger Hunt Only</Typography>}
        <Stack direction="row" spacing={1}>
          {!game.scavengerHuntOnly && <Button variant="contained"
            onClick={() => navigate(`/join/${game.gameCode}`)}>Join game</Button>}
          <Button variant={game.scavengerHuntOnly ? 'contained' : 'outlined'}
            onClick={() => navigate(`/scavenger/${game.gameCode.split('-')[0]}`)}>Scavenger hunt</Button>
        </Stack>
      </Stack>
    </Paper>)}
  </Stack>;
}

export function JoinPage({ game, navigate }: { game: string; navigate: (path: string) => void }) {
  const attempted = useRef(false);
  const [error, setError] = useState('');
  const createBoard = async () => {
    setError('');
    try {
      const modeResponse = await fetch(`/api/pingo/game-mode?${new URLSearchParams({ game })}`,
        { cache: 'no-store' });
      const mode = await apiJson(modeResponse) as { game?: string; scavengerHuntOnly?: boolean; error?: string };
      if (!modeResponse.ok) throw new Error(mode.error ?? 'Game settings could not be loaded.');
      const resolvedGame = mode.game;
      if (!validGameCode(resolvedGame) || resolvedGame.split('-')[0] !== game.split('-')[0]) {
        throw new Error('Game settings returned an invalid code.');
      }
      if (mode.scavengerHuntOnly) { navigate(`/scavenger/${resolvedGame}`); return; }
      if (!isNewGameCode(resolvedGame)) {
        navigate(`/${makeCode()}?${new URLSearchParams({ game: resolvedGame })}`);
        return;
      }
      const result = await postAdmin('board', { game: resolvedGame });
      if (typeof result.board !== 'string' || !isBoardCodeForGame(result.board, resolvedGame)) {
        throw new Error('Board creation returned an invalid code.');
      }
      navigate(`/${result.board}?game=${resolvedGame}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Board could not be created.');
    }
  };
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void createBoard();
  }, [game]);
  return <Stack spacing={2}>
    <Typography variant="h3" component="h1">Joining game {game}</Typography>
    <Typography>{error || 'Creating your board…'}</Typography>
    {error && <Button variant="contained" onClick={() => void createBoard()}>Try again</Button>}
  </Stack>;
}

export function ManageLoginPage({ initialGame = '', navigate }:
  { initialGame?: string; navigate: (path: string) => void }) {
  const [gameEntry, setGameEntry] = useState(initialGame);
  const [sitePassword, setSitePassword] = useState('');
  const [gamePassword, setGamePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const login = async () => {
    const game = normalizeCode(gameEntry);
    if (!validGameCode(game)) { setError('Enter a valid game code.'); return; }
    setBusy(true);
    setError('');
    try {
      const modeResponse = await fetch(`/api/pingo/game-mode?${new URLSearchParams({ game })}`,
        { cache: 'no-store' });
      const mode = await apiJson(modeResponse) as { game?: string; error?: string };
      if (!modeResponse.ok) throw new Error(mode.error ?? 'Game settings could not be loaded.');
      const resolvedGame = mode.game;
      if (!validGameCode(resolvedGame) || resolvedGame.split('-')[0] !== game.split('-')[0]) {
        throw new Error('Game settings returned an invalid code.');
      }
      const credential = await adminCredential(resolvedGame, gamePassword);
      const result = await postAdmin('manage-login', { game: resolvedGame, sitePassword,
        ...(isNewGameCode(resolvedGame) ? { passwordProof: credential } : { gamePassword: credential }) });
      if (result.game !== resolvedGame) throw new Error('Game login returned an invalid code.');
      adminPasswordMemory.set(resolvedGame, gamePassword);
      try { window.sessionStorage.setItem(isNewGameCode(resolvedGame) ?
        `${ADMIN_SESSION_KEY}${resolvedGame}` : LEGACY_ADMIN_SESSION_KEY, gamePassword); }
      catch { /* The admin page remains available while this tab stays open. */ }
      setSitePassword('');
      setGamePassword('');
      navigate(`/${resolvedGame}/admin`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open game admin.');
    } finally { setBusy(false); }
  };
  return <Stack spacing={2} sx={{ maxWidth: 520 }}>
    <Typography variant="h3" component="h1">Manage game</Typography>
    <Typography>Enter the game code and both admin passwords to open its admin page.</Typography>
    <Box component="form" onSubmit={event => { event.preventDefault(); void login(); }}>
      <Stack spacing={2}>
        <TextField label="Game code" value={gameEntry} autoComplete="off"
          slotProps={{ htmlInput: { maxLength: MAX_GAME_CODE_LENGTH } }}
          helperText="For a new game, the six characters before the hyphen are enough."
          onChange={event => setGameEntry(event.target.value.toUpperCase())} />
        <TextField label="System admin password" type="password" value={sitePassword}
          onChange={event => setSitePassword(event.target.value)} />
        <TextField label="Game admin password" type="password" value={gamePassword}
          onChange={event => setGamePassword(event.target.value)}
          helperText="For older games, enter the system admin password here too." />
        <Button type="submit" variant="contained" disabled={busy || !gameEntry.trim() ||
          !sitePassword || !gamePassword} sx={{ alignSelf: 'flex-start' }}>
          {busy ? 'Checking…' : 'Open game admin'}
        </Button>
        {error && <Typography role="alert" color="error">{error}</Typography>}
      </Stack>
    </Box>
    <Button variant="text" onClick={() => navigate('/go')} sx={{ alignSelf: 'flex-start' }}>
      Create and run a new game
    </Button>
  </Stack>;
}

async function copy(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

function PlayerBoard({ board, feed, code, gameCode }:
  { board: Pin[]; feed: PinCollectionData; code: string; gameCode: string }) {
  const storageKey = gameCode ? `pingo:board:${code}:game:${gameCode}:marked` : `pingo:board:${code}:marked`;
  const [markedIds, setMarkedIds] = useState<Set<number>>(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
      const boardIds = new Set(board.map(pin => pin.id));
      return new Set(Array.isArray(saved) ? saved.filter((id): id is number =>
        typeof id === 'number' && boardIds.has(id)) : []);
    } catch { return new Set<number>(); }
  });
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify([...markedIds])); }
    catch { /* The board remains playable when browser storage is unavailable. */ }
  }, [storageKey, markedIds]);
  const togglePin = (pinId: number) => setMarkedIds(previous => {
    const next = new Set(previous);
    if (next.has(pinId)) next.delete(pinId);
    else next.add(pinId);
    return next;
  });
  return <BoardGrid board={board} feed={feed} checked={markedIds} onToggle={togglePin} />;
}

export function BoardPage({ code, initialGame, assignedHunt = false, pins, feed, navigate, onHuntModeChange }:
  { code: string; pins: Pin[]; feed: PinCollectionData; navigate: (path: string) => void;
    onHuntModeChange: (active: boolean) => void; initialGame?: string; assignedHunt?: boolean }) {
  const [initialPlayer] = useState(() => savedPlayer(code));
  const [gameEntry, setGameEntry] = useState(initialGame ?? initialPlayer.gameCode);
  const [playerName, setPlayerName] = useState(initialPlayer.playerName);
  const registrationId = initialPlayer.registrationId;
  const [playerEdited, setPlayerEdited] = useState(false);
  const [message, setMessage] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [registered, setRegistered] = useState(() => !isNewGameCode(initialGame ?? ''));
  const [startedAt] = useState(() => boardStartedAt(code));
  const [huntMode, setHuntMode] = useState(() => {
    if (assignedHunt) return true;
    try { return window.localStorage.getItem(`pingo:board:${code}:huntMode`) === 'true'; }
    catch { return false; }
  });
  const [enterHunt, setEnterHunt] = useState(false);
  const [shareQr, setShareQr] = useState<'board' | 'join' | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [previewPin, setPreviewPin] = useState<Pin | null>(null);
  const [replacingPin, setReplacingPin] = useState<Pin | null>(null);
  const [photos, setPhotos] = useState<Map<number, HuntPhoto>>(new Map());
  const [photosLoading, setPhotosLoading] = useState(huntMode);
  const board = useMemo(() => boardPins(code, pins), [code, pins]);
  const gameCode = normalizeCode(gameEntry);
  const startMs = gameStartFromCode(gameCode);
  useEffect(() => {
    if (!isNewGameCode(initialGame ?? '')) return;
    let active = true;
    const params = new URLSearchParams({ game: initialGame!, board: code });
    fetch(`/api/pingo/board?${params}`, { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error ?? 'Board is not registered for this game.');
        }
        const result = await response.json() as { scavengerHuntOnly?: boolean };
        if (active) {
          if (result.scavengerHuntOnly) {
            setHuntMode(true);
            try { window.localStorage.setItem(`pingo:board:${code}:huntMode`, 'true'); }
            catch { /* The board remains in scavenger mode for this visit. */ }
          }
          setRegistered(true);
        }
      })
      .catch(cause => { if (active) setRegistrationError(cause instanceof Error ? cause.message : 'Board could not be checked.'); });
    return () => { active = false; };
  }, [code, initialGame]);
  useEffect(() => {
    try {
      window.localStorage.setItem(`pingo:board:${code}:game`, gameCode);
      window.localStorage.setItem(`pingo:player:${code}`, JSON.stringify({
        registrationId, boardId: code, gameCode, playerName
      }));
    }
    catch { /* The board remains playable when browser storage is unavailable. */ }
  }, [code, gameCode, playerName, registrationId]);
  useEffect(() => {
    if (!playerEdited || startMs === null || !playerName.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/player', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationId, boardId: code, gameCode, playerName: playerName.trim() }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Player details could not be saved.');
      } catch (cause) {
        if (!controller.signal.aborted) setMessage(cause instanceof Error ? cause.message : 'Player details could not be saved.');
      }
    }, 3_000);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [code, gameCode, playerName, playerEdited, startMs, registrationId]);
  useEffect(() => { onHuntModeChange(huntMode); }, [huntMode, onHuntModeChange]);
  useEffect(() => {
    if (!huntMode) return;
    let active = true;
    setPhotosLoading(true);
    loadBoardPhotos(code).then(saved => {
      if (active) {
        setPhotos(previous => {
          const next = new Map(saved.filter(photo => photoIsValid(photo, startedAt))
            .map(photo => [photo.pinId, photo] as const));
          for (const [id, photo] of previous) {
            if (!next.has(id) || photo.capturedAt >= next.get(id)!.capturedAt) next.set(id, photo);
          }
          return next;
        });
        setPhotosLoading(false);
      }
    }).catch(cause => {
      if (active) {
        setPhotosLoading(false);
        setMessage(cause instanceof Error ? cause.message : 'Saved photos could not be loaded.');
      }
    });
    return () => { active = false; };
  }, [code, huntMode, startedAt]);

  const choosePin = (pin: Pin) => {
    if (photosLoading) return;
    if (photos.has(pin.id)) setPreviewPin(pin);
    else setSelectedPin(pin);
  };
  const savePhoto = async (blob: Blob, capturedAt: number) => {
    if (!selectedPin || capturedAt < startedAt) {
      throw new Error('Only photos taken after this board was generated are valid.');
    }
    const photo = await saveBoardPhoto(code, selectedPin.id, capturedAt, blob);
    setPhotos(previous => new Map(previous).set(selectedPin.id, photo));
    setMessage(`Photo saved for ${selectedPin.name}.`);
  };
  const newBoard = () => navigate(huntMode && startMs !== null ?
    `/scavenger/${gameCode.split('-')[0]}` :
    isNewGameCode(gameCode) ? `/join/${gameCode}` : `/${makeCode()}?game=${gameCode}`);
  const boardLink = startMs !== null ? new URL(`/${code}?${new URLSearchParams({
    game: gameCode, ...(huntMode ? { hunt: '1' } : {})
  })}`, window.location.origin).href : '';
  const gameJoinLink = startMs !== null ? new URL(huntMode ?
    `/scavenger/${gameCode.split('-')[0]}` : `/join/${gameCode}`, window.location.origin).href : '';
  const shownQrLink = shareQr === 'board' ? boardLink : gameJoinLink;
  if (registrationError) return <Typography role="alert" color="error">{registrationError}</Typography>;
  if (!registered) return <Typography>Checking board registration…</Typography>;
  return <Stack spacing={2}>
    <Box>
      <Box className="pingo-board-heading">
        <Typography variant="h3" component="h1">Pingo Board {code}{huntMode ? ' - Scavenger Hunt!' : ''}</Typography>
        {huntMode && <Button variant="outlined" onClick={newBoard}>New board</Button>}
      </Box>
      <Typography>{huntMode ? SCAVENGER_DESCRIPTION :
        'Your Pingo board has 25 pins. Share this link to show the same board.'}</Typography>
      <Typography>{huntMode ? 'Tap a pin to take its photo. Tap a saved photo to view it. Photos stay on this device.' :
        'Click a pin to mark it with a red X. Click it again to remove the X.'}</Typography>
      {huntMode && startMs !== null && <GameInfoDetails game={gameCode} />}
      {!huntMode && startMs !== null && <GameStartTime startMs={startMs} game={gameCode} />}
    </Box>
    {startMs !== null && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}
      sx={{ alignItems: { sm: 'center' } }}>
      <Button variant="outlined" onClick={() => setShareQr('board')}>Board check link</Button>
      <Button variant="outlined" onClick={() => setShareQr('join')}>Share to join game</Button>
    </Stack>}
    {!huntMode && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        <Button variant="outlined" onClick={() => copy(window.location.href).then(() => setMessage('Board link copied.')).catch(() => setMessage('Copy failed.'))}>Copy board link</Button>
        <Button variant="outlined" onClick={() => setEnterHunt(true)}>Scavenger hunt Mode</Button>
        <Button variant="outlined" onClick={newBoard}>New board</Button>
    </Stack>}
    {!huntMode && <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
        <TextField label="Game code" value={gameEntry}
          onChange={event => { if (!isNewGameCode(initialGame ?? '')) { setGameEntry(event.target.value.toUpperCase()); setPlayerEdited(true); } }}
          slotProps={{ htmlInput: { maxLength: MAX_GAME_CODE_LENGTH,
            readOnly: isNewGameCode(initialGame ?? '') } }}
          size="small" sx={{ width: { xs: '100%', sm: 190 }, flexShrink: 0 }}
          helperText={isNewGameCode(initialGame ?? '') ? 'This board belongs to this game.' : "Enter the caller's game code."} />
        <TextField label="Player name" value={playerName}
          onChange={event => { setPlayerName(event.target.value); setPlayerEdited(true); }}
          slotProps={{ htmlInput: { maxLength: 80 } }} size="small" sx={{ width: { xs: '100%', sm: 320 } }} />
      </Stack>
    </Paper>}
    {huntMode ? <BoardGrid board={board} feed={feed} huntPhotos={photos} onHuntClick={choosePin} /> :
      <PlayerBoard key={startMs === null ? 'no-game' : gameCode}
      board={board} feed={feed} code={code} gameCode={startMs === null ? '' : gameCode} />
    }
    <Typography role="status" variant="body2">{photosLoading ? 'Loading saved photos…' : message}</Typography>
    <Dialog open={shareQr !== null} onClose={() => setShareQr(null)}
      aria-labelledby="pingo-share-qr-title" maxWidth="xs" fullWidth>
      <DialogTitle id="pingo-share-qr-title">{shareQr === 'board' ? 'Board check link' : 'Share to join game'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Typography>{shareQr === 'board' ? `Scan to open board ${code}.` :
            `Scan to join game ${gameCode} and create your own board.`}</Typography>
          {shownQrLink && <Box role="img" aria-label={shareQr === 'board' ?
            `QR code for board ${code}` : `QR code to join game ${gameCode}`}
            sx={{ width: '100%', maxWidth: 280, p: 1, bgcolor: 'white' }}>
            <QRCode value={shownQrLink} size={256} style={{ width: '100%', height: 'auto' }} />
          </Box>}
          {shownQrLink && <Typography component="a" href={shownQrLink}
            sx={{ overflowWrap: 'anywhere' }}>{shownQrLink}</Typography>}
          {shareQr === 'board' && huntMode && <Typography variant="body2">
            Photos remain on the device where they were taken.
          </Typography>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={() => setShareQr(null)}>Close</Button></DialogActions>
    </Dialog>
    <Dialog open={enterHunt} onClose={() => setEnterHunt(false)}>
      <DialogTitle>Scavenger hunt Mode</DialogTitle>
      <DialogContent>
        <Typography>{SCAVENGER_DESCRIPTION}</Typography>
        <Typography sx={{ mt: 1 }}>Only photos taken after your board is generated will be valid. Tap a pin to take its photo with your device's camera.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEnterHunt(false)}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={() => {
          setPhotosLoading(true);
          setHuntMode(true);
          try { window.localStorage.setItem(`pingo:board:${code}:huntMode`, 'true'); }
          catch { setMessage('Scavenger Hunt will reset when this browser is closed.'); }
          setEnterHunt(false);
        }}>OK</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={!!previewPin} onClose={() => setPreviewPin(null)}
      maxWidth="lg" fullWidth aria-labelledby="pingo-hunt-preview-title">
      <DialogTitle id="pingo-hunt-preview-title">Photo of {previewPin?.name}</DialogTitle>
      <DialogContent className="pingo-hunt-preview">
        {previewPin && photos.has(previewPin.id) &&
          <HuntPhotoPreview pin={previewPin} photo={photos.get(previewPin.id)!} />}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="secondary" onClick={() => setPreviewPin(null)}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={() => {
          setReplacingPin(previewPin);
          setPreviewPin(null);
        }}>OK</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={!!replacingPin} onClose={() => setReplacingPin(null)}>
      <DialogTitle>Replace photo</DialogTitle>
      <DialogContent>This will replace the current photo for {replacingPin?.name}</DialogContent>
      <DialogActions>
        <Button onClick={() => setReplacingPin(null)}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={() => { setSelectedPin(replacingPin); setReplacingPin(null); }}>OK</Button>
      </DialogActions>
    </Dialog>
    {selectedPin && <HuntCaptureDialog key={selectedPin.id} pin={selectedPin}
      startedAt={startedAt} onClose={() => setSelectedPin(null)} onSave={savePhoto} />}
  </Stack>;
}

type ScavengerAssignment = {
  gameCode: string; boardId: string; nickname: string; createdAt: number; existing: boolean;
};

export function ScavengerJoinPage({ game, navigate }:
  { game: string; navigate: (path: string) => void }) {
  const [nickname, setNickname] = useState(() => {
    try { return window.localStorage.getItem(`pingo:scavenger:nickname:${game}`) ?? ''; }
    catch { return ''; }
  });
  const [assignment, setAssignment] = useState<ScavengerAssignment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const openBoard = (result: ScavengerAssignment) => {
    try {
      window.localStorage.setItem(`pingo:board:${result.boardId}:createdAt`, String(result.createdAt));
      window.localStorage.setItem(`pingo:board:${result.boardId}:huntMode`, 'true');
      window.localStorage.setItem(`pingo:board:${result.boardId}:game`, result.gameCode);
      window.localStorage.setItem(`pingo:player:${result.boardId}`, JSON.stringify({
        registrationId: newRegistrationId(), boardId: result.boardId,
        gameCode: result.gameCode, playerName: result.nickname
      }));
    } catch {
      setError('Browser storage is required to keep your scavenger board and photos.');
      return;
    }
    navigate(`/${result.boardId}?game=${result.gameCode}&hunt=1`);
  };

  const join = async () => {
    const name = nickname.trim();
    if (!name) { setError('Enter a nickname to join.'); return; }
    setBusy(true);
    setError('');
    try {
      let deviceId = window.localStorage.getItem(SCAVENGER_DEVICE_KEY);
      if (!deviceId) {
        deviceId = newRegistrationId();
        window.localStorage.setItem(SCAVENGER_DEVICE_KEY, deviceId);
      }
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timeZone) throw new Error('Your local time zone is unavailable.');
      const response = await fetch('/api/pingo/scavenger', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: game, deviceId, nickname: name, timeZone }), cache: 'no-store'
      });
      const result = await response.json() as ScavengerAssignment & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not create your board.');
      if (!validGameCode(result.gameCode) ||
        result.gameCode.split('-')[0] !== game.split('-')[0] ||
        !isBoardCodeForGame(result.boardId, result.gameCode) ||
        !Number.isSafeInteger(result.createdAt)) throw new Error('Invalid board assignment.');
      window.localStorage.setItem(`pingo:scavenger:nickname:${game}`, result.nickname);
      setAssignment(result);
      if (!result.existing) openBoard(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your board.');
    } finally { setBusy(false); }
  };

  return <Stack spacing={2} sx={{ maxWidth: 520 }}>
    <Typography variant="h3" component="h1">Game {game} scavenger hunt</Typography>
    <Typography>{SCAVENGER_DESCRIPTION}</Typography>
    <GameInfoDetails game={game} />
    <Typography>Enter a nickname to get your scavenger hunt board.</Typography>
    <TextField label="Nickname" value={nickname} slotProps={{ htmlInput: { maxLength: 80 } }}
      onChange={event => setNickname(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter') void join(); }} />
    <Button variant="contained" color="primary" disabled={busy || !nickname.trim()}
      onClick={() => void join()}>{busy ? 'Finding your board…' : 'Get scavenger board'}</Button>
    {assignment?.existing && <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography role="status">a maximum of one board may be generated per day for this game.</Typography>
        <Typography>Your board is {assignment.boardId}.</Typography>
        <Button variant="contained" color="primary" onClick={() => openBoard(assignment)}>
          Open existing board
        </Button>
      </Stack>
    </Paper>}
    {error && <Typography role="alert" color="error">{error}</Typography>}
  </Stack>;
}

function VerifyPage({ game, boardCode, pins, feed }:
  { game: string; boardCode: string; pins: Pin[]; feed: PinCollectionData }) {
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);
  const board = useMemo(() => boardPins(boardCode, pins), [boardCode, pins]);
  const startMs = gameStartFromCode(game);
  const override = window.location.search;
  useEffect(() => {
    let live = true;
    let inFlight = false;
    let paused = false;
    const refresh = async () => {
      if (paused || inFlight || (!override && document.hidden)) return;
      const reservation = reservePingoPoll(`verify:${game}:${boardCode}`, drawIntervalFromGameCode(game));
      if (!reservation.allowed) {
        if (reservation.reason !== 'spacing') {
          paused = true;
          if (live) setError(adminRequestWaitMessage(reservation));
        }
        return;
      }
      inFlight = true;
      const params = new URLSearchParams(override);
      params.set('game', game);
      params.set('board', boardCode);
      try {
        const response = await fetch(`/api/pingo/verify?${params}`, { cache: 'no-store' });
        const data = await apiJson(response) as Verification & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Verification failed.');
        if (live) { setResult(data); setError(''); }
      } catch (cause) {
        paused = true;
        if (live) setError(cause instanceof Error ? cause.message : 'Verification failed.');
      } finally { inFlight = false; }
    };
    void refresh();
    const interval = override ? undefined : window.setInterval(refresh, drawIntervalFromGameCode(game));
    return () => { live = false; if (interval) window.clearInterval(interval); };
  }, [game, boardCode, override, retryNonce]);
  return <Stack spacing={2}>
    <Typography variant="h4" component="h1">Verify Pingo board {boardCode}</Typography>
    <Typography>Game {game} · {result ? `${result.count} pins called` : 'Checking calls…'}</Typography>
    {startMs !== null && <GameStartTime startMs={startMs} game={game} />}
    {result?.winningLines.length ? <Paper className="pingo-winner" role="status">
      <Typography variant="h5">Pingo! {result.winningLines.length} complete {result.winningLines.length === 1 ? 'line' : 'lines'}.</Typography>
    </Paper> : <Typography role="status">{error || (result ? 'No complete row or column yet.' : '')}</Typography>}
    {error && <Button variant="outlined" onClick={() => setRetryNonce(previous => previous + 1)}
      sx={{ alignSelf: 'flex-start' }}>Retry verification</Button>}
    <BoardGrid board={board} feed={feed} checked={new Set(result?.matchedIds ?? [])} winning={result?.winningLines ?? []} />
    <Typography variant="body2">{override ? 'This link is a snapshot of the signed pin count.' :
      `This board updates as each ${drawIntervalFromGameCode(game) / 1_000}-second interval passes.`}</Typography>
  </Stack>;
}

export function AdminPage({ game, pins, feed, onGameStarted, onCallerSnapshot, navigate, view = 'caller' }:
  { game: string; pins: Pin[]; feed: PinCollectionData; onGameStarted: (game: string) => void;
    onCallerSnapshot?: (snapshot: CallerSnapshot | null) => void;
    navigate: (path: string, replace?: boolean) => void; view?: 'caller' | 'admin' }) {
  const [rememberedPassword] = useState(() => rememberedAdminPassword(game));
  const [password, setPassword] = useState(rememberedPassword);
  const [gamePassword, setGamePassword] = useState('');
  const [activePassword, setActivePassword] = useState('');
  const autoUnlockAttempted = useRef(false);
  const unlockRetryTimer = useRef<number | undefined>(undefined);
  const rolloverAttempted = useRef(false);
  const advanceInFlight = useRef(false);
  const playersInFlight = useRef(false);
  const playersPollingPaused = useRef(false);
  const [data, setData] = useState<AdminData | null>(null);
  const loadedInfoGame = useRef('');
  const [infoUrl, setInfoUrl] = useState('');
  const [tooltipText, setTooltipText] = useState('');
  const [infoStatus, setInfoStatus] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [boardEntry, setBoardEntry] = useState('');
  const [gameEntry, setGameEntry] = useState(game);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);
  const [poolSize, setPoolSize] = useState(Math.min(DEFAULT_POOL_SIZE, Math.floor(pins.length / 25) * 25));
  const [scavengerHuntOnly, setScavengerHuntOnly] = useState(false);
  const [callerAccess, setCallerAccess] = useState<'checking' | 'ready' | 'error'>(() =>
    view !== 'caller' || !game || !isNewGameCode(game) ? 'ready' : 'checking');
  const [callerLookupAttempt, setCallerLookupAttempt] = useState(0);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [playersError, setPlayersError] = useState('');
  const pinById = useMemo(() => new Map(pins.map(pin => [pin.id, pin])), [pins]);

  useEffect(() => {
    if (callerAccess !== 'checking') return;
    let active = true;
    fetch(`/api/pingo/game-mode?${new URLSearchParams({ game })}`, { cache: 'no-store' })
      .then(async response => {
        const result = await apiJson(response) as { scavengerHuntOnly?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Game settings could not be loaded.');
        if (!active) return;
        if (result.scavengerHuntOnly) navigate(`/${game}/admin`, true);
        else setCallerAccess('ready');
      }).catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Game settings could not be loaded.');
          setCallerAccess('error');
        }
      });
    return () => { active = false; };
  }, [callerAccess, callerLookupAttempt, game, navigate]);

  useEffect(() => {
    if (view !== 'caller') return;
    onCallerSnapshot?.(data && !data.scavengerHuntOnly ?
      { game: data.game, pin: data.pin, at: data.at } : null);
  }, [view, data?.game, data?.pin, data?.at, data?.scavengerHuntOnly, onCallerSnapshot]);

  const refreshPlayers = async (secret: string) => {
    if (playersInFlight.current) return;
    const targetGame = data?.game ?? game;
    const reservation = reservePingoPoll(`players:${targetGame}`, 10_000);
    if (!reservation.allowed) {
      if (reservation.reason !== 'spacing') {
        playersPollingPaused.current = true;
        setPlayersError(adminRequestWaitMessage(reservation));
      }
      return;
    }
    playersInFlight.current = true;
    try {
      const credential = await adminCredential(targetGame, secret);
      const response = await fetch(isNewGameCode(targetGame) ?
        `/player?${new URLSearchParams({ game: targetGame })}` : '/player', {
        headers: { Authorization: `Bearer ${credential}` }, cache: 'no-store'
      });
      const result = await apiJson(response) as { players?: PlayerRecord[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Player list failed.');
      setPlayers(result.players ?? []);
      setPlayersError('');
    } catch (cause) {
      playersPollingPaused.current = true;
      setPlayersError(cause instanceof Error ? cause.message : 'Player list failed.');
    } finally { playersInFlight.current = false; }
  };

  const update = async (secret: string, targetGame: string, pin?: number, at?: number, automatic = false) => {
    const reservation = reserveAdminRequest(targetGame);
    if (!reservation.allowed) {
      if (automatic && reservation.reason === 'spacing') return false;
      setError(adminRequestWaitMessage(reservation));
      setAutoAdvancePaused(true);
      return false;
    }
    setBusy(true);
    try {
      const credential = await adminCredential(targetGame, secret);
      const next = await postAdmin('admin', { game: targetGame, pin, at,
        ...(isNewGameCode(targetGame) ? { passwordProof: credential } : { password: credential }) }) as AdminData;
      if (!next.scavengerHuntOnly &&
        (!/^[0-9a-f]{64}$/i.test(next.signingKey) || !Array.isArray(next.drawKeys))) {
        throw new Error('Caller draw data is unavailable. Please reload the page.');
      }
      const poolIds = pins.slice(0, next.poolSize ?? pins.length).map(pin => pin.id);
      const allIds = next.scavengerHuntOnly ? [] :
        await drawIdsFromBatchKeys(next.drawKeys, poolIds, poolIds.length);
      if (!next.scavengerHuntOnly && next.ids.some((id, index) => allIds[index] !== id)) {
        throw new Error('Caller draw data does not match the game. Please reload the page.');
      }
      if (view === 'caller' && next.scavengerHuntOnly) {
        navigate(`/${targetGame}/admin`, true);
        return true;
      }
      setData({ ...next, ids: allIds });
      if (view === 'admin' && loadedInfoGame.current !== next.game) {
        loadedInfoGame.current = next.game;
        setInfoUrl(next.infoUrl ?? '');
        setTooltipText(next.tooltipText ?? '');
        setInfoStatus('');
      }
      setError('');
      setAutoAdvancePaused(false);
      const params = new URLSearchParams({ pin: String(next.pin), at: String(next.at) });
      window.history.replaceState(null, '', `/${targetGame}/${view === 'admin' ? 'admin' : 'go'}?${params}`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Caller request failed.');
      setAutoAdvancePaused(true);
      return false;
    } finally { setBusy(false); }
  };

  const unlock = async (secret = password, autoResume = false) => {
    if (!secret) return;
    if (!autoResume && unlockRetryTimer.current !== undefined) {
      window.clearTimeout(unlockRetryTimer.current);
      unlockRetryTimer.current = undefined;
    }
    setBusy(true);
    try {
      let targetGame = game || (view === 'admin' ? normalizeCode(gameEntry) : '');
      let callerPassword = secret;
      if (!targetGame) {
        if (view === 'admin') throw new Error('Enter a game code.');
        if (!gamePassword) throw new Error('Choose a game admin password.');
        if (gamePassword.length < 4 || gamePassword.length > 128 || /[\x00-\x1f\x7f]/.test(gamePassword)) {
          throw new Error('Game admin password must be 4–128 characters without control characters.');
        }
        const { salt, hash } = await hashGamePassword(gamePassword);
        const created = await postAdmin('create', {
          password: secret, passwordSalt: salt, passwordHash: hash, intervalSeconds, poolSize,
          scavengerHuntOnly,
        });
        if (!validGameCode(created.game)) throw new Error('Game creation returned an invalid code.');
        targetGame = created.game;
        callerPassword = gamePassword;
        gameProofCache.set(targetGame, { password: gamePassword, proof: Promise.resolve(hash) });
        onGameStarted(targetGame);
        if (created.scavengerHuntOnly === true) {
          adminPasswordMemory.set(targetGame, gamePassword);
          try { window.sessionStorage.setItem(`${ADMIN_SESSION_KEY}${targetGame}`, gamePassword); }
          catch { /* The password remains available while this tab stays open. */ }
          navigate(`/${targetGame}/admin`, true);
          return;
        }
        window.history.replaceState(null, '', `/${targetGame}/go`);
      }
      if (!validGameCode(targetGame)) throw new Error('Enter a valid game code.');
      if (autoResume) {
        const availability = adminRequestAvailability(targetGame);
        if (!availability.allowed && availability.reason === 'spacing') {
          unlockRetryTimer.current = window.setTimeout(() => {
            unlockRetryTimer.current = undefined;
            void unlock(secret, true);
          }, availability.waitMs + 50);
          return;
        }
      }
      const params = new URLSearchParams(window.location.search);
      const requested = params.has('pin') ? Number(params.get('pin')) : undefined;
      const at = params.has('at') ? Number(params.get('at')) : undefined;
      if (await update(callerPassword, targetGame, requested, at)) {
        setActivePassword(callerPassword);
        adminPasswordMemory.set(targetGame, callerPassword);
        try { window.sessionStorage.setItem(isNewGameCode(targetGame) ?
          `${ADMIN_SESSION_KEY}${targetGame}` : LEGACY_ADMIN_SESSION_KEY, callerPassword); }
        catch { /* Caller remains usable when browser storage is unavailable. */ }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start game.');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (game && rememberedPassword && callerAccess === 'ready' && !autoUnlockAttempted.current) {
      autoUnlockAttempted.current = true;
      void unlock(rememberedPassword, true);
    }
  }, [callerAccess, game, rememberedPassword]);

  useEffect(() => () => {
    if (unlockRetryTimer.current !== undefined) window.clearTimeout(unlockRetryTimer.current);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activePassword || view !== 'admin') return;
    playersPollingPaused.current = false;
    if (!document.hidden) void refreshPlayers(activePassword);
    const interval = window.setInterval(() => {
      if (!playersPollingPaused.current && !document.hidden) void refreshPlayers(activePassword);
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [activePassword, view]);

  useEffect(() => {
    if (!data || data.scavengerHuntOnly || busy || autoAdvancePaused || !activePassword) return;
    const target = dueDraw(data, clock, pins.length);
    if (target) void advance(data, target.pin, target.at);
  }, [clock, data, busy, autoAdvancePaused, activePassword, pins.length]);

  const advance = async (current: AdminData, pin: number, at: number) => {
    if (advanceInFlight.current) return;
    advanceInFlight.current = true;
    setBusy(true);
    try {
      const sig = await signPinCount(current.signingKey, current.game, pin, at);
      setData({ ...current, pin, at, sig });
      setError('');
      setAutoAdvancePaused(false);
      const params = new URLSearchParams({ pin: String(pin), at: String(at) });
      window.history.replaceState(null, '', `/${current.game}/${view === 'admin' ? 'admin' : 'go'}?${params}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not advance the pin.');
      setAutoAdvancePaused(true);
    } finally {
      advanceInFlight.current = false;
      setBusy(false);
    }
  };

  const rollover = async (finished: AdminData, secret: string) => {
    if (rolloverAttempted.current) return;
    rolloverAttempted.current = true;
    const reservation = reserveRolloverRequest(finished.game);
    if (!reservation.allowed) {
      setError(adminRequestWaitMessage(reservation));
      return;
    }
    setBusy(true);
    try {
      const credential = await adminCredential(finished.game, secret);
      const result = await postAdmin('rollover', { game: finished.game,
        passwordProof: credential, pin: finished.pin, at: finished.at, sig: finished.sig });
      if (!validGameCode(result.game) || result.game === finished.game) {
        throw new Error('The new game code is invalid.');
      }
      const newGame = result.game;
      adminPasswordMemory.set(newGame, secret);
      gameProofCache.set(newGame, { password: secret, proof: Promise.resolve(credential) });
      try { window.sessionStorage.setItem(`${ADMIN_SESSION_KEY}${newGame}`, secret); }
      catch { /* Keep the password for this tab in memory. */ }
      onGameStarted(newGame);
      navigate(`/${newGame}/go`, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the next game.');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!data || data.scavengerHuntOnly || !activePassword || busy || view !== 'caller' ||
      data.pin < (data.poolSize ?? pins.length) ||
      clock < data.at + 5 * drawIntervalFromGameCode(data.game)) return;
    void rollover(data, activePassword);
  }, [clock, data, activePassword, busy, view, pins.length]);

  const next = () => {
    if (data && activePassword && !busy && data.pin < (data.poolSize ?? pins.length)) {
      void advance(data, data.pin + 1, Date.now());
    }
  };
  const saveInfo = async () => {
    if (!data || !activePassword) return;
    setSavingInfo(true);
    setInfoStatus('');
    try {
      const credential = await adminCredential(data.game, activePassword);
      const result = await postAdmin('game-info', { game: data.game, infoUrl, tooltipText,
        ...(isNewGameCode(data.game) ? { passwordProof: credential } : { password: credential }) });
      setInfoUrl(String(result.infoUrl ?? ''));
      setTooltipText(String(result.tooltipText ?? ''));
      setInfoStatus('Game information saved.');
    } catch (cause) {
      setInfoStatus(cause instanceof Error ? cause.message : 'Game information could not be saved.');
    } finally { setSavingInfo(false); }
  };
  const current = data?.ids[data.pin - 1];
  const poolLimit = data?.poolSize ?? pins.length;
  const concluded = !!data && data.pin >= poolLimit;
  const newGameSeconds = data ? Math.max(0,
    Math.ceil((data.at + 5 * drawIntervalFromGameCode(data.game) - clock) / 1_000)) : 0;
  const newGameCountdown = `${String(Math.floor(newGameSeconds / 60)).padStart(2, '0')}:${String(newGameSeconds % 60).padStart(2, '0')}`;
  const previous = data?.ids.slice(Math.max(0, data.pin - 6), Math.max(0, data.pin - 1)) ?? [];
  const seconds = data ? Math.max(0, Math.ceil((data.at + drawIntervalFromGameCode(data.game) - clock) / 1_000)) : intervalSeconds;
  const verifyLink = data && isBoardCodeForGame(normalizeCode(boardEntry), data.game) ?
    `${window.location.origin}/${data.game}/verify/${normalizeCode(boardEntry)}?${new URLSearchParams({ pin: String(data.pin), at: String(data.at), sig: data.sig })}` : '';
  const joinLink = data ? data.scavengerHuntOnly ?
    `${window.location.origin}/scavenger/${data.game.split('-')[0]}` :
    `${window.location.origin}/?game=${data.game}` : '';
  const shownGame = data?.game ?? game;
  const adminRequestGate = adminRequestAvailability(shownGame, clock);

  if (view === 'caller' && callerAccess !== 'ready') return <Stack spacing={2}>
    <Typography>{callerAccess === 'checking' ? 'Checking game settings…' : error}</Typography>
    {callerAccess === 'error' && <Button variant="outlined" onClick={() => {
      setError('');
      setCallerAccess('checking');
      setCallerLookupAttempt(previous => previous + 1);
    }}>Try again</Button>}
  </Stack>;

  return <Stack spacing={data && view === 'caller' ? 0 : 2}
    className={data && view === 'caller' ? 'pingo-caller-display' : undefined}>
    {data && view === 'caller' ? concluded ?
      <Typography variant="h3" component="h1">Game {data.game} concluded at {new Intl.DateTimeFormat(undefined,
        { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(data.at))}.
        {' '}New game starting in {newGameCountdown}</Typography> :
      <GameStartTime startMs={data.startMs} game={data.game} heading /> :
      <Typography variant="h3" component="h1">Pingo {view === 'admin' ? 'admin' : 'caller'}{shownGame ? ` · Game ${shownGame}` : ''}</Typography>}
    {data && view === 'caller' && error && <Paper variant="outlined" sx={{ p: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography role="alert" color="error">{error} {concluded ? 'Automatic game start is paused.' : 'Automatic draws are paused.'}</Typography>
        {concluded && !adminRequestGate.allowed &&
          <Typography variant="body2">{adminRequestWaitMessage(adminRequestGate)}</Typography>}
        <Button variant="outlined" onClick={() => {
          if (concluded) { rolloverAttempted.current = false; void rollover(data, activePassword); return; }
          const target = dueDraw(data, Date.now(), pins.length);
          if (target) void advance(data, target.pin, target.at);
        }} disabled={busy || (concluded && !adminRequestGate.allowed)}>
          {concluded ? 'Retry new game' : 'Retry draw'}
        </Button>
      </Stack>
    </Paper>}
    {view === 'admin' && data && !data.scavengerHuntOnly && <Button variant="outlined" component="a"
      href={`/${data.game}/go?${new URLSearchParams({ pin: String(data.pin), at: String(data.at) })}`}
      sx={{ alignSelf: 'flex-start' }}>Back to Caller page</Button>}
    {!shownGame && <Typography>{view === 'admin' ? 'Enter a game code and its admin password.' : 'Enter the site admin password and choose a password for this game.'}</Typography>}
    {!data ? <Paper variant="outlined" sx={{ p: 2, maxWidth: 520 }}>
      <Stack spacing={2}>
        <TextField label={view === 'caller' && !game ? 'Site admin password' :
          isNewGameCode(game) ? 'Game admin password' : 'Admin password'} type="password" value={password}
          onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void unlock(); }} />
        {view === 'admin' && !game && <TextField label="Game code" value={gameEntry}
          slotProps={{ htmlInput: { maxLength: MAX_GAME_CODE_LENGTH } }} onChange={event => setGameEntry(event.target.value.toUpperCase())} />}
        {view === 'caller' && !game && !scavengerHuntOnly && <TextField select label="Time between pin draws" value={intervalSeconds}
          onChange={event => setIntervalSeconds(Number(event.target.value))}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          helperText="Note: This can not be changed once a game is created.">
          {DRAW_INTERVAL_SECONDS.map(seconds => <option key={seconds} value={seconds}>{seconds}s</option>)}
        </TextField>}
        {view === 'caller' && !game && <TextField select label="Pins in candidate pool" value={poolSize}
          onChange={event => setPoolSize(Number(event.target.value))}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          helperText={scavengerHuntOnly ?
            'Hunt boards use the first N pins in the catalog. This cannot change after creation.' :
            'The board and caller use the first N pins in the catalog. This cannot change after creation.'}>
          {Array.from({ length: Math.floor(pins.length / 25) }, (_, index) => (index + 1) * 25)
            .map(size => <option key={size} value={size}>{size} pins</option>)}
        </TextField>}
        {view === 'caller' && !game && <TextField label="Game admin password" type="password"
          value={gamePassword} onChange={event => setGamePassword(event.target.value)} />}
        {view === 'caller' && !game && <FormControlLabel label="Scavenger Hunt Only"
          control={<Checkbox checked={scavengerHuntOnly}
            onChange={event => setScavengerHuntOnly(event.target.checked)} />} />}
        <Button variant="contained" onClick={() => void unlock()}
          disabled={busy || !password || !adminRequestGate.allowed ||
            (view === 'caller' && !game && gamePassword.length < 4)}>
          {game || view === 'admin' ? (view === 'admin' ? 'Open admin' : 'Open caller') : 'Create game'}
        </Button>
        <Typography role="alert" color="error">{error}</Typography>
        {!adminRequestGate.allowed && <Typography variant="body2">{adminRequestWaitMessage(adminRequestGate)}</Typography>}
      </Stack>
    </Paper> : <>
      {view === 'admin' && <><GameStartTime startMs={data.startMs} game={data.game} />
        {data.scavengerHuntOnly ? <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="h6">Scavenger Hunt Only</Typography>
            <Typography>Players can join this game and create a scavenger hunt board.</Typography>
            <Box role="img" aria-label={`QR code to join game ${data.game}`}
              sx={{ p: 1, bgcolor: 'white' }}><QRCode value={joinLink} size={220} /></Box>
            <Typography component="a" href={joinLink} sx={{ overflowWrap: 'anywhere' }}>{joinLink}</Typography>
          </Stack>
        </Paper> : <Typography>Pin {data.pin} of {poolLimit}</Typography>}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2} sx={{ maxWidth: 650 }}>
            <Typography variant="h6">Game information</Typography>
            <TextField label="Game information link" type="url" value={infoUrl}
              onChange={event => { setInfoUrl(event.target.value); setInfoStatus(''); }}
              slotProps={{ htmlInput: { maxLength: 2048 } }}
              helperText="HTTPS link shown on this game's scavenger hunt pages. Leave blank to hide it." />
            <TextField label="Game instructions" multiline minRows={3} value={tooltipText}
              onChange={event => { setTooltipText(event.target.value); setInfoStatus(''); }}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText="Shown on scavenger boards and in an info tooltip. Leave blank to hide it." />
            <Button variant="contained" onClick={() => void saveInfo()} disabled={savingInfo}
              sx={{ alignSelf: 'flex-start' }}>{savingInfo ? 'Saving…' : 'Save game information'}</Button>
            {infoStatus && <Typography role="status">{infoStatus}</Typography>}
          </Stack>
        </Paper></>}
      {view === 'caller' ? <><Box className="pingo-caller-layout">
      <Paper className="pingo-join-panel" variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Scan to join this game</Typography>
        <Box className="pingo-join-code-space">
          <Box className="pingo-join-code" role="img" aria-label={`QR code to join game ${data.game}`}>
            <QRCode value={joinLink} size={360} level="H" />
          </Box>
        </Box>
        <Typography variant="body2">Scan to get a new board when the page opens.</Typography>
        <Typography component="a" href={joinLink} className="pingo-join-link">{joinLink}</Typography>
      </Paper>
      <Paper className="pingo-recent-panel" variant="outlined" sx={{ p: 1 }}>
        <Typography variant="h6">Last five pins</Typography>
        <Box className="pingo-recent">{previous.length ? previous.map(id => {
          const pin = pinById.get(id);
          return pin ? <PinCard key={id} pin={pin} feed={feed} /> : null;
        }) : <Typography>First pin is on screen.</Typography>}</Box>
      </Paper>
      <Paper className="pingo-current" variant="outlined">
        <Typography variant="h6">Current pin ({data.pin} of {poolLimit})</Typography>
        {current !== undefined && pinById.has(current) && <PinCard pin={pinById.get(current)!} feed={feed} large />}
        <Typography className="pingo-current-timer" variant="h5" aria-live="polite">{concluded ? 'All pins called' : `Next pin in ${seconds}s`}</Typography>
        <Button className="pingo-next-button" variant="contained" size="large" onClick={next}
          disabled={busy || data.pin >= poolLimit}>Next pin now</Button>
      </Paper>
      </Box>
      </> : <Stack spacing={2}>
      {!data.scavengerHuntOnly && <Paper className="pingo-check-panel" variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">Check a board</Typography>
          <TextField label="Board code" value={boardEntry} slotProps={{ htmlInput: { maxLength: BOARD_WITH_SETTINGS_LENGTH } }}
            onChange={event => setBoardEntry(event.target.value.toUpperCase())} size="small" />
          <Button variant="outlined" component="a" href={verifyLink || undefined}
            target="_blank" rel="noopener noreferrer" disabled={!verifyLink}>Check board</Button>
          <Typography role="status" variant="body2">{error}</Typography>
        </Stack>
      </Paper>}
      <Paper className="pingo-players-panel" variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Players ({players.length})</Typography>
          <Button size="small" onClick={() => {
            playersPollingPaused.current = false;
            void refreshPlayers(activePassword);
          }}>Refresh</Button>
        </Stack>
        {playersError && <Typography role="alert" color="error">{playersError}</Typography>}
        <Box className="pingo-player-list">
          {players.map(player => {
            const params = player.gameCode === data.game && !data.scavengerHuntOnly ?
              `?${new URLSearchParams({ pin: String(data.pin), at: String(data.at), sig: data.sig })}` : '';
            return <Typography key={`${player.gameCode}:${player.registrationId}`}>
              <a href={data.scavengerHuntOnly ?
                `/${player.boardId}?${new URLSearchParams({ game: player.gameCode, hunt: '1' })}` :
                `/${player.gameCode}/verify/${player.boardId}${params}`}
                target="_blank" rel="noopener noreferrer">
                {player.playerName} · Game {player.gameCode} · Board {player.boardId}
              </a>
            </Typography>;
          })}
          {!players.length && !playersError && <Typography variant="body2">No players registered yet.</Typography>}
        </Box>
      </Paper>
      {!data.scavengerHuntOnly && <Paper className="pingo-call-panel" variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Call list</Typography>
        <Typography variant="body2">Click a displayed pin to mark it as read. The list extends by 100 pins as the game continues.</Typography>
        <Box className="pingo-call-list">{data.ids.slice(0, Math.min(poolLimit,
          Math.max(100, Math.ceil((data.pin + 1) / 100) * 100))).map((id, index) => {
          const pin = pinById.get(id);
          return <Button key={`${id}-${index}`} size="small" color={readIds.has(id) ? 'success' : 'inherit'}
            variant={index + 1 === data.pin ? 'contained' : 'outlined'}
            disabled={index + 1 > data.pin}
            onClick={() => setReadIds(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>
            {index + 1}. {pin?.name ?? `Pin ${id}`}{readIds.has(id) ? ' ✓' : ''}
          </Button>;
        })}</Box>
      </Paper>}
      </Stack>}
    </>}
  </Stack>;
}

export function PingoApp() {
  const { route, navigate } = useRoute();
  const [huntMode, setHuntMode] = useState(false);
  const [callerSnapshot, setCallerSnapshot] = useState<CallerSnapshot | null>(null);
  const [startedGames, setStartedGames] = useState(startedGamesFromStorage);
  const [feed, setFeed] = useState<PinCollectionData | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [error, setError] = useState('');
  const rememberStartedGame = (game: string) => setStartedGames(previous => {
    const next = [game, ...previous.filter(saved => saved !== game)];
    try { window.localStorage.setItem(STARTED_GAMES_KEY, JSON.stringify(next)); }
    catch { /* The current caller remains usable when browser storage is unavailable. */ }
    return next;
  });
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STARTED_GAMES_KEY) setStartedGames(startedGamesFromStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/pins.json', { signal: controller.signal, cache: 'no-cache' })
      .then(response => { if (!response.ok) throw new Error('Pin catalog unavailable.'); return response.json() as Promise<PinCollectionData>; })
      .then(value => {
        const usable = usablePinsFrom(value);
        if (usable.length < 25) throw new Error('At least 25 usable pins are required.');
        setFeed(value); setPins(usable);
      })
      .catch(cause => { if (cause.name !== 'AbortError') setError(cause.message); });
    return () => controller.abort();
  }, []);
  const callerDisplay = route.kind === 'caller' && callerSnapshot !== null;
  return <Box className={callerDisplay ? 'pingo-app pingo-caller-shell' : 'pingo-app'}>
    <AppBar position="static" sx={{ bgcolor: 'var(--pax-colour-aus)', color: 'var(--pax-text-dark)' }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Typography component="a" href="/" variant="h6" sx={{ color: 'inherit', textDecoration: 'none' }}>Pingo</Typography>
        <Button color="inherit" onClick={() => navigate(route.kind === 'board' ?
          `/manage?${new URLSearchParams({ game: route.game })}` : '/manage')}>Manage game</Button>
        {route.kind === 'board' && !huntMode && <Button color="inherit"
          onClick={() => navigate(isNewGameCode(route.game) ? `/join/${route.game}` :
            `/${makeCode()}?game=${route.game}`)}>New board</Button>}
        {huntMode && route.kind === 'board' ? <Typography variant="h6">Scavenger Hunt</Typography> : <>
          {startedGames.length > 0 && <TextField select label="Switch to game" value=""
            onChange={event => { if (validGameCode(event.target.value)) navigate(`/${event.target.value}/go`); }}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} size="small"
            sx={{ minWidth: 185, bgcolor: 'white', borderRadius: 1 }}>
            <option value="">Select game</option>
            {startedGames.map(game => <option key={game} value={game}>Game {game}</option>)}
          </TextField>}
          <Button color="inherit" href="https://pinpanion.com" target="_blank" rel="noopener noreferrer" sx={{ ml: 'auto' }}>Pinpanion</Button>
        </>}
      </Toolbar>
    </AppBar>
    <Container component="main" maxWidth="xl"
      className={callerDisplay ? 'pingo-caller-main' : undefined}
      sx={{ py: callerDisplay ? 1 : 3, minHeight: callerDisplay ? 0 : 'calc(100vh - 120px)' }}>
      {error ? <Typography role="alert" color="error">{error}</Typography> : !feed ? <Typography>Loading pins…</Typography> :
        route.kind === 'home' ? <HomePage navigate={navigate} /> :
        route.kind === 'manage' ? <ManageLoginPage key={route.game} initialGame={route.game} navigate={navigate} /> :
        route.kind === 'join' ? <JoinPage key={route.game} game={route.game} navigate={navigate} /> :
        route.kind === 'board' ? <BoardPage key={`${route.board}-${route.game}`} code={route.board} initialGame={route.game} pins={pins} feed={feed}
          assignedHunt={route.assignedHunt} navigate={navigate} onHuntModeChange={setHuntMode} /> :
        route.kind === 'scavenger' ? <ScavengerJoinPage key={route.game} game={route.game} navigate={navigate} /> :
        route.kind === 'verify' ? <VerifyPage key={`${route.game}-${route.board}`} game={route.game} boardCode={route.board} pins={pins} feed={feed} /> :
        route.kind === 'caller' || route.kind === 'admin' ?
          <AdminPage key={`${route.kind}-${route.game}`} view={route.kind} game={route.game}
            pins={pins} feed={feed} onGameStarted={rememberStartedGame}
            onCallerSnapshot={setCallerSnapshot} navigate={navigate} /> :
        <Typography role="alert">That Pingo URL is invalid.</Typography>}
    </Container>
    <Box component="footer" className={callerDisplay ? 'pingo-caller-footer' : undefined}
      sx={{ textAlign: 'center', py: callerDisplay ? 0.25 : 2 }}>
      {callerDisplay && <Typography variant="body2" component="a" className="pingo-footer-admin"
        href={`/${callerSnapshot.game}/admin?${new URLSearchParams({ pin: String(callerSnapshot.pin), at: String(callerSnapshot.at) })}`}>(admin)</Typography>}
      <Typography variant="body2">Pin images and information provided by <a href="https://pinpanion.com">Pinpanion</a> and <a href="https://www.pinnypals.com">Pinnypals</a>.</Typography>
    </Box>
  </Box>;
}
