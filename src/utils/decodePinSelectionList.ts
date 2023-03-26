import { PinSelectionList } from '../types';
import { stringToNumberArray } from '../utils';

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
  const params: Map<string, string> = urlParamsToMap(hashString);

  const outputSet: PinSelectionList = {
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
    const decodedAvailable: number[] = stringToNumberArray(params.get('a')!);
    outputSet.availableIds = decodedAvailable;
  }

  if (params.has('w')) {
    const decodedWanted: number[] = stringToNumberArray(params.get('w')!);
    outputSet.wantedIds = decodedWanted;
  }

  return outputSet;
};
