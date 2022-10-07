import { PinListFilter, PinSelectionList, SizesType } from './types';

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

export const stringToNumberArray = (str: string, letters?: string[]): number[] => {
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

  let offset = 7;
  for (let index = str.length - 2;index >= 0; index--) {
    let value: number = letters.indexOf(str.charAt(index));
    // value++;
    // if (index < str.length-1) {
    //   value++;
    // }
    for (let add = 1;add <= 6;add++) {
      if (value & 1) {
        output.push(add + offset);
      }
      value = value >> 1;
    }
    // First time through our index was 0 so adding 1 to it gave 0. But now it needs to meet the char boundary each time
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
    workingArray = workingArray.filter((n) => n > 6).map((n) => n - 7);
    // if (workingArray.length == 0 && outputString != '') {
    //   tmpArray = tmpArray.map((n) => n-1);
    // }

    const currentTmpNum = buildNumberFromFlags(tmpArray);
    const currentChar = numberToEncodingChar(currentTmpNum, letters);
    outputString = currentChar + outputString;
    console.log('Remaining array', workingArray);
  }
  return outputString;
};
