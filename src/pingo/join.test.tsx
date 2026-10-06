import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { boardCodeFromTimestamp } from './game.ts';
import { BoardPage, routeFromLocation } from './PingoApp.tsx';

vi.mock('../components/PinInfo.tsx', () => ({
  PinInfo: ({ pin }: { pin: Pin }) => <div>{pin.name}</div>
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

describe('Pingo game join link', () => {
  it('creates a board at page load and carries the game into its URL', () => {
    const now = 1_791_200_005_123;
    const game = '22UFAJF';
    vi.spyOn(Date, 'now').mockReturnValue(now);
    window.history.replaceState(null, '', `/?game=${game}`);
    const board = boardCodeFromTimestamp(now);
    expect(routeFromLocation()).toEqual({ kind: 'board', board, game });
    expect(window.location.pathname + window.location.search).toBe(`/${board}?game=${game}`);
    expect(routeFromLocation()).toEqual({ kind: 'board', board, game });
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
