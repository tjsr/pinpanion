import { PinSetKey, PinSetKeys } from '../utils';
import { extractCompressedBitstring, stringToNumberArray } from 'sparse-bit-string';

import { PinSelectionList } from '../types';

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

const paramKeys = {
  availableIds: 'a',
  availableSetIds: 'as',
  wantedIds: 'w',
  wantedSetIds: 'ws',
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

  const setOutputProperty = (urlParam: string, listKey: 'id' | 'name' | 'ownerId'): void => {
    if (params.has(urlParam)) {
      outputSet[listKey] = params.get(urlParam)!;
    } else {
      throw new Error(`An imported PinSelectionList must have a ${listKey}`);
    }
  };

  setOutputProperty('id', 'id');
  setOutputProperty('n', 'name');
  setOutputProperty('o', 'ownerId');

  PinSetKeys.forEach((key: PinSetKey) => {
    const paramKey: string = paramKeys[key];
    let value: string|undefined = undefined;
    try {
      if (params.has(paramKey.toUpperCase())) {
        value = params.get(paramKey.toUpperCase())!;
        const decodedList: number[] = extractCompressedBitstring(value);
        outputSet[key] = decodedList;
      } else if (params.has(paramKey)) {
        value = params.get(paramKey)!;
        const decodedList: number[] = stringToNumberArray(value);
        outputSet[key] = decodedList;
      } else {
        outputSet[key] = [];
      }
    } catch (err) {
      console.error(`Failed while decoding ${key} lanyard data "${value}"`, err);
      throw err;
    }
  });

  return outputSet;
};
