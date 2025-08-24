import type { Pin, PinListFilter, PinSelectionList, PinSet, SizesType, UserId } from './types.ts';

import type { ApplicationSettings } from './settingsStorage.ts';
import type { Pinnypals3ItemDataEvent } from './pinnypals/pinnypals3types.ts';
import { PinnypalsEventSubtypeError } from './pinnypals/pinnypalsDataErrors.ts';

export const PinSetKeys = ['availableIds', 'wantedIds', 'availableSetIds', 'wantedSetIds'] as const;
export type PinSetKey = (typeof PinSetKeys)[number];

export const isEmpty = (value: string | undefined): boolean => {
  return value === undefined || value.trim() == '';
};

export const isEmptyList = (lanyard: PinSelectionList): boolean => {
  return PinSetKeys.every((key: PinSetKey) => lanyard[key] === undefined || lanyard[key]?.length === 0);
};

export const countFilters = (filter: PinListFilter, filteredSetsOnly = false): number => {
  let filters = 0;
  if (filter.endYear) {
    filters++;
  }
  if (filter.startYear) {
    filters++;
  }
  if (!isEmpty(filter.filterText)) {
    filters++;
  }
  if (!filteredSetsOnly && (filter?.paxType !== undefined || filter.paxEventId !== undefined)) {
    filters++;
  }
  if (filteredSetsOnly && filter?.pinSetId !== undefined && filter?.pinSetId > 0) {
    filters++;
  }
  return filters;
};

export const getPinClassForSize = (size: SizesType): string => {
  if (['tiny', 'sm', 'normal', 'large'].indexOf(size as string) < 0) {
    return 'pin pin-normal';
  }
  return `pin pin-${size}`;
};

export const getPinSetClassForSize = (size: SizesType): string => {
  if (['tiny', 'sm', 'normal', 'large'].indexOf(size as string) < 0) {
    return 'pinSet set-normal';
  }
  return `pinSet set-${size}`;
};

export const getMin = (input: number[]): number => {
  return input.reduce((prev, current) => {
    return prev != undefined && prev < current ? prev : current;
  });
};

export const compressArray = (input: number[]): number[] => {
  const min: number = getMin(input);
  return input.map((v) => v - min);
};

export const isPinOnLanyard = (pin: Pin, lanyard: PinSelectionList): boolean => {
  if (lanyard.availableIds !== undefined && lanyard.availableIds.includes(+pin.id)) {
    return true;
  }
  if (lanyard.wantedIds !== undefined && lanyard.wantedIds.includes(+pin.id)) {
    return true;
  }
  return false;
};

export const isPinSetOnLanyard = (pinSet: PinSet, lanyard: PinSelectionList): boolean => {
  if (lanyard.availableSetIds !== undefined && lanyard.availableSetIds.includes(+pinSet.id)) {
    return true;
  }
  if (lanyard.wantedSetIds !== undefined && lanyard.wantedSetIds.includes(+pinSet.id)) {
    return true;
  }
  return false;
};

export const sanitizeListElement = (pinList: PinSelectionList, key: PinSetKey): void => {
  if (pinList !== undefined && pinList[key] === undefined) {
    console.trace(`A pin list passed to be updated had no ${key} array so is being corrected`);
    pinList[key] = [];
  }
};

export const sanitizePinList = (pinList: PinSelectionList, settings: ApplicationSettings): void => {
  PinSetKeys.forEach((setKey: PinSetKey) => sanitizeListElement(pinList, setKey));

  if (pinList.ownerId === undefined) {
    pinList.ownerId = settings.localUserId;
  }
};

export const isEditable = (userId: UserId, pinList: PinSelectionList): boolean => {
  return pinList.ownerId === userId;
};
export const stripPathFromImageLocation = (inputLocation: string): string => {
  const pathParts: string[] = inputLocation.split('/');
  let workingPath = pathParts[pathParts.length - 1];

  if (workingPath.includes('?')) {
    workingPath = workingPath.split('?')[0];
  }
  return workingPath;
};

export const toProperCase = (str: string): string =>
  str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
export const checkEventSubtype = (inputEvent: Pinnypals3ItemDataEvent): void => {
  if (
    inputEvent.subType === undefined ||
    !['PAX_WEST', 'PAX_EAST', 'PAX_AUS', 'PAX_SOUTH', 'PAX_UNPLUGGED', 'PAX_ONLINE'].includes(inputEvent.subType)
  ) {
    throw new PinnypalsEventSubtypeError(inputEvent.subType, inputEvent);
  }
};
