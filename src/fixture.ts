import { PinListFilter, PinSelectionList } from './types';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

export const EMPTY_FILTER: PinListFilter = {};
const PINNYSET_NAMESPACE = '00a260b1-8eef-4674-a837-b17fa267594d';

export const generateListId = (): string => {
  return uuidv5(uuidv4(), PINNYSET_NAMESPACE);
};

export const EMPTY_SELECTION_LIST: PinSelectionList = {
  availableIds: [],
  editable: false,
  id: generateListId(),
  name: 'New list',
  revision: 0,
  wantedIds: [],
};

export const newSelectionList = (): PinSelectionList => {
  return {
    ...EMPTY_SELECTION_LIST,
    editable: true,
  };
};
