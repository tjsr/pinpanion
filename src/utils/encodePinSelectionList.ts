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
  if (psl.availableSetIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined availableSetIds');
  }
  if (psl.wantedSetIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined wantedSetIds');
  }

  const safeAvailableIds = psl.availableIds || [];
  const availableSkipRanges:[number, number][] = findShareGaps(safeAvailableIds);
  const availableString: string = ENABLE_COMPRESSED_LISTS ?
    generateCompressedStringWithHeader(safeAvailableIds, availableSkipRanges) :
    numberArrayToEncodedString(safeAvailableIds);

  const safeAvailableSetIds = psl.availableSetIds || [];
  const availableSetSkipRanges:[number, number][] = findShareGaps(safeAvailableSetIds);
  const availableSetString: string = ENABLE_COMPRESSED_LISTS ?
    generateCompressedStringWithHeader(safeAvailableSetIds, availableSetSkipRanges) :
    numberArrayToEncodedString(safeAvailableSetIds);

  const safeWantedIds: number[] = psl.wantedIds || [];
  const wantedSkipRanges:[number, number][] = findShareGaps(safeWantedIds);
  const wantedString: string = ENABLE_COMPRESSED_LISTS ?
    generateCompressedStringWithHeader(safeWantedIds, wantedSkipRanges) :
    numberArrayToEncodedString(safeWantedIds);

  const safeWantedSetIds: number[] = psl.wantedSetIds || [];
  const wantedSetSkipRanges:[number, number][] = findShareGaps(safeWantedSetIds);
  const wantedSetString: string = ENABLE_COMPRESSED_LISTS ?
    generateCompressedStringWithHeader(safeWantedSetIds, wantedSetSkipRanges) :
    numberArrayToEncodedString(safeWantedSetIds);

  const logParts: string[] = [
    'Creating list with skipped values:',
  ];
  if (availableSkipRanges.length > 0) {
    logParts.push(`A: ${availableSkipRanges}`);
  }
  if (wantedSkipRanges.length > 0) {
    logParts.push(`W: ${wantedSkipRanges}`);
  }
  if (availableSetSkipRanges.length > 0) {
    logParts.push(`AS: ${availableSetSkipRanges}`);
  }
  if (wantedSetSkipRanges.length > 0) {
    logParts.push(`WS: ${wantedSetSkipRanges}`);
  }
  const logString: string = logParts.join(' ');
  console.debug(logString);

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
    if (safeAvailableSetIds.length > 0) {
      params.as = availableSetString;
    }
    if (safeWantedSetIds.length > 0) {
      params.ws = wantedSetString;
    }
  }
  const parts = new URLSearchParams(params);
  return parts.toString();
};
