import type { PinListFilter, PinSelectionList, UserId } from './types.ts';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

export const EMPTY_FILTER: PinListFilter = {};
const PINNYSET_NAMESPACE = '00a260b1-8eef-4674-a837-b17fa267594d';
const USERID_NAMESPACE = '4d80af2c-c829-4e58-a045-d42a303581df';

export const generateListId = (): string => {
  return uuidv5(uuidv4(), PINNYSET_NAMESPACE);
};

export const generateUserId = (): string => {
  return uuidv5(uuidv4(), USERID_NAMESPACE);
};

const EMPTY_SELECTION_LIST: PinSelectionList = {
  availableIds: [],
  availableSetIds: [],
  id: generateListId(),
  name: 'New list',
  ownerId: generateUserId(),
  revision: 0,
  wantedIds: [],
  wantedSetIds: [],
};

export const newSelectionList = (ownerId: UserId): PinSelectionList => {
  return {
    ...EMPTY_SELECTION_LIST,
    ownerId,
  };
};
