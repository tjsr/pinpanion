import { useEffect, useState } from 'react';
import {
  AppBar, Box, Button, ButtonBase, Container, FormControl, FormControlLabel,
  FormLabel, Paper, Radio, RadioGroup, Stack, TextField, Toolbar, Typography
} from '@mui/material';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { PinInfo } from '../components/PinInfo.tsx';
import { BOARD_SIZE, CODE_PATTERN, generateGame, makeCode, normalizeCode, validPinsFrom } from './game.ts';

type Player = 1 | 2;
type Game = ReturnType<typeof generateGame>;

function codeFromPath(): string {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  return path ? (CODE_PATTERN.test(path) ? path : '') : makeCode();
}

function GamePin({ pin, feed, htmlId }: { pin: Pin; feed: PinCollectionData; htmlId: string }) {
  return <PinInfo
    pin={pin}
    displaySize="sm"
    categories={feed.categories}
    paxs={feed.pax}
    events={feed.events}
    pinSets={feed.sets}
    groups={feed.groups}
    imagePrefix="https://pinpanion.com/imgs"
    htmlId={htmlId}
  />;
}

export function GuessGame() {
  const [code, setCode] = useState(codeFromPath);
  const [entry, setEntry] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);
  const [feed, setFeed] = useState<PinCollectionData | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (window.location.pathname === '/') window.history.replaceState(null, '', `/${code}`);
    const onPopState = () => {
      if (game) return;
      setCode(codeFromPath());
      setMessage('');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [code, game]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/pins.json', { signal: controller.signal, cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`Pin feed returned ${response.status}.`);
        return response.json() as Promise<PinCollectionData>;
      })
      .then(data => {
        const filtered = validPinsFrom(data);
        if (filtered.length < BOARD_SIZE) throw new Error('The pin feed has fewer than 24 usable pins.');
        setFeed(data);
        setPins(filtered);
      })
      .catch(error => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      });
    return () => controller.abort();
  }, []);

  const setCodeAndRoute = (nextCode: string) => {
    setCode(nextCode);
    setEntry('');
    setMessage('');
    window.history.pushState(null, '', `/${nextCode}`);
  };

  const joinCode = () => {
    const nextCode = normalizeCode(entry);
    if (!CODE_PATTERN.test(nextCode)) {
      setMessage('Enter a valid four-character game code.');
      return;
    }
    setCodeAndRoute(nextCode);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${code}`);
      setMessage('Game link copied.');
    } catch {
      setMessage('Copy failed. You can copy the address from your browser.');
    }
  };

  const start = () => {
    if (!feed || pins.length < BOARD_SIZE || !player || !CODE_PATTERN.test(code)) return;
    setGame(generateGame(code, pins));
  };

  const togglePin = (index: number) => {
    setEliminated(previous => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const opponent: Player | null = player === 1 ? 2 : player === 2 ? 1 : null;
  const board = game && player ? game.boards[player] : [];
  const secret = game && opponent ? game.targets[opponent] : null;

  return <>
    <AppBar position="static" sx={{ bgcolor: 'var(--pax-colour-aus)', color: 'var(--pax-text-dark)' }}>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap', minHeight: { sm: 56 }, py: { xs: 1, sm: 0 } }}>
        <Typography component="a" href="/" variant="h6" sx={{ color: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' }}>Pin Who?</Typography>
        <Typography sx={{ ml: { xs: 0, sm: 2 }, whiteSpace: 'nowrap' }}>Game ID: {code || 'Invalid'}</Typography>
        <Button size="small" variant="outlined" color="inherit" disabled={!code} onClick={copyLink}>Copy Link</Button>
        <Button color="inherit" href="https://pinpanion.com" target="_blank" rel="noopener noreferrer" sx={{ ml: 'auto' }}>Browse all pins</Button>
      </Toolbar>
    </AppBar>

    <Container component="main" maxWidth="xl" sx={{ py: game ? .5 : 4, minHeight: 'calc(100vh - 130px)' }}>
      {!game ? <Paper variant="outlined" sx={{ maxWidth: 640, mx: 'auto', p: { xs: 2, sm: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>Guess the pin.</Typography>
            <Typography>Pick your player, then start. Your 24 pins and the pin your opponent is trying to find will appear together.</Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField label="Have a code?" value={entry} onChange={event => setEntry(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === 'Enter') joinCode(); }} slotProps={{ htmlInput: { maxLength: 4 } }} autoComplete="off" fullWidth />
            <Button variant="outlined" onClick={joinCode}>Join game</Button>
            <Button variant="outlined" onClick={() => setCodeAndRoute(makeCode())}>New code</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">Share the link with the other player. Each person opens it and picks a different player number.</Typography>

          <FormControl component="fieldset">
            <FormLabel component="legend">Choose your player</FormLabel>
            <RadioGroup row value={player === null ? '' : String(player)} onChange={event => setPlayer(Number(event.target.value) as Player)}>
              <FormControlLabel value="1" control={<Radio />} label="Player 1" />
              <FormControlLabel value="2" control={<Radio />} label="Player 2" />
            </RadioGroup>
          </FormControl>
          <Button variant="contained" size="large" disabled={!code || !player || !feed || !!loadError} onClick={start}>{loadError ? 'Pins unavailable' : feed ? 'Start game' : 'Loading pins…'}</Button>
          <Typography role="status" aria-live="polite" color={loadError ? 'error' : 'text.secondary'} variant="body2">{loadError || message || (!code ? 'That game code is invalid. Enter a code or make a new one.' : '')}</Typography>
        </Stack>
      </Paper> : <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography variant="h5" component="h1">Player {player} - Your 24 pins</Typography>
              <Typography aria-live="polite" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{BOARD_SIZE - eliminated.size} remaining</Typography>
            </Stack>
            <Typography color="text.secondary">You have been assigned a pin which appears on the board below - your job is to determine through yes or no questions which of the below pins it is.  Take turns asking one yes or no question per turn. Make a guess when you think you know your opponent's character, but be careful: a wrong guess loses the game.</Typography>
          </Box>

          {secret && feed && <Paper variant="outlined" sx={{ p: .5, width: 'fit-content', maxWidth: '100%', flexShrink: 0, '& .pin-sm img.pinImage': { maxHeight: '90px' } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
              <Box><Typography variant="h6" component="h2">Player {opponent}'s pin</Typography><Typography variant="body2" sx={{ maxWidth: 260 }}>This is the pin which the other player is trying to uncover out of their board options - they will ask you questions, and your answer should be yes or no based on this pin.</Typography></Box>
              <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}><GamePin pin={secret} feed={feed} htmlId="guess-secret-pin" /></Box>
            </Stack>
          </Paper>}
        </Stack>

        <Box aria-label="Your pin board" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(8, minmax(0, 1fr))' }, gridAutoRows: { xs: '170px', lg: 'clamp(138px, calc((100vh - 300px) / 3), 150px)' }, gap: 1 }}>
          {feed && board.map((pin, index) => {
            const faded = eliminated.has(index);
            return <ButtonBase key={index} aria-pressed={faded} aria-label={`${pin.name}, ${faded ? 'eliminated. Tap to restore.' : 'still possible. Tap to eliminate.'}`} onClick={() => togglePin(index)} sx={{ width: '100%', height: '100%', alignItems: 'stretch', opacity: faded ? .3 : 1, filter: faded ? 'grayscale(1)' : 'none', '& > .pin-sm': { boxSizing: 'border-box', width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }, '& .pinInfo': { display: 'flex', flexDirection: 'column', height: '100%' }, '& .pinImage': { alignSelf: 'center', marginBlock: 'auto' }, '& .pin-sm img.pinImage': { maxHeight: { lg: '90px' } } }}><GamePin pin={pin} feed={feed} htmlId={`guess-board-pin-${index}`} /></ButtonBase>;
          })}
        </Box>
        <Typography role="status" aria-live="polite" variant="body2">{message}</Typography>
      </Stack>}
    </Container>

    <Box component="footer" sx={{ textAlign: 'center', py: game ? .5 : 2 }}><Typography variant="body2" color="text.secondary">Pin images and information provided by <a href="https://pinpanion.com">Pinpanion</a> and <a href="https://www.pinnypals.com">Pinnypals</a></Typography></Box>
  </>;
}
