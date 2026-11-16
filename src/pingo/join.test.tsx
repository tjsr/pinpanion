import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { boardCodeForGame } from './game.ts';
import { createGameCode, createRegisteredGameCode } from './secure.ts';
import { BoardPage, HomePage, JoinPage, routeFromLocation } from './PingoApp.tsx';

vi.mock('../components/PinInfo.tsx', () => ({
  PinInfo: ({ pin }: { pin: Pin }) => <div>{pin.name}</div>
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

describe('Pingo game join link', () => {
  it('requires a game and routes a join link through server board creation', () => {
    const now = 1_791_200_005_123;
    const game = createRegisteredGameCode(now - 1_000, 30, 150);
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(routeFromLocation()).toEqual({ kind: 'home' });
    window.history.replaceState(null, '', `/?game=${game}`);
    expect(routeFromLocation()).toEqual({ kind: 'join', game });
    const board = boardCodeForGame('ACDE', game);
    window.history.replaceState(null, '', `/${board}?game=${game}`);
    expect(routeFromLocation()).toEqual({ kind: 'board', board, game });
    window.history.replaceState(null, '', `/${board}`);
    expect(routeFromLocation()).toEqual({ kind: 'invalid' });
  });

  it('lists registered games and requests a board from the Worker', async () => {
    const game = createRegisteredGameCode(Date.now() - 1_000, 15, 150);
    const board = boardCodeForGame('ACDE', game);
    const navigate = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/api/pingo/games') return Response.json({ games: [
        { gameCode: game, startMs: Date.now() - 1_000, intervalMs: 15_000, poolSize: 150 }
      ] });
      if (String(input).startsWith('/api/pingo/game-mode?')) {
        return Response.json({ game, scavengerHuntOnly: false });
      }
      if (input === '/api/pingo/board') return Response.json({ game, board }, { status: 201 });
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    const home = render(<HomePage navigate={navigate} />);
    expect(await screen.findByText(`Game ${game}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Join game' }));
    expect(navigate).toHaveBeenCalledWith(`/join/${game}`);
    home.unmount();
    render(<JoinPage game={game} navigate={navigate} />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/${board}?game=${game}`));
    expect(fetchMock.mock.calls.find(([url]) => url === '/api/pingo/board')?.[1]).toMatchObject({
      method: 'POST', body: JSON.stringify({ game })
    });
  });

  it('routes hunt-only games directly to scavenger assignment', async () => {
    const game = createRegisteredGameCode(Date.now() - 1_000, 30, 25);
    const prefix = game.split('-')[0];
    const navigate = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/api/pingo/games') return Response.json({ games: [
        { gameCode: game, startMs: Date.now() - 1_000, intervalMs: 30_000,
          poolSize: 25, scavengerHuntOnly: true }
      ] });
      if (String(input).startsWith('/api/pingo/game-mode?')) {
        return Response.json({ game, scavengerHuntOnly: true });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    const home = render(<HomePage navigate={navigate} />);
    expect(await screen.findByText('Scavenger Hunt Only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join game' })).not.toBeInTheDocument();
    home.unmount();
    render(<JoinPage game={prefix} navigate={navigate} />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/scavenger/${game}`));
    expect(fetchMock.mock.calls.some(([input]) => input === '/api/pingo/board')).toBe(false);
  });

  it('creates a fresh board locally when a legacy game join QR is opened', async () => {
    const game = createGameCode(Date.now() - 1_000);
    const navigate = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ game, scavengerHuntOnly: false }));
    render(<JoinPage game={game} navigate={navigate} />);
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const path = navigate.mock.calls[0][0] as string;
    expect(path).toMatch(new RegExp(`^/[A-Z2-9]+\\?game=${game}$`));
    window.history.replaceState(null, '', path);
    expect(routeFromLocation()).toMatchObject({ kind: 'board', game });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/pingo/game-mode?'),
      expect.any(Object));
  });

  it('shares a regular board and its game with distinct QR links', async () => {
    const game = createGameCode(Date.now() - 1_000);
    render(<BoardPage code="ACDE" initialGame={game} pins={Array.from({ length: 30 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[]}
    feed={{} as PinCollectionData} navigate={vi.fn()} onHuntModeChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Board check link' }));
    const boardDialog = screen.getByRole('dialog', { name: 'Board check link' });
    expect(within(boardDialog).getByRole('link')).toHaveAttribute('href',
      `${window.location.origin}/ACDE?game=${game}`);
    fireEvent.click(within(boardDialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Share to join game' }));
    const joinDialog = screen.getByRole('dialog', { name: 'Share to join game' });
    expect(within(joinDialog).getByRole('link')).toHaveAttribute('href',
      `${window.location.origin}/join/${game}`);
  });

  it('shows only the registered game pool on an issued board', async () => {
    const game = createRegisteredGameCode(Date.now() - 1_000, 20, 50);
    const board = boardCodeForGame('ACDE', game);
    const pins = Array.from({ length: 100 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
    const check = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ game, board }));
    render(<BoardPage code={board} initialGame={game} pins={pins}
      feed={{} as PinCollectionData} navigate={vi.fn()} onHuntModeChange={vi.fn()} />);
    expect(screen.getByText('Checking board registration…')).toBeInTheDocument();
    await screen.findByRole('heading', { name: `Pingo Board ${board}` });
    const cells = screen.getAllByRole('button', { name: /^Pin \d+, unmarked$/ });
    expect(cells).toHaveLength(25);
    expect(cells.every(cell => Number(cell.getAttribute('aria-label')?.match(/^Pin (\d+)/)?.[1]) < 50)).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Game code' })).toHaveAttribute('readonly');
    expect(check.mock.calls[0][0]).toContain(`/api/pingo/board?game=${game}`);
  });

  it('prefills the scanned game on the player board', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_791_200_005_123);
    const pins = Array.from({ length: 30 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
    render(<BoardPage code="ACDE" initialGame="22UFAJF" pins={pins}
      feed={{} as PinCollectionData} navigate={vi.fn()} onHuntModeChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'Game code' })).toHaveValue('22UFAJF');
    expect(screen.getByText(/Game 22UFAJF started at/)).toBeInTheDocument();
  });

  it('stores player details locally and PUTs them three seconds after the last edit', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(Date, 'now').mockReturnValue(1_791_200_005_123);
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));
      const pins = Array.from({ length: 30 }, (_, id) =>
        ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
      render(<BoardPage code="ACDE" initialGame="22UFAJF" pins={pins}
        feed={{} as PinCollectionData} navigate={vi.fn()} onHuntModeChange={vi.fn()} />);
      fireEvent.change(screen.getByRole('textbox', { name: 'Player name' }), { target: { value: 'Alice' } });
      await act(async () => { vi.advanceTimersByTime(2_000); });
      fireEvent.change(screen.getByRole('textbox', { name: 'Player name' }), { target: { value: 'Alice Smith' } });
      const saved = JSON.parse(window.localStorage.getItem('pingo:player:ACDE')!);
      expect(saved).toMatchObject({ boardId: 'ACDE', gameCode: '22UFAJF', playerName: 'Alice Smith' });
      expect(saved.registrationId).toMatch(/^[0-9a-f]{32}$/);
      await act(async () => { vi.advanceTimersByTime(2_999); });
      expect(fetchMock).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(1); });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/player', expect.objectContaining({
        method: 'PUT', body: JSON.stringify({ registrationId: saved.registrationId,
          boardId: 'ACDE', gameCode: '22UFAJF', playerName: 'Alice Smith' })
      }));
    } finally { vi.useRealTimers(); }
  });
});
