import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { boardCodeForGame } from './game.ts';
import { createRegisteredGameCode } from './secure.ts';
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
