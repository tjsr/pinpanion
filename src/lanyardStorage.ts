import { PinSelectionList } from './types';

const hasNewerVersionStored = (listId: string, revision: number): boolean => {
  const stored: string | null = localStorage.getItem(`lanyard.${listId}`);
  if (!stored) {
    return false;
  }
  const current: PinSelectionList = JSON.parse(stored);
  return current.revision > revision;
};

export const getStoredLanyardList = (): string[] => {
  return Object.keys(localStorage).filter((k) => k.match(/^lanyard\.(.*)/));
};

export const getStoredLanyards = (): PinSelectionList[] => {
  const keys: string[] = getStoredLanyardList();
  let lanyards: PinSelectionList[] = keys.map((listId) => {
    const data: string | null = localStorage.getItem(listId);
    if (null === data) {
      return undefined;
    }
    return JSON.parse(data);
  });
  lanyards = lanyards.filter((l) => l !== undefined);
  return lanyards;
};

export const getStoredLanyard = (lanyardId: string): PinSelectionList| undefined => {
  const data: string | null = localStorage.getItem(`lanyard.${lanyardId}`);
  if (null === data) {
    return undefined;
  }
  return JSON.parse(data);
};

export const saveListToLocal = (list: PinSelectionList): void => {
  if (!list.id) {
    throw Error(
      'List does not have an ID so can not be saved to local storage.'
    );
  }
  if (hasNewerVersionStored(list.id, list.revision)) {
    throw Error('Already have a newer version of this list stored.');
  }
  localStorage.setItem(`lanyard.${list.id}`, JSON.stringify(list));
  return;
};

export const setActiveLanyardId = (id: string) => {
  localStorage.setItem('latestLanyard', id);
};

export const getActiveLanyardId = ():string|undefined => {
  const id: string | null = localStorage.getItem('latestLanyard');
  if (null === id) {
    return undefined;
  }
  return id;
};

export const getActiveLanyard = (): PinSelectionList|undefined => {
  const id: string|undefined = getActiveLanyardId();
  if (id) {
    return getStoredLanyard(id);
  }
};
