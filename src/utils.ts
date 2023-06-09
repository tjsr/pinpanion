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

export const buildSet = (): string[] => {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('');
};

export const letterToNumbers = (str: string, letters?: string[]): number[] => {
  if (letters == undefined) {
    letters = buildSet();
  }

  const output: number[] = [];
  let value: number = letters.indexOf(str.charAt(str.length-1));
  for (let add = 1;add <= 6;add++) {
    if (value & 1) {
      output.push(add);
    }
    value = value >> 1;
  }
  return output;
};

export const stringToNumberArray = (str: string, letters?: string[]): number[] => {
  if (letters == undefined) {
    letters = buildSet();
  }

  const output: number[] = [];
  const inputArray = str.split('');

  let offset = 1;
  for (let idx = inputArray.length-1;idx >= 0;idx--) {
    const v = inputArray[idx];
    let parts: number[] = letterToNumbers(v, letters);
    parts = parts.map((n) => n + offset - 1);

    parts.forEach((n) => {
      output.push(n);
    });
    offset += 6;
  }

  return output;
};

export const buildNumberFromFlags = (input: number[]): number => {
  if (input.length == 0) {
    return 0;
  }
  input.forEach((n) => {
    if (n > 6) {
      throw new Error('Input numbers must be <64');
    }
  });
  return input.reduce((p, n) => {
    return p | ((1 << n) >> 1);
  }, 0);
};

export const numberToEncodingChar = (input: number, letters?: string[]): string => {
  if (letters === undefined) {
    letters = buildSet();
  }
  if (input > 63) {
    throw Error('Can not encode character >63');
  }
  return letters[input];
};

export const numberArrayToEncodedString = (input: number[]): string => {
  const letters: string[] = buildSet();
  let workingArray: number[] = [...input].sort();
  let outputString = '';
  while (workingArray.length > 0) {
    const tmpArray = workingArray.filter((n) => n <= 6);
    workingArray = workingArray.filter((n) => n > 6).map((n) => n - 6);

    const currentTmpNum = buildNumberFromFlags(tmpArray);
    const currentChar = numberToEncodingChar(currentTmpNum, letters);
    outputString = currentChar + outputString;
  }
  return outputString;
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

