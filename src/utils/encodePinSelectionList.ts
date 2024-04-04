import { PinSetKey, PinSetKeys } from '../utils';
import { generateCompressedStringWithHeader, numberArrayToEncodedString } from 'sparse-bit-string';

import { PinSelectionList } from '../types';
import { findShareGaps } from './shareUrl';

const ENABLE_COMPRESSED_LISTS = true;

const safeOrEmptyList = (ids: number[] | undefined): number[] => {
  if (ids === undefined) {
    return [];
  }
  return ids.length > 0 && !ids.includes(0) ? ids : [];
};

const paramKeys = {
  availableIds: 'a',
  availableSetIds: 'as',
  wantedIds: 'w',
  wantedSetIds: 'ws',
};

export const encodePinSelectionHash = (psl: PinSelectionList, offlineMode = false): string => {
  const outputParams: any = {
    'id': psl.id,
    'n': psl.name,
    'o': psl.ownerId,
    'r': psl.revision.toString(),
  };

  PinSetKeys.forEach((key: PinSetKey) => {
    if (psl[key] === undefined) {
      console.trace(`Input lanyard provided an illegal undefined ${key}`);
    }
    const safeIds: number[] = safeOrEmptyList(psl[key]);
    const skipRanges: [number, number][] = findShareGaps(safeIds);

    const paramKey: string = paramKeys[key];
    if (offlineMode && safeIds.length > 0) {
      if (ENABLE_COMPRESSED_LISTS && skipRanges.length > 0) {
        outputParams[paramKey.toUpperCase()] = generateCompressedStringWithHeader(safeIds, skipRanges);
      } else {
        outputParams[paramKey] = numberArrayToEncodedString(safeIds);
      }
    }
  });

  const parts = new URLSearchParams(outputParams);
  return parts.toString();
};
