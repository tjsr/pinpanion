import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Pin } from '../types.ts';
import { createGameCode, createTimedGameCode, verifiedGameStart } from './secure.ts';
import { PingoApp } from './PingoApp.tsx';

vi.mock('../components/PinInfo.tsx', () => ({
  PinInfo: ({ pin }: { pin: Pin }) => <div>{pin.name}</div>
}));

const pins = Array.from({ length: 30 }, (_, id) =>
  ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

function mockRequests(createdGame: string) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (input === '/pins.json') return Response.json({ pins });
    if (input === '/player') return Response.json({ players: [] });
    if (input === '/api/pingo/create') return Response.json({ game: createdGame });
    if (input === '/api/pingo/admin') {
      const body = JSON.parse(String(init?.body)) as { game: string };
      return Response.json({ game: body.game, startMs: verifiedGameStart(body.game),
        pin: 1, at: Date.now(), sig: 'signed-count', ids: [0] });
    }
    throw new Error(`Unexpected request: ${String(input)}`);
  });
}

describe('started Pingo games', () => {
  it('saves a newly created game and shows the switcher', async () => {
    const game = createTimedGameCode(Date.now(), 15);
    const fetchMock = mockRequests(game);
    window.history.replaceState(null, '', '/go');
    render(<PingoApp />);
    expect(screen.queryByRole('combobox', { name: 'Switch to game' })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Admin password'), { target: { value: 'pinny' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Time between pin draws' }), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create game' }));
    await screen.findByText('Current pin (1 of 30)');
    expect(screen.getByRole('heading', { name: new RegExp(`^Game ${game} started at`) })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '(admin)' })).toHaveAttribute('href', expect.stringContaining(`/${game}/admin?`));
    expect(document.querySelector('.pingo-caller-shell')).toBeInTheDocument();
    expect(document.querySelector('.pingo-caller-footer')?.textContent).toContain('Pin images and information provided by Pinpanion and Pinnypals.');
    expect(JSON.parse(window.localStorage.getItem('pingo:admin:startedGames')!)).toEqual([game]);
    expect(screen.getByRole('combobox', { name: 'Switch to game' })).toHaveValue('');
    expect(screen.getByRole('option', { name: `Game ${game}` })).toBeInTheDocument();
    expect(fetchMock.mock.calls.find(([url]) => url === '/api/pingo/create')?.[1]).toMatchObject({
      body: expect.stringContaining('"intervalSeconds":15')
    });
    expect(screen.queryByRole('combobox', { name: 'Time between pin draws' })).not.toBeInTheDocument();
  });

  it('switches to a previously started game without creating another', async () => {
    const first = createGameCode(Date.now() - 60_000);
    const second = createGameCode(Date.now());
    window.localStorage.setItem('pingo:admin:startedGames', JSON.stringify([second, first]));
    window.sessionStorage.setItem('pingo:admin:password', 'pinny');
    const fetchMock = mockRequests(second);
    window.history.replaceState(null, '', '/go');
    render(<PingoApp />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Switch to game' }), { target: { value: first } });
    await screen.findByText('Current pin (1 of 30)');
    expect(window.location.pathname).toBe(`/${first}/go`);
    expect(screen.getByRole('heading', { name: new RegExp(`^Game ${first} started at`) })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/pingo/create')).toHaveLength(0);
  });
});
