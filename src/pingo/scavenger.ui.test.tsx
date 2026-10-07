import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pin } from '../types.ts';
import { boardCodeForGame, boardPins } from './game.ts';
import { loadBoardPhotos } from './scavenger.ts';
import { createGameCode, createRegisteredGameCode } from './secure.ts';
import { BoardPage, routeFromLocation, ScavengerJoinPage } from './PingoApp.tsx';

vi.mock('../components/PinInfo.tsx', () => ({
  PinInfo: ({ pin }: { pin: Pin }) => <div>{pin.name}</div>
}));
vi.mock('./ScavengerHunt.tsx', () => ({
  HuntPhotoCard: ({ pin }: { pin: Pin }) => <div>Saved photo of {pin.name}</div>,
  HuntPhotoPreview: ({ pin }: { pin: Pin }) => <img alt={`Full photo of ${pin.name}`} src="blob:test" />,
  HuntCaptureDialog: ({ pin }: { pin: Pin }) => <div role="dialog">Camera for {pin.name}</div>
}));
vi.mock('./scavenger.ts', async importOriginal => {
  const actual = await importOriginal<typeof import('./scavenger.ts')>();
  return { ...actual, boardStartedAt: () => 1_000, loadBoardPhotos: vi.fn(async () => []) };
});

const pins = Array.from({ length: 30 }, (_, id) =>
  ({ id, name: `Pin ${id}`, image_name: `pin-${id}.webp` })) as Pin[];
const feed = {} as PinCollectionData;

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.mocked(loadBoardPhotos).mockResolvedValue([]);
});
afterEach(() => vi.unstubAllGlobals());

describe('direct scavenger join', () => {
  it('routes a game code to nickname entry and opens a newly assigned hunt board', async () => {
    const user = userEvent.setup();
    const game = createRegisteredGameCode(Date.now() - 60_000, 30, 25);
    const board = boardCodeForGame('ACDE', game);
    window.history.replaceState(null, '', `/scavenger/${game}`);
    expect(routeFromLocation()).toEqual({ kind: 'scavenger', game });
    const navigate = vi.fn();
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => Response.json({
      gameCode: game, boardId: board, nickname: 'Alice', createdAt: 123_000, existing: false
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ScavengerJoinPage game={game} navigate={navigate} />);
    expect(screen.getByRole('button', { name: 'Get scavenger board' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Nickname' }), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Get scavenger board' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/${board}?game=${game}&hunt=1`));
    expect(window.localStorage.getItem(`pingo:board:${board}:createdAt`)).toBe('123000');
    expect(window.localStorage.getItem(`pingo:board:${board}:huntMode`)).toBe('true');
    expect(window.localStorage.getItem('pingo:scavenger:deviceId')).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).nickname).toBe('Alice');
    window.history.replaceState(null, '', `/${board}?game=${game}&hunt=1`);
    expect(routeFromLocation()).toMatchObject({ kind: 'board', board, assignedHunt: true });
  });

  it('shows the daily limit and opens the existing board', async () => {
    const user = userEvent.setup();
    const game = createGameCode(Date.now() - 60_000);
    const navigate = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      gameCode: game, boardId: 'ACDE', nickname: 'Alice', createdAt: 123_000, existing: true
    })));
    render(<ScavengerJoinPage game={game} navigate={navigate} />);
    await user.type(screen.getByRole('textbox', { name: 'Nickname' }), 'Alice');
    await user.click(screen.getByRole('button', { name: 'Get scavenger board' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'a maximum of one board may be generated per day for this game.');
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Open existing board' }));
    expect(navigate).toHaveBeenCalledWith(`/ACDE?game=${game}&hunt=1`);
  });

  it('sends an assigned board back through the daily assignment route', async () => {
    const user = userEvent.setup();
    const game = createGameCode(Date.now() - 60_000);
    const navigate = vi.fn();
    render(<BoardPage code="ACDE" initialGame={game} assignedHunt pins={pins}
      feed={feed} navigate={navigate} onHuntModeChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Pingo Board ACDE - Scavenger Hunt!' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New board' }));
    expect(navigate).toHaveBeenCalledWith(`/scavenger/${game}`);
  });
});

describe('Pingo scavenger hunt board', () => {
  it('requires confirmation and replaces the player controls after OK', async () => {
    const user = userEvent.setup();
    render(<BoardPage code="ACDE" pins={pins} feed={feed} navigate={vi.fn()}
      onHuntModeChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Pingo Board ACDE' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Scavenger hunt Mode' }));
    expect(screen.getByText(/Only photos taken after your board is generated will be valid/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy board link' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Scavenger hunt Mode' }));
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Pingo Board ACDE - Scavenger Hunt!' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'New board' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run a game' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem('pingo:board:ACDE:huntMode')).toBe('true');
  });

  it('previews a saved photo before offering replacement', async () => {
    const user = userEvent.setup();
    const pin = boardPins('ACDE', pins)[0];
    window.localStorage.setItem('pingo:board:ACDE:huntMode', 'true');
    vi.mocked(loadBoardPhotos).mockResolvedValue([{
      key: `ACDE:${pin.id}`, boardCode: 'ACDE', pinId: pin.id,
      capturedAt: 1_001, blob: new Blob(['photo'], { type: 'image/jpeg' })
    }]);
    render(<BoardPage code="ACDE" pins={pins} feed={feed} navigate={vi.fn()}
      onHuntModeChange={vi.fn()} />);
    const photo = await screen.findByRole('button', { name: `${pin.name}, view photo` });
    await user.click(photo);
    const preview = screen.getByRole('dialog', { name: `Photo of ${pin.name}` });
    expect(within(preview).getByRole('img', { name: `Full photo of ${pin.name}` })).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: 'OK' })).toHaveClass('MuiButton-containedPrimary');
    expect(within(preview).getByRole('button', { name: 'Cancel' })).toHaveClass('MuiButton-outlinedSecondary');
    await user.click(within(preview).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(`Camera for ${pin.name}`)).not.toBeInTheDocument();
    await user.click(photo);
    await user.click(within(screen.getByRole('dialog', { name: `Photo of ${pin.name}` }))
      .getByRole('button', { name: 'OK' }));
    const warning = screen.getByRole('dialog', { name: 'Replace photo' });
    expect(within(warning).getByText(`This will replace the current photo for ${pin.name}`)).toBeInTheDocument();
    await user.click(within(warning).getByRole('button', { name: 'OK' }));
    expect(screen.getByText(`Camera for ${pin.name}`)).toBeInTheDocument();
  });
});
