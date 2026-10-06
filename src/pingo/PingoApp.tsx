import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar, Box, Button, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Stack, TextField, Toolbar, Typography
} from '@mui/material';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { PinInfo } from '../components/PinInfo.tsx';
import QRCode from 'react-qr-code';
import { CODE_ALPHABET, CODE_PATTERN, makeCode, normalizeCode } from '../guess/game.ts';
import { boardCodeFromTimestamp, boardPins, DRAW_INTERVAL_SECONDS, drawIntervalFromGameCode, GAME_CODE_LENGTH, GAME_TIME_CHARS, MAX_GAME_CODE_LENGTH, PREVIOUS_TIMED_GAME_CODE_LENGTH, timestampFromGameCode, usablePinsFrom } from './game.ts';
import { HuntCaptureDialog, HuntPhotoCard, HuntPhotoPreview } from './ScavengerHunt.tsx';
import { boardStartedAt, loadBoardPhotos, photoIsValid, saveBoardPhoto } from './scavenger.ts';
import type { HuntPhoto } from './scavenger.ts';

type Route = { kind: 'board'; board: string; game?: string; assignedHunt?: boolean } |
  { kind: 'scavenger'; game: string } |
  { kind: 'verify'; game: string; board: string } |
  { kind: 'caller' | 'admin'; game: string } |
  { kind: 'invalid' };

type AdminData = {
  game: string; startMs: number; pin: number; at: number; sig: string; ids: number[];
};
type CallerSnapshot = Pick<AdminData, 'game' | 'pin' | 'at'>;

type Verification = {
  count: number; matchedIds: number[]; winningLines: number[][]; checkedAt: number;
};

type PlayerRecord = { registrationId: string; boardId: string; gameCode: string; playerName: string; updatedAt: number };

const ADMIN_SESSION_KEY = 'pingo:admin:password';
const STARTED_GAMES_KEY = 'pingo:admin:startedGames';
const SCAVENGER_DEVICE_KEY = 'pingo:scavenger:deviceId';

function validGameCode(code: unknown): code is string {
  return typeof code === 'string' && [GAME_CODE_LENGTH, GAME_TIME_CHARS, PREVIOUS_TIMED_GAME_CODE_LENGTH].includes(code.length) &&
    [...code].every(letter => CODE_ALPHABET.includes(letter));
}

function startedGamesFromStorage(): string[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STARTED_GAMES_KEY) ?? '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter(validGameCode))] : [];
  } catch { return []; }
}

function rememberedAdminPassword(): string {
  try { return window.sessionStorage.getItem(ADMIN_SESSION_KEY) ?? ''; }
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
  if (joinedGame && gameStartFromCode(joinedGame) === null) return { kind: 'invalid' };
  if (parts.length === 0) {
    const board = joinedGame ? boardCodeFromTimestamp(Date.now()) : makeCode();
    window.history.replaceState(null, '', `/${board}${joinedGame ? `?game=${joinedGame}` : ''}`);
    return { kind: 'board', board, game: joinedGame };
  }
  if (parts.length === 1 && CODE_PATTERN.test(parts[0])) return {
    kind: 'board', board: parts[0], game: joinedGame, ...(assignedHunt ? { assignedHunt: true } : {})
  };
  if (parts.length === 2 && parts[0] === 'scavenger' && gameStartFromCode(parts[1]) !== null) {
    return { kind: 'scavenger', game: parts[1] };
  }
  if (parts.length === 1 && parts[0] === 'go') return { kind: 'caller', game: '' };
  if (parts.length === 1 && parts[0] === 'admin') return { kind: 'admin', game: startedGamesFromStorage()[0] ?? '' };
  if (parts.length === 2 && (parts[1] === 'go' || parts[1] === 'admin') && validGameCode(parts[0])) {
    return { kind: parts[1] === 'go' ? 'caller' : 'admin', game: parts[0] };
  }
  if (parts.length === 3 && parts[1] === 'verify' &&
    validGameCode(parts[0]) && CODE_PATTERN.test(parts[2])) {
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
  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setRoute(routeFromLocation());
  };
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
    {board.map((pin, index) => <Box key={`${pin.id}-${index}`}
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
    </Box>)}
  </Box></Box>;
}

