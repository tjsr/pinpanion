import type { PinCollectionData } from '../../src/pinnypals/pinnypals3convertor.ts';
import type { PinSelectionList } from '../../src/types.ts';
import catalog from '../pinpanion-pin-data.json';

export const localOwnerId = '0d2292d3-7c8c-455a-bcb6-13ae0f195406';

// Real catalog records, kept small enough to render the complete App in jsdom.
export const sharedCatalog: PinCollectionData = {
  ...catalog,
  pins: catalog.pins.filter((pin) => [5, 8, 13].includes(pin.id)),
  sets: catalog.sets.filter((set) => [1, 8].includes(set.id)),
} as PinCollectionData;

// Return fresh arrays: the production serializer sorts lists in place.
export const makeSharedLanyard = (overrides: Partial<PinSelectionList> = {}): PinSelectionList => ({
  availableIds: [5],
  availableSetIds: [1],
  id: '1063242d-c237-4b43-bfb2-d9756c5f60c1',
  name: 'PAX Aus trading & wish list',
  ownerId: '750086a8-30b7-4a68-a67f-c2387d56560e',
  revision: 3,
  wantedIds: [8],
  wantedSetIds: [8],
  ...overrides,
});

export const makeOwnedLanyard = (): PinSelectionList => makeSharedLanyard({
  availableIds: [13],
  availableSetIds: [],
  id: '4c708e71-de0b-4813-9edb-06c5b1e3a161',
  name: 'My existing trade list',
  ownerId: localOwnerId,
  wantedIds: [],
  wantedSetIds: [],
});
