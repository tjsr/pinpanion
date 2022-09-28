import { PinListFilter, SizesType } from './types';

export const isEmpty = (value: string | undefined): boolean => {
  return value === undefined || value.trim() == '';
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
