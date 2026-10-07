import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { createGameCode } from './secure.ts';
import { AdminPage } from './PingoApp.tsx';
import { testAdminResponse } from './testAdminResponse.ts';

vi.mock('../components/PinInfo.tsx', () => ({
  PinInfo: ({ pin }: { pin: Pin }) => <div>{pin.name}</div>
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('Pingo caller players', () => {
  it('opens a registered player verification in a new tab', async () => {
    const game = createGameCode(Date.now());
    const pins = Array.from({ length: 30 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/player') return Response.json({ players: [
        { registrationId: '0123456789abcdef0123456789abcdef', gameCode: game,
          boardId: 'ACDE', playerName: 'Alice', updatedAt: Date.now() }
      ] });
      return Response.json(await testAdminResponse(game, 1, Date.now(), 30, pins.map(pin => pin.id)));
    });
    render(<AdminPage view="admin" game={game} pins={pins} feed={{} as PinCollectionData} onGameStarted={vi.fn()} navigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Admin password'), { target: { value: 'pinny' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open admin' }));
    await screen.findByText('Pin 1 of 30');
    expect(window.location.pathname).toBe(`/${game}/admin`);
    expect(screen.getByRole('link', { name: 'Back to Caller page' })).toHaveAttribute('href', expect.stringContaining(`/${game}/go?`));
    expect(screen.getByText('Check a board')).toBeInTheDocument();
    expect(screen.getByText('Call list')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: `Alice · Game ${game} · Board ACDE` });
    expect(link).toHaveAttribute('href', expect.stringContaining(`/${game}/verify/ACDE?`));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('reopens a caller after refresh without asking for the password again', async () => {
    const game = createGameCode(Date.now());
    const pins = Array.from({ length: 30 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/player') return Response.json({ players: [] });
      return Response.json(await testAdminResponse(game, 1, Date.now(), 30, pins.map(pin => pin.id)));
    });
    const props = { game, pins, feed: {} as PinCollectionData, onGameStarted: vi.fn(), navigate: vi.fn() };
    const first = render(<AdminPage {...props} />);
    fireEvent.change(screen.getByLabelText('Admin password'), { target: { value: 'pinny' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open caller' }));
    await screen.findByText('Current pin (1 of 30)');
    expect(screen.queryByText('Check a board')).not.toBeInTheDocument();
    expect(screen.queryByText('Call list')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('pingo:admin:password')).toBe('pinny');
    first.unmount();

    const resumedAt = Date.now() + 10_000;
    vi.spyOn(Date, 'now').mockReturnValue(resumedAt);
    render(<AdminPage {...props} />);
    await screen.findByText('Current pin (1 of 30)');
    expect(screen.queryByLabelText('Admin password')).not.toBeInTheDocument();
    const adminCalls = fetchMock.mock.calls.filter(([url]) => url === '/api/pingo/admin');
    expect(adminCalls).toHaveLength(2);
    expect(adminCalls[1][1]).toMatchObject({
      body: expect.stringContaining('"password":"pinny"')
    });
  });

  it('keeps the draw action in the current pin panel', async () => {
    const game = createGameCode(Date.now());
    const pins = Array.from({ length: 30 }, (_, id) =>
      ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
    window.sessionStorage.setItem('pingo:admin:password', 'pinny');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => input === '/player' ?
      Response.json({ players: [] }) : Response.json(await testAdminResponse(
        game, 1, Date.now(), 30, pins.map(pin => pin.id))));
    render(<AdminPage game={game} pins={pins} feed={{} as PinCollectionData} onGameStarted={vi.fn()} navigate={vi.fn()} />);
    await screen.findByText('Current pin (1 of 30)');
    const panel = document.querySelector('.pingo-current') as HTMLElement;
    expect(panel).toContainElement(screen.getByRole('button', { name: 'Next pin now' }));
    expect(screen.queryByText('Pin 1 of 30')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next pin now' }));
    await screen.findByText('Current pin (2 of 30)');
    fireEvent.click(screen.getByRole('button', { name: 'Next pin now' }));
    await screen.findByText('Current pin (3 of 30)');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/pingo/admin')).toHaveLength(1);
  });
});
