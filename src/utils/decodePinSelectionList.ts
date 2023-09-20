import { extractCompressedBitstring, stringToNumberArray } from 'sparse-bit-string';

import { PinSelectionList } from '../types';

const ENABLE_COMPRESSED_LISTS = true;

const decodeQueryParam = (p: string): string => {
  return decodeURIComponent(p.replace(/\+/g, ' '));
};

const urlParamsToMap = (hashString: string): Map<string, string> => {
  const params: Map<string, string> = new Map();
  hashString.split('&').forEach(
    (pair) => {
      const pairArr = pair.split('=');
      params.set(pairArr[0], decodeQueryParam(decodeURIComponent(pairArr[1])));
    } );
  return params;
};

export const decodePinSelectionHash = (hashString: string): PinSelectionList => {
  if (hashString.startsWith('#')) {
    hashString = hashString.substring(1);
  }
  const params: Map<string, string> = urlParamsToMap(hashString);

  const outputSet: PinSelectionList = {
    revision: 1,
  } as PinSelectionList;

  if (params.has('r')) {
    try {
      const rev: number = parseInt(params.get('r')!);
      outputSet.revision = rev;
    } catch (err) {
      throw new Error('Provided revision number was not a numeric value');
    }
  }

  if (params.has('id')) {
    outputSet.id = params.get('id')!;
  } else {
    throw new Error('An imported PinSelectionList must have an id');
  }

  if (params.has('n')) {
    outputSet.name = params.get('n')!;
  } else {
    throw new Error('An imported PinSelectionList must have a name');
  }

  if (params.has('a')) {
    const availableValue: string = params.get('a')!;
    try {
      const decodedAvailable: number[] = ENABLE_COMPRESSED_LISTS ?
        extractCompressedBitstring(availableValue) :
        stringToNumberArray(availableValue);
      outputSet.availableIds = decodedAvailable;
    } catch (err) {
      console.error(`Failed while decoding available lanyard data "${availableValue}"`, err);
      throw err;
    }
  } else {
    outputSet.availableIds = [];
  }

  if (params.has('w')) {
    const wantedValue: string = params.get('w')!;
    try {
      const decodedWanted: number[] = ENABLE_COMPRESSED_LISTS ?
        extractCompressedBitstring(wantedValue) :
        stringToNumberArray(wantedValue);
      outputSet.wantedIds = decodedWanted;
    } catch (err) {
      console.error(`Failed while decoding wanted lanyard data "${wantedValue}"`, err);
      throw err;
    }
  } else {
    outputSet.wantedIds = [];
  }

  return outputSet;
};
