import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App.tsx';
import { createShareUrl } from './utils/shareUrl.ts';
import { getStoredLanyards, saveListToLocal, setActiveLanyardId } from './lanyardStorage.ts';
import { localOwnerId, makeOwnedLanyard, makeSharedLanyard, sharedCatalog } from '../test/fixtures/sharedLanyard.ts';
import type { PinSelectionList } from './types.ts';
import { saveSettings, setUserId } from './settingsStorage.ts';

// Only browser/network boundaries are replaced. Hash decoding, storage, App,
// drawers, editor, dropdown, QR generation and pin rendering are production code.
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  setUserId(localOwnerId);
  saveSettings({
    descendingAge: true,
    displaySize: 'normal',
    localUserId: localOwnerId,
    splitActiveAndWanted: true,
    userDisplayName: undefined,
  });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    if (input === 'pins.json') {
      return { json: async () => structuredClone(sharedCatalog) };
    }
    if (input === 'adjectives.txt') {
      return { text: async () => Array(1024).fill('Friendly').join('\n') };
    }
    if (input === 'animals.txt') {
      return { text: async () => Array(188).fill('Quokka').join('\n') };
    }
    throw new Error(`Unexpected request: ${String(input)}`);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

const visitSharedLink = (lanyard: PinSelectionList): void => {
  // The QR component uses offlineMode=true to include pin and set data.
  window.history.replaceState(null, '', new URL(createShareUrl(lanyard, true)).hash);
};

const mountApp = () => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  return render(<App />, { container: root });
};

const openLanyards = async (): Promise<void> => {
  fireEvent.click(await screen.findByRole('button', { name: /^Lanyards?( \(\d+\))?$/ }));
  await screen.findByRole('combobox', { name: 'Switch lanyard' });
};

const openOptions = () => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Switch lanyard' }));
  return within(screen.getByRole('listbox'));
};

const chooseLanyard = async (name: string): Promise<void> => {
  fireEvent.click(openOptions().getByRole('option', { name }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
};

const expectEditor = (lanyard: PinSelectionList): void => {
  expect(screen.getByRole('textbox', { name: 'List Name' })).toHaveValue(lanyard.name);
  expect(screen.getByRole('textbox', { name: 'Available' })).toHaveValue(lanyard.availableIds.join(','));
  expect(screen.getByRole('textbox', { name: 'Wanted' })).toHaveValue(lanyard.wantedIds.join(','));
  expect(screen.getByRole('textbox', { name: 'Available Sets' })).toHaveValue(lanyard.availableSetIds.join(','));
  expect(screen.getByRole('textbox', { name: 'Wanted Sets' })).toHaveValue(lanyard.wantedSetIds.join(','));
};

describe('issue #3: shared QR/hash lanyards', () => {
  it.each([false, true])('imports a full QR link with existing lanyard=%s, lists it and permits creating an owned list', async (existing) => {
    const shared = makeSharedLanyard();
    const owned = makeOwnedLanyard();
    if (existing) {
      saveListToLocal(owned);
      setActiveLanyardId(owned.id);
    }
    expect(getStoredLanyards()).toHaveLength(existing ? 1 : 0);
    visitSharedLink(shared);
    mountApp();
    await screen.findByRole('heading', { name: `Lanyard for ${shared.name}` });
    expect(screen.getByText('Pinny Arcade Logo')).toBeVisible();
    expect(screen.getAllByText('Merch').some((element) => element.closest('.wantedPins'))).toBe(true);
    expect(screen.queryByText('Chandra')).not.toBeInTheDocument();
    await openLanyards();
    expectEditor(shared);
    expect(screen.getByRole('textbox', { name: 'Available' })).toBeDisabled();
    expect(getStoredLanyards()).toContainEqual(shared);
    const options = openOptions();
    expect(options.getByRole('option', { name: shared.name })).toBeVisible();
    if (existing) expect(options.getByRole('option', { name: owned.name })).toBeVisible();
    expect(options.getByRole('option', { name: 'Create a new lanyard' })).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(options.getByRole('option', { name: 'Create a new lanyard' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'List Name' })).toHaveValue('Friendly Quokka'));
    expect(screen.getByRole('textbox', { name: 'Available' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Wanted' })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: 'Available' }), { target: { value: '13' } });
    await waitFor(() => expect(getStoredLanyards()).toHaveLength(existing ? 3 : 2));
    const created = getStoredLanyards().find((lanyard) => lanyard.name === 'Friendly Quokka')!;
    expect(created).toMatchObject({ availableIds: [13], ownerId: localOwnerId, wantedIds: [], availableSetIds: [], wantedSetIds: [] });
    expect(created.id).not.toBe(shared.id);
    expect(getStoredLanyards()).toContainEqual(shared);
    if (existing) expect(getStoredLanyards()).toContainEqual(owned);
    await chooseLanyard(shared.name);
    expectEditor(shared);
    await chooseLanyard(created.name);
    expectEditor(created);
    // A clean URL restart must recover the last locally selected lanyard.
    cleanup();
    window.history.replaceState(null, '', '/');
    mountApp();
    await openLanyards();
    expectEditor(created);
  }, 10000);

  it('starts an editable blank list without a hash and persists data entered by a fresh user', async () => {
    mountApp();
    await openLanyards();
    expect(getStoredLanyards()).toHaveLength(0);
    const available = screen.getByRole('textbox', { name: 'Available' });
    expect(available).toBeEnabled();
    expect(available).toHaveValue('');
    fireEvent.change(available, { target: { value: '5,13' } });
    await waitFor(() => expect(getStoredLanyards()).toHaveLength(1));
    expect(getStoredLanyards()[0]).toMatchObject({ availableIds: [5, 13], ownerId: localOwnerId });
  });

  it('shows the active shared lanyard as the dropdown selection', async () => {
    const shared = makeSharedLanyard();
    visitSharedLink(shared);
    mountApp();
    await openLanyards();
    expectEditor(shared);
    expect(screen.getByRole('combobox', { name: 'Switch lanyard' })).toHaveTextContent(shared.name);
  });

  it('imports a shared hash navigated to after the app has already mounted', async () => {
    mountApp();
    await openLanyards();
    const shared = makeSharedLanyard();
    await act(async () => {
      visitSharedLink(shared);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await waitFor(() => expectEditor(shared));
    expect(getStoredLanyards()).toContainEqual(shared);

    // Repeated scans and returning to an earlier shared URL must not leave stale data.
    const second = makeOwnedLanyard();
    await act(async () => {
      visitSharedLink(second);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await waitFor(() => expectEditor(second));
    expect(screen.getByRole('textbox', { name: 'Available' })).toBeEnabled();
    await act(async () => {
      visitSharedLink(shared);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await waitFor(() => expectEditor(shared));
    expect(getStoredLanyards()).toHaveLength(2);
  });
});
