import type { PinSelectionList } from '../../types.ts';

export const activeLanyard: PinSelectionList = {
  availableIds: [1001, 1003, 1005],
  availableSetIds: [202],
  id: 'abc123',
  name: 'Test list',
  ownerId: 'o123',
  revision: 2,
  wantedIds: [1002, 997, 994],
  wantedSetIds: [201],
};

export const alternativeLanyard2: PinSelectionList = {
  availableIds: [202],
  availableSetIds: [1001, 1003, 1005],
  id: 'bbb222',
  name: 'Filled list 2',
  ownerId: 'o123',
  revision: 2,
  wantedIds: [201],
  wantedSetIds: [1002, 997, 994],
};

export const alternativeLanyard3: PinSelectionList = {
  availableIds: [302],
  availableSetIds: [402],
  id: 'ccc333',
  name: 'Filled list 3',
  ownerId: 'o123',
  revision: 3,
  wantedIds: [301],
  wantedSetIds: [401],
};

export const newlyCreatedAlternate: PinSelectionList = {
  availableIds: [402],
  availableSetIds: [302],
  id: 'ddd444',
  name: 'Some newly created list',
  ownerId: 'o123',
  revision: 1,
  wantedIds: [401],
  wantedSetIds: [301],
};

export const newlyCreatedEmpty: PinSelectionList = {
  availableIds: [],
  availableSetIds: [],
  id: 'eee555',
  name: 'Some newly created empty list',
  ownerId: 'o123',
  revision: 1,
  wantedIds: [],
  wantedSetIds: [],
};

export const nonEditableList: PinSelectionList = {
  availableIds: [602],
  availableSetIds: [702],
  id: 'fff666',
  name: 'Non-editable list',
  ownerId: 'o123',
  revision: 1,
  wantedIds: [601],
  wantedSetIds: [701],
};

export const storedLanyardList: PinSelectionList[] = [
  activeLanyard,
  alternativeLanyard2,
  alternativeLanyard3,
  nonEditableList,
];