async function postAdmin(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/pingo/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store'
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(result.error ?? `Request failed: ${response.status}`));
  return result;
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
  const [startedAt] = useState(() => boardStartedAt(code));
  const [huntMode, setHuntMode] = useState(() => {
    if (assignedHunt) return true;
    try { return window.localStorage.getItem(`pingo:board:${code}:huntMode`) === 'true'; }
    catch { return false; }
  });
  const [enterHunt, setEnterHunt] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [previewPin, setPreviewPin] = useState<Pin | null>(null);
  const [replacingPin, setReplacingPin] = useState<Pin | null>(null);
  const [photos, setPhotos] = useState<Map<number, HuntPhoto>>(new Map());
  const [photosLoading, setPhotosLoading] = useState(huntMode);
  const board = useMemo(() => boardPins(code, pins), [code, pins]);
  const gameCode = normalizeCode(gameEntry);
  const startMs = gameStartFromCode(gameCode);
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
  const newBoard = () => navigate(assignedHunt && startMs !== null ? `/scavenger/${gameCode}` :
    `/${makeCode()}${startMs !== null ? `?game=${gameCode}` : ''}`);
  return <Stack spacing={2}>
    <Box>
      <Box className="pingo-board-heading">
        <Typography variant="h3" component="h1">Pingo Board {code}{huntMode ? ' - Scavenger Hunt!' : ''}</Typography>
        {huntMode && <Button variant="outlined" onClick={newBoard}>New board</Button>}
      </Box>
      <Typography>{huntMode ? 'Your scavenger hunt has 25 pins. Photos stay on this device.' :
        'Your Pingo board has 25 pins. Share this link to show the same board.'}</Typography>
      <Typography>{huntMode ? 'Tap a pin to take its photo during this event. Tap a saved photo to view it.' :
        'Click a pin to mark it with a red X. Click it again to remove the X.'}</Typography>
      {!huntMode && startMs !== null && <GameStartTime startMs={startMs} game={gameCode} />}
    </Box>
    {!huntMode && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Button variant="outlined" onClick={() => copy(window.location.href).then(() => setMessage('Board link copied.')).catch(() => setMessage('Copy failed.'))}>Copy board link</Button>
        <Button variant="outlined" onClick={() => setEnterHunt(true)}>Scavenger hunt Mode</Button>
        <Button variant="outlined" onClick={newBoard}>New board</Button>
        <Button variant="outlined" onClick={() => navigate('/go')}>Run a game</Button>
    </Stack>}
    {!huntMode && <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
        <TextField label="Game code" value={gameEntry}
          onChange={event => { setGameEntry(event.target.value.toUpperCase()); setPlayerEdited(true); }}
          inputProps={{ maxLength: MAX_GAME_CODE_LENGTH }} size="small" sx={{ width: { xs: '100%', sm: 190 }, flexShrink: 0 }}
          helperText="Enter the caller's game code." />
        <TextField label="Player name" value={playerName}
          onChange={event => { setPlayerName(event.target.value); setPlayerEdited(true); }}
          inputProps={{ maxLength: 80 }} size="small" sx={{ width: { xs: '100%', sm: 320 } }} />
      </Stack>
    </Paper>}
    {huntMode ? <BoardGrid board={board} feed={feed} huntPhotos={photos} onHuntClick={choosePin} /> :
      <PlayerBoard key={startMs === null ? 'no-game' : gameCode}
      board={board} feed={feed} code={code} gameCode={startMs === null ? '' : gameCode} />
    }
    <Typography role="status" variant="body2">{photosLoading ? 'Loading saved photos…' : message}</Typography>
    <Dialog open={enterHunt} onClose={() => setEnterHunt(false)}>
      <DialogTitle>Scavenger hunt Mode</DialogTitle>
      <DialogContent>In scavenger hunt Mode, you must find the listed pins, and take a photo of them during the event. Only photos taken after your board is generated will be valid. To take a photo of that pin, click the pin, and take a photo with your device's camera. Click OK to enter the scavenger Hunt, or Cancel to return.</DialogContent>
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
      window.localStorage.setItem(`pingo:board:${result.boardId}:game`, game);
      window.localStorage.setItem(`pingo:player:${result.boardId}`, JSON.stringify({
        registrationId: newRegistrationId(), boardId: result.boardId,
        gameCode: game, playerName: result.nickname
      }));
    } catch {
      setError('Browser storage is required to keep your scavenger board and photos.');
      return;
    }
    navigate(`/${result.boardId}?game=${game}&hunt=1`);
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
      if (!CODE_PATTERN.test(result.boardId) || result.gameCode !== game ||
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
    <Typography>Enter a nickname to get your scavenger hunt board.</Typography>
    <TextField label="Nickname" value={nickname} inputProps={{ maxLength: 80 }}
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
  const board = useMemo(() => boardPins(boardCode, pins), [boardCode, pins]);
  const startMs = gameStartFromCode(game);
  const override = window.location.search;
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const params = new URLSearchParams(override);
      params.set('game', game);
      params.set('board', boardCode);
      try {
        const response = await fetch(`/api/pingo/verify?${params}`, { cache: 'no-store' });
        const data = await response.json() as Verification & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Verification failed.');
        if (live) { setResult(data); setError(''); }
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : 'Verification failed.');
      }
    };
    void refresh();
    const interval = override ? undefined : window.setInterval(refresh, 5_000);
    return () => { live = false; if (interval) window.clearInterval(interval); };
  }, [game, boardCode, override]);
  return <Stack spacing={2}>
    <Typography variant="h4" component="h1">Verify Pingo board {boardCode}</Typography>
    <Typography>Game {game} · {result ? `${result.count} pins called` : 'Checking calls…'}</Typography>
    {startMs !== null && <GameStartTime startMs={startMs} game={game} />}
    {result?.winningLines.length ? <Paper className="pingo-winner" role="status">
      <Typography variant="h5">Pingo! {result.winningLines.length} complete {result.winningLines.length === 1 ? 'line' : 'lines'}.</Typography>
    </Paper> : <Typography role="status">{error || (result ? 'No complete row or column yet.' : '')}</Typography>}
    <BoardGrid board={board} feed={feed} checked={new Set(result?.matchedIds ?? [])} winning={result?.winningLines ?? []} />
    <Typography variant="body2">{override ? 'This link is a snapshot of the signed pin count.' :
      `This board updates as each ${drawIntervalFromGameCode(game) / 1_000}-second interval passes.`}</Typography>
  </Stack>;
}

