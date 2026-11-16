import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Pin } from '../types.ts';
import { createGameCode, createRegisteredGameCode, hashGamePassword } from './secure.ts';
import { ManageLoginPage, PingoApp, routeFromLocation } from './PingoApp.tsx';
import { testAdminResponse } from './testAdminResponse.ts';

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

describe('Pingo game management', () => {
  it('opens the two-password login from the navbar and enters the correct game admin page', async () => {
    const game = createGameCode(Date.now() - 60_000);
    window.history.replaceState(null, '', `/ACDE?game=${game}`);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (url === '/pins.json') return Response.json({ pins });
      if (url === '/player') return Response.json({ players: [] });
      if (String(url).startsWith('/api/pingo/game-mode?')) return Response.json({ game });
      if (url === '/api/pingo/manage-login') {
        const body = JSON.parse(String(options?.body)) as {
          game: string; sitePassword: string; gamePassword: string;
        };
        return body.sitePassword === 'system-secret' && body.gamePassword === 'game-secret' ?
          Response.json({ game: body.game }) :
          Response.json({ error: 'Incorrect system or game admin password.' }, { status: 401 });
      }
      if (url === '/api/pingo/admin') return Response.json(await testAdminResponse(
        game, 1, Date.now(), pins.length, pins.map(pin => pin.id)));
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    render(<PingoApp />);
    await screen.findByRole('heading', { name: 'Pingo Board ACDE' });
    expect(screen.queryByRole('button', { name: 'Run a game' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage game' }));
    expect(routeFromLocation()).toEqual({ kind: 'manage', game });
    expect(screen.getByRole('textbox', { name: 'Game code' })).toHaveValue(game);
    fireEvent.change(screen.getByLabelText('System admin password'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('Game admin password'), { target: { value: 'game-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open game admin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect system or game admin password.');
    expect(window.location.pathname).toBe('/manage');
    fireEvent.change(screen.getByLabelText('System admin password'), { target: { value: 'system-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open game admin' }));
    await screen.findByText('Pin 1 of 30');
    expect(window.location.pathname).toBe(`/${game}/admin`);
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/pingo/manage-login')).toHaveLength(2);
  });

  it('derives the game proof before submitting a registered game login', async () => {
    const game = createRegisteredGameCode(Date.now() - 60_000, 30, 25);
    const prefix = game.split('-')[0];
    const { salt, hash } = await hashGamePassword('game-secret');
    const navigate = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
      if (String(url).startsWith('/api/pingo/game-mode?')) return Response.json({ game });
      if (String(url).startsWith('/api/pingo/salt?')) return Response.json({ salt });
      if (url === '/api/pingo/manage-login') return Response.json({ game });
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    render(<ManageLoginPage initialGame={prefix} navigate={navigate} />);
    expect(screen.getByRole('textbox', { name: 'Game code' })).toHaveValue(prefix);
    fireEvent.change(screen.getByLabelText('System admin password'), { target: { value: 'system-secret' } });
    fireEvent.change(screen.getByLabelText('Game admin password'), { target: { value: 'game-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open game admin' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/${game}/admin`));
    const request = fetchMock.mock.calls.find(([url]) => url === '/api/pingo/manage-login');
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      game, sitePassword: 'system-secret', passwordProof: hash,
    });
    expect(window.sessionStorage.getItem(`pingo:admin:password:${game}`)).toBe('game-secret');
  });
});
