import { Pin, PinListFilter, PinSelectionList, SizesType } from './types';

export const isEmpty = (value: string | undefined): boolean => {
  return value === undefined || value.trim() == '';
};

export const isEmptyList = (lanyard: PinSelectionList): boolean => {
  return (
    (lanyard.availableIds === undefined || lanyard.availableIds?.length === 0) &&
    (lanyard.wantedIds === undefined || lanyard.wantedIds?.length === 0)
  );
};

export const countFilters = (filter: PinListFilter): number => {
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
  if (filter?.paxId !== undefined && filter?.paxId > 0) {
    filters++;
  }
  if (filter?.pinSetId !== undefined && filter?.pinSetId > 0) {
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

export const getMin = (input: number[]): number => {
  return input.reduce((prev, current) => {
    return prev != undefined && prev < current ? prev : current;
  });
};

export const compressArray = (input: number[]): number[] => {
  const min: number = getMin(input);
  return input.map((v) => v-min);
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

export const sanitizePinList = (pinList: PinSelectionList): void => {
  if (pinList.availableIds === undefined) {
    console.trace('A pin list passed to be updated had no availableIds array so is being corrected');
    pinList.availableIds = [];
  }
  if (pinList.wantedIds === undefined) {
    console.trace('A pin list passed to be updated had no wantedIds array so is being corrected');
    pinList.wantedIds = [];
  }
};

