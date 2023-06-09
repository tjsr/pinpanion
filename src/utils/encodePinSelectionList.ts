import { PinSelectionList } from '../types';
import { numberArrayToEncodedString } from 'sparse-bit-string';

export const encodePinSelectionHash = (psl: PinSelectionList, offlineMode = false): string => {
  if (psl.availableIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined availableIds');
  }
  if (psl.wantedIds === undefined) {
    console.debug('Input lanyard provided an illegal undefined wantedIds');
  }
  const availableString: string = numberArrayToEncodedString(psl.availableIds || []);
  const wantedString: string = numberArrayToEncodedString(psl.wantedIds || []);

  let params: any = {
    'id': psl.id,
    'n': psl.name,
    'r': psl.revision.toString(),
  };

  if (offlineMode) {
    params = {
      a: availableString,
      w: wantedString,
      ...params,
    };
  }
  const parts = new URLSearchParams(params);

  return parts.toString();
};
