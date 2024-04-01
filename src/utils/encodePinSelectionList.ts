import { generateCompressedStringWithHeader, numberArrayToEncodedString } from 'sparse-bit-string';

import { PinSelectionList } from '../types';
import { findShareGaps } from './shareUrl';

const ENABLE_COMPRESSED_LISTS = true;

const pushLoggedIds = (parts: string[], prefix: string, ids: number[]) => {
  if (ids.length > 0) {
    parts.push(`${prefix}: ${ids}`);
  }
};

const pushLoggedRanges = (parts: string[], prefix: string, ranges: [number, number][]) => {
  if (ranges.length > 0) {
    parts.push(`${prefix}: ${ranges}`);
  }
};

const safeOrEmptyList = (ids: number[] | undefined): number[] => {
  if (ids === undefined) {
    return [];
  }
  return ids.length > 0 && !ids.includes(0) ? ids : [];
};

export const encodePinSelectionHash = (psl: PinSelectionList, offlineMode = false): string => {
  if (psl.availableIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined availableIds');
  }
  if (psl.wantedIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined wantedIds');
  }
  if (psl.availableSetIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined availableSetIds');
  }
  if (psl.wantedSetIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined wantedSetIds');
  }

  const safeAvailableIds = safeOrEmptyList(psl.availableIds);
  const availableSkipRanges:[number, number][] = findShareGaps(safeAvailableIds);

  const safeAvailableSetIds = safeOrEmptyList(psl.availableSetIds);
  const availableSetSkipRanges:[number, number][] = findShareGaps(safeAvailableSetIds);

  const safeWantedIds: number[] = safeOrEmptyList(psl.wantedIds);
  const wantedSkipRanges:[number, number][] = findShareGaps(safeWantedIds);

  const safeWantedSetIds: number[] = safeOrEmptyList(psl.wantedSetIds);
  const wantedSetSkipRanges:[number, number][] = findShareGaps(safeWantedSetIds);

  const listLogParts: string[] = [
    'Creating list with skipped values:',
  ];
  pushLoggedIds(listLogParts, 'a', safeAvailableIds);
  pushLoggedIds(listLogParts, 'w', safeWantedIds);
  pushLoggedIds(listLogParts, 'as', safeAvailableSetIds);
  pushLoggedIds(listLogParts, 'ws', safeWantedSetIds);

  const skippedLogParts: string[] = [
    'Creating list with skipped values:',
  ];
  pushLoggedRanges(skippedLogParts, 'A', availableSkipRanges);
  pushLoggedRanges(skippedLogParts, 'W', wantedSkipRanges);
  pushLoggedRanges(skippedLogParts, 'AS', availableSetSkipRanges);
  pushLoggedRanges(skippedLogParts, 'WS', wantedSetSkipRanges);
  const logString: string = skippedLogParts.join(' ');
  if (skippedLogParts.length > 1) {
    console.debug(logString);
  }

  const params: any = {
    'id': psl.id,
    'n': psl.name,
    'o': psl.ownerId,
    'r': psl.revision.toString(),
  };

  if (offlineMode) {
    if (safeAvailableIds.length > 0) {
      const availableString: string = ENABLE_COMPRESSED_LISTS && availableSkipRanges.length > 0 ?
        generateCompressedStringWithHeader(safeAvailableIds, availableSkipRanges) :
        numberArrayToEncodedString(safeAvailableIds);

      params.a = availableString;
    }
    if (safeWantedIds.length > 0) {
      const wantedString: string = ENABLE_COMPRESSED_LISTS && wantedSkipRanges.length > 0 ?
        generateCompressedStringWithHeader(safeWantedIds, wantedSkipRanges) :
        numberArrayToEncodedString(safeWantedIds);
      params.w = wantedString;
    }
    if (safeAvailableSetIds.length > 0) {
      const availableSetString: string = ENABLE_COMPRESSED_LISTS && availableSetSkipRanges.length > 0 ?
        generateCompressedStringWithHeader(safeAvailableSetIds, availableSetSkipRanges) :
        numberArrayToEncodedString(safeAvailableSetIds);
      params.as = availableSetString;
    }
    if (safeWantedSetIds.length > 0) {
      const wantedSetString: string = ENABLE_COMPRESSED_LISTS && wantedSetSkipRanges.length > 0 ?
        generateCompressedStringWithHeader(safeWantedSetIds, wantedSetSkipRanges) :
        numberArrayToEncodedString(safeWantedSetIds);
      params.ws = wantedSetString;
    }
  }
  const parts = new URLSearchParams(params);
  return parts.toString();
};
