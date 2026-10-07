import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Pin } from '../types.ts';
import { boardCodeForGame } from './game.ts';
import { PingoApp } from './PingoApp.tsx';
import { createRegisteredGameCode } from './secure.ts';

vi.mock('../components/PinInfo.tsx', () => ({
  PinInfo: ({ pin }: { pin: Pin }) => <div>{pin.name}</div>
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('Pingo polling', () => {
  it('stops verification polling after a 503 HTML response', async () => {
    const game = createRegisteredGameCode(Date.now() - 60_000, 10, 25);
    const board = boardCodeForGame('ACDE', game);
    const pins = Array.from({ length: 30 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
    const intervals: Array<() => void> = [];
    vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      intervals.push(callback as () => void);
      return intervals.length;
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/pins.json') return Response.json({ pins });
      if (String(input).startsWith('/api/pingo/verify?')) {
        return new Response('<!DOCTYPE html>', { status: 503,
          headers: { 'Content-Type': 'text/html' } });
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    window.history.replaceState(null, '', `/${game}/verify/${board}`);
    render(<PingoApp />);
    await screen.findByRole('button', { name: 'Retry verification' });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/pingo/verify?'))).toHaveLength(1);
    await act(async () => { for (const interval of intervals) interval(); });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/pingo/verify?'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry verification' }));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/pingo/verify?'))).toHaveLength(1);
  });
});
