import { PinSelectionList } from '../../types';

export const activeLanyard: PinSelectionList = {
  availableIds: [1001, 1003, 1005],
  editable: true,
  id: 'abc123',
  name: 'Test list',
  revision: 2,
  wantedIds: [1002, 997, 994],
};

export const alternativeLanyard2: PinSelectionList = {
  availableIds: [202],
  editable: true,
  id: 'bbb222',
  name: 'Filled list 2',
  revision: 2,
  wantedIds: [201],
};

export const alternativeLanyard3: PinSelectionList = {
  availableIds: [302],
  editable: true,
  id: 'ccc333',
  name: 'Filled list 3',
  revision: 3,
  wantedIds: [301],
};

export const newlyCreatedAlternate: PinSelectionList = {
  availableIds: [402],
  editable: true,
  id: 'ddd444',
  name: 'Some newly created list',
  revision: 1,
  wantedIds: [401],
};

export const newlyCreatedEmpty: PinSelectionList = {
  availableIds: [],
  editable: true,
  id: 'eee555',
  name: 'Some newly created empty list',
  revision: 1,
  wantedIds: [],
};

export const nonEditableList: PinSelectionList = {
  availableIds: [602],
  editable: false,
  id: 'fff666',
  name: 'Non-editable list',
  revision: 1,
  wantedIds: [601],
};

export const storedLanyardList: PinSelectionList[] = [
  activeLanyard,
  alternativeLanyard2,
  alternativeLanyard3,
  nonEditableList,
];