export function AdminPage({ game, pins, feed, onGameStarted, onCallerSnapshot, view = 'caller' }:
  { game: string; pins: Pin[]; feed: PinCollectionData; onGameStarted: (game: string) => void;
    onCallerSnapshot?: (snapshot: CallerSnapshot | null) => void; view?: 'caller' | 'admin' }) {
  const [rememberedPassword] = useState(rememberedAdminPassword);
  const [password, setPassword] = useState(rememberedPassword);
  const [activePassword, setActivePassword] = useState('');
  const autoUnlockAttempted = useRef(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [boardEntry, setBoardEntry] = useState('');
  const [gameEntry, setGameEntry] = useState(game);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [playersError, setPlayersError] = useState('');
  const pinById = useMemo(() => new Map(pins.map(pin => [pin.id, pin])), [pins]);

  useEffect(() => {
    if (view !== 'caller') return;
    onCallerSnapshot?.(data ? { game: data.game, pin: data.pin, at: data.at } : null);
  }, [view, data?.game, data?.pin, data?.at, onCallerSnapshot]);

  const refreshPlayers = async (secret: string) => {
    try {
      const response = await fetch('/player', {
        headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store'
      });
      const result = await response.json() as { players?: PlayerRecord[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Player list failed.');
      setPlayers(result.players ?? []);
      setPlayersError('');
    } catch (cause) {
      setPlayersError(cause instanceof Error ? cause.message : 'Player list failed.');
    }
  };

  const update = async (secret: string, targetGame: string, pin?: number, at?: number) => {
    setBusy(true);
    try {
      const next = await postAdmin('admin', { password: secret, game: targetGame, pin, at }) as AdminData;
      setData(next);
      setError('');
      const params = new URLSearchParams({ pin: String(next.pin), at: String(next.at) });
      window.history.replaceState(null, '', `/${targetGame}/${view === 'admin' ? 'admin' : 'go'}?${params}`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Caller request failed.');
      return false;
    } finally { setBusy(false); }
  };

  const unlock = async (secret = password) => {
    if (!secret) return;
    setBusy(true);
    try {
      let targetGame = game || (view === 'admin' ? normalizeCode(gameEntry) : '');
      if (!targetGame) {
        if (view === 'admin') throw new Error('Enter a game code.');
        const created = await postAdmin('create', { password: secret, intervalSeconds });
        if (!validGameCode(created.game)) throw new Error('Game creation returned an invalid code.');
        targetGame = created.game;
        onGameStarted(targetGame);
        window.history.replaceState(null, '', `/${targetGame}/go`);
      }
      if (!validGameCode(targetGame)) throw new Error('Enter a valid game code.');
      const params = new URLSearchParams(window.location.search);
      const requested = params.has('pin') ? Number(params.get('pin')) : undefined;
      const at = params.has('at') ? Number(params.get('at')) : undefined;
      if (await update(secret, targetGame, requested, at)) {
        setActivePassword(secret);
        try { window.sessionStorage.setItem(ADMIN_SESSION_KEY, secret); }
        catch { /* Caller remains usable when browser storage is unavailable. */ }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start game.');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (game && rememberedPassword && !autoUnlockAttempted.current) {
      autoUnlockAttempted.current = true;
      void unlock(rememberedPassword);
    }
  }, [game, rememberedPassword]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activePassword || view !== 'admin') return;
    void refreshPlayers(activePassword);
    const interval = window.setInterval(() => void refreshPlayers(activePassword), 10_000);
    return () => window.clearInterval(interval);
  }, [activePassword, view]);

  useEffect(() => {
    if (!data || busy || !activePassword || data.pin >= pins.length ||
      clock < data.at + drawIntervalFromGameCode(data.game)) return;
    void update(activePassword, data.game, data.pin + 1,
      data.at + drawIntervalFromGameCode(data.game));
  }, [clock, data, busy, activePassword, pins.length]);

  const next = () => {
    if (data && activePassword && !busy && data.pin < pins.length) {
      void update(activePassword, data.game, data.pin + 1, Date.now());
    }
  };
  const current = data?.ids[data.pin - 1];
  const previous = data?.ids.slice(Math.max(0, data.pin - 6), Math.max(0, data.pin - 1)) ?? [];
  const seconds = data ? Math.max(0, Math.ceil((data.at + drawIntervalFromGameCode(data.game) - clock) / 1_000)) : intervalSeconds;
  const verifyLink = data && CODE_PATTERN.test(normalizeCode(boardEntry)) ?
    `${window.location.origin}/${data.game}/verify/${normalizeCode(boardEntry)}?${new URLSearchParams({ pin: String(data.pin), at: String(data.at), sig: data.sig })}` : '';
  const joinLink = data ? `${window.location.origin}/?game=${data.game}` : '';
  const shownGame = data?.game ?? game;

  return <Stack spacing={data && view === 'caller' ? 0 : 2}
    className={data && view === 'caller' ? 'pingo-caller-display' : undefined}>
    {data && view === 'caller' ? <GameStartTime startMs={data.startMs} game={data.game} heading /> :
      <Typography variant="h3" component="h1">Pingo {view === 'admin' ? 'admin' : 'caller'}{shownGame ? ` · Game ${shownGame}` : ''}</Typography>}
    {view === 'admin' && data && <Button variant="outlined" component="a"
      href={`/${data.game}/go?${new URLSearchParams({ pin: String(data.pin), at: String(data.at) })}`}
      sx={{ alignSelf: 'flex-start' }}>Back to Caller page</Button>}
    {!shownGame && <Typography>{view === 'admin' ? 'Enter a game code and admin password.' : 'Enter the admin password to start a new timed game.'}</Typography>}
    {!data ? <Paper variant="outlined" sx={{ p: 2, maxWidth: 520 }}>
      <Stack spacing={2}>
        <TextField label="Admin password" type="password" value={password}
          onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void unlock(); }} />
        {view === 'admin' && !game && <TextField label="Game code" value={gameEntry}
          inputProps={{ maxLength: MAX_GAME_CODE_LENGTH }} onChange={event => setGameEntry(event.target.value.toUpperCase())} />}
        {view === 'caller' && !game && <TextField select label="Time between pin draws" value={intervalSeconds}
          onChange={event => setIntervalSeconds(Number(event.target.value))}
          SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}
          helperText="Note: This can not be changed once a game is created.">
          {DRAW_INTERVAL_SECONDS.map(seconds => <option key={seconds} value={seconds}>{seconds}s</option>)}
        </TextField>}
        <Button variant="contained" onClick={() => void unlock()} disabled={busy || !password}>{game || view === 'admin' ? (view === 'admin' ? 'Open admin' : 'Open caller') : 'Create game'}</Button>
        <Typography role="alert" color="error">{error}</Typography>
      </Stack>
    </Paper> : <>
      {view === 'admin' && <><GameStartTime startMs={data.startMs} game={data.game} />
        <Typography>Pin {data.pin} of {pins.length}</Typography></>}
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
        <Typography variant="h6">Current pin ({data.pin} of {pins.length})</Typography>
        {current !== undefined && pinById.has(current) && <PinCard pin={pinById.get(current)!} feed={feed} large />}
        <Typography className="pingo-current-timer" variant="h5" aria-live="polite">Next pin in {seconds}s</Typography>
        <Button className="pingo-next-button" variant="contained" size="large" onClick={next} disabled={busy || data.pin >= pins.length}>Next pin now</Button>
      </Paper>
      </Box>
      </> : <Stack spacing={2}>
      <Paper className="pingo-check-panel" variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">Check a board</Typography>
          <TextField label="Board code" value={boardEntry} inputProps={{ maxLength: 4 }}
            onChange={event => setBoardEntry(event.target.value.toUpperCase())} size="small" />
          <Button variant="outlined" component="a" href={verifyLink || undefined}
            target="_blank" rel="noopener noreferrer" disabled={!verifyLink}>Check board</Button>
          <Typography role="status" variant="body2">{error}</Typography>
        </Stack>
      </Paper>
      <Paper className="pingo-players-panel" variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Players ({players.length})</Typography>
          <Button size="small" onClick={() => void refreshPlayers(activePassword)}>Refresh</Button>
        </Stack>
        {playersError && <Typography role="alert" color="error">{playersError}</Typography>}
        <Box className="pingo-player-list">
          {players.map(player => {
            const params = player.gameCode === data.game ?
              `?${new URLSearchParams({ pin: String(data.pin), at: String(data.at), sig: data.sig })}` : '';
            return <Typography key={`${player.gameCode}:${player.registrationId}`}>
              <a href={`/${player.gameCode}/verify/${player.boardId}${params}`}
                target="_blank" rel="noopener noreferrer">
                {player.playerName} · Game {player.gameCode} · Board {player.boardId}
              </a>
            </Typography>;
          })}
          {!players.length && !playersError && <Typography variant="body2">No players registered yet.</Typography>}
        </Box>
      </Paper>
      <Paper className="pingo-call-panel" variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Call list</Typography>
        <Typography variant="body2">Click a displayed pin to mark it as read. The list extends by 100 pins as the game continues.</Typography>
        <Box className="pingo-call-list">{data.ids.map((id, index) => {
          const pin = pinById.get(id);
          return <Button key={`${id}-${index}`} size="small" color={readIds.has(id) ? 'success' : 'inherit'}
            variant={index + 1 === data.pin ? 'contained' : 'outlined'}
            disabled={index + 1 > data.pin}
            onClick={() => setReadIds(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>
            {index + 1}. {pin?.name ?? `Pin ${id}`}{readIds.has(id) ? ' ✓' : ''}
          </Button>;
        })}</Box>
      </Paper>
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
        {!(huntMode && route.kind === 'board') && <Button color="inherit" onClick={() => navigate(`/${makeCode()}${route.kind === 'board' && route.game ? `?game=${route.game}` : ''}`)}>New board</Button>}
        {huntMode && route.kind === 'board' ? <Typography variant="h6">Scavenger Hunt</Typography> : <>
          <Button color="inherit" onClick={() => navigate('/go')}>Run a game</Button>
          {startedGames.length > 0 && <TextField select label="Switch to game" value=""
            onChange={event => { if (validGameCode(event.target.value)) navigate(`/${event.target.value}/go`); }}
            SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} size="small"
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
        route.kind === 'board' ? <BoardPage key={`${route.board}-${route.game ?? ''}`} code={route.board} initialGame={route.game} pins={pins} feed={feed}
          assignedHunt={route.assignedHunt} navigate={navigate} onHuntModeChange={setHuntMode} /> :
        route.kind === 'scavenger' ? <ScavengerJoinPage key={route.game} game={route.game} navigate={navigate} /> :
        route.kind === 'verify' ? <VerifyPage key={`${route.game}-${route.board}`} game={route.game} boardCode={route.board} pins={pins} feed={feed} /> :
        route.kind === 'caller' || route.kind === 'admin' ?
          <AdminPage key={`${route.kind}-${route.game}`} view={route.kind} game={route.game}
            pins={pins} feed={feed} onGameStarted={rememberStartedGame}
            onCallerSnapshot={setCallerSnapshot} /> :
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
