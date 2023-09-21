import { generateCompressedStringWithHeader, numberArrayToEncodedString } from 'sparse-bit-string';

import { PinSelectionList } from '../types';
import { findShareGaps } from './shareUrl';

const ENABLE_COMPRESSED_LISTS = true;

export const encodePinSelectionHash = (psl: PinSelectionList, offlineMode = false): string => {
  if (psl.availableIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined availableIds');
  }
  if (psl.wantedIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined wantedIds');
  }
  const safeAvailableIds = psl.availableIds || [];
  const availableSkipRanges:[number, number][] = findShareGaps(safeAvailableIds);
  const availableString: string = ENABLE_COMPRESSED_LISTS ?
    generateCompressedStringWithHeader(safeAvailableIds, availableSkipRanges) :
    numberArrayToEncodedString(safeAvailableIds);

  const safeWantedIds: number[] = psl.wantedIds || [];
  const wantedSkipRanges:[number, number][] = findShareGaps(safeWantedIds);
  const wantedString: string = ENABLE_COMPRESSED_LISTS ?
    generateCompressedStringWithHeader(safeWantedIds, wantedSkipRanges) :
    numberArrayToEncodedString(safeWantedIds);

  console.debug(`Creating list with skipped values: A: ${availableSkipRanges} W: ${wantedSkipRanges}`);

  const params: any = {
    'id': psl.id,
    'n': psl.name,
    'o': psl.ownerId,
    'r': psl.revision.toString(),
  };

  if (offlineMode) {
    if (safeAvailableIds.length > 0) {
      params.a = availableString;
    }
    if (safeWantedIds.length > 0) {
      params.w = wantedString;
    }
  }
  const parts = new URLSearchParams(params);

  return parts.toString();
};
