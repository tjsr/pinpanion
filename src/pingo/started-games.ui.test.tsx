import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Pin } from '../types.ts';
import { createGameCode, createRegisteredGameCode, hashGamePassword } from './secure.ts';
import { isNewGameCode } from './game.ts';
import { PingoApp } from './PingoApp.tsx';
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

function mockRequests(createdGame: string) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (input === '/pins.json') return Response.json({ pins });
    if (input === '/player') return Response.json({ players: [] });
    if (input === '/api/pingo/create') return Response.json({ game: createdGame });
    if (input === '/api/pingo/admin') {
      const body = JSON.parse(String(init?.body)) as { game: string };
      return Response.json(await testAdminResponse(body.game, 1, Date.now(),
        isNewGameCode(body.game) ? 25 : 30, pins.map(pin => pin.id)));
    }
    throw new Error(`Unexpected request: ${String(input)}`);
  });
}

describe('started Pingo games', () => {
  it('saves a newly created game and shows the switcher', async () => {
    const game = createRegisteredGameCode(Date.now(), 15, 25);
    const fetchMock = mockRequests(game);
    window.history.replaceState(null, '', '/go');
    render(<PingoApp />);
    expect(screen.queryByRole('combobox', { name: 'Switch to game' })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Site admin password'), { target: { value: 'pinny' } });
    fireEvent.change(screen.getByLabelText('Game admin password'), { target: { value: 'game-secret' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Time between pin draws' }), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create game' }));
    await screen.findByText('Current pin (1 of 25)');
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
    expect(fetchMock.mock.calls.find(([url]) => url === '/api/pingo/create')?.[1]).toMatchObject({
      body: expect.stringContaining('"poolSize":25')
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

  it('unlocks an existing registered game with a browser-derived proof', async () => {
    const game = createRegisteredGameCode(Date.now() - 60_000, 30, 25);
    const { salt, hash } = await hashGamePassword('game-secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (input === '/pins.json') return Response.json({ pins });
      if (String(input).startsWith('/api/pingo/salt?')) return Response.json({ salt });
      if (input === '/api/pingo/admin') return Response.json(
        await testAdminResponse(game, 1, Date.now(), 25, pins.map(pin => pin.id)));
      throw new Error(`Unexpected request: ${String(input)} ${String(init?.method)}`);
    });
    window.history.replaceState(null, '', `/${game}/go`);
    render(<PingoApp />);
    fireEvent.change(await screen.findByLabelText('Game admin password'), { target: { value: 'game-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open caller' }));
    await screen.findByText('Current pin (1 of 25)');
    const adminCall = fetchMock.mock.calls.find(([url]) => url === '/api/pingo/admin');
    expect(JSON.parse(String(adminCall?.[1]?.body))).toMatchObject({ game, passwordProof: hash });
    expect(String(adminCall?.[1]?.body)).not.toContain('game-secret');
  });

  it('shows a service error when Cloudflare returns HTML', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/pins.json') return Response.json({ pins });
      return new Response('<!DOCTYPE html>', { status: 503,
        headers: { 'Content-Type': 'text/html' } });
    });
    window.history.replaceState(null, '', '/go');
    render(<PingoApp />);
    fireEvent.change(await screen.findByLabelText('Site admin password'), { target: { value: 'pinny' } });
    fireEvent.change(screen.getByLabelText('Game admin password'), { target: { value: 'game-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create game' }));
    expect(await screen.findByText(/Pingo service is temporarily unavailable \(HTTP 503\)/)).toBeInTheDocument();
  });

  it('advances timed draws locally without another admin request', async () => {
    const game = createRegisteredGameCode(Date.now() - 150_000, 30, 25);
    const { salt } = await hashGamePassword('game-secret');
    let nowMs = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (input === '/pins.json') return Response.json({ pins });
      if (String(input).startsWith('/api/pingo/salt?')) return Response.json({ salt });
      if (input === '/api/pingo/admin') return Response.json(await testAdminResponse(
        game, 1, Date.now() - 91_000, 25, pins.map(pin => pin.id)));
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    window.history.replaceState(null, '', `/${game}/go`);
    render(<PingoApp />);
    fireEvent.change(await screen.findByLabelText('Game admin password'), { target: { value: 'game-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open caller' }));
    await screen.findByText('Current pin (1 of 25)');
    nowMs += 10_000;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1_250)); });
    await screen.findByText('Current pin (4 of 25)');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/pingo/admin')).toHaveLength(1);
  }, 8_000);

  it('counts down after the final pin and opens the successor caller with a new join code', async () => {
    const game = createRegisteredGameCode(Date.now() - 60_000, 10, 25);
    const nextGame = createRegisteredGameCode(Date.now(), 10, 25);
    const finalAt = Date.now() - 49_000;
    const { salt } = await hashGamePassword('game-secret');
    window.sessionStorage.setItem(`pingo:admin:password:${game}`, 'game-secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (input === '/pins.json') return Response.json({ pins });
      if (String(input).startsWith('/api/pingo/salt?')) return Response.json({ salt });
      if (input === '/api/pingo/rollover') return Response.json({ game: nextGame, intervalMs: 10_000, poolSize: 25 });
      if (input === '/api/pingo/admin') {
        const body = JSON.parse(String(init?.body)) as { game: string };
        return Response.json(await testAdminResponse(body.game, body.game === game ? 25 : 1,
          body.game === game ? finalAt : Date.now(), 25, pins.map(pin => pin.id)));
      }
      throw new Error(`Unexpected request: ${String(input)}`);
    });
    window.history.replaceState(null, '', `/${game}/go`);
    render(<PingoApp />);
    expect(await screen.findByRole('heading', { name: new RegExp(`Game ${game} concluded at.*New game starting in 00:01`) })).toBeInTheDocument();
    expect(screen.getByText('All pins called')).toBeInTheDocument();
    await screen.findByRole('heading', { name: new RegExp(`Game ${nextGame} started at`) }, { timeout: 3_000 });
    expect(window.location.pathname).toBe(`/${nextGame}/go`);
    expect(screen.getByRole('img', { name: `QR code to join game ${nextGame}` })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(`pingo:admin:password:${nextGame}`)).toBe('game-secret');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/pingo/rollover')).toHaveLength(1);
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => url === '/api/pingo/rollover')?.[1]?.body)))
      .toMatchObject({ game, pin: 25, at: finalAt, sig: expect.any(String) });
  });
});
