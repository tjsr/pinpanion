import { Pin, PinSelectionList } from './types';
import {
  compressArray,
  getMin,
  isEmpty,
  isEmptyList,
  isPinOnLanyard,
  sanitizeListElement,
  sanitizePinList
} from './utils';

import { ApplicationSettings } from './settingsStorage';

describe('getMin', () => {
  test('Should get only element in array', () => {
    expect(getMin([7])).toEqual(7);
  });
  test('Should get only zero in array', () => {
    expect(getMin([0])).toEqual(0);
  });
  test('Should give 0 when present', () => {
    expect(getMin([7, 2, 1, 0])).toEqual(0);
  });
  test('Should give 0 when at start', () => {
    expect(getMin([0, 7, 2, 1, 0])).toEqual(0);
  });
  test('Should give smallest when at start', () => {
    expect(getMin([3, 7, 9, 12, 17])).toEqual(3);
  });
  test('Should give smallest when at end', () => {
    expect(getMin([12, 7, 9, 12, 17, 4])).toEqual(4);
  });
});

describe('compressArray', () => {
  test('Should give array with 4 removed from every element when at end', () => {
    expect(compressArray([12, 7, 9, 12, 17, 4])).toEqual([8, 3, 5, 8, 13, 0]);
  });
});

describe('isPinOnLanyard', () => {
  const haystackLanyard: PinSelectionList = {
    availableIds: [2, 5, 9],
    wantedIds: [4, 5, 7],
  } as PinSelectionList;

  test('Should verify that a pin is on an available lanyard.', () => {
    const needlePin: Pin = {
      id: 2,
    } as Pin;
    expect(isPinOnLanyard(needlePin, haystackLanyard)).toBe(true);
  });

  test('Should verify that a pin is on an wanted lanyard.', () => {
    const needlePin: Pin = {
      id: 7,
    } as Pin;
    expect(isPinOnLanyard(needlePin, haystackLanyard)).toBe(true);
  });

  test('Should verify that a pin is on an either wanted or available lanyard.', () => {
    const needlePin: Pin = {
      id: 5,
    } as Pin;
    expect(isPinOnLanyard(needlePin, haystackLanyard)).toBe(true);
  });

  test('Should verify that a pin is not on lanyard.', () => {
    const needlePin: Pin = {
      id: 3,
    } as Pin;
    expect(isPinOnLanyard(needlePin, haystackLanyard)).toBe(false);
  });

  test('Should not fail if a lanyard is somehow generated which has an undefined wanted array.', () => {
    const needlePin: Pin = {
      id: 3,
    } as Pin;
    const dodgyHaystackLanyard: PinSelectionList = {
      wantedIds: [4, 5, 7],
    } as PinSelectionList;

    expect(isPinOnLanyard(needlePin, dodgyHaystackLanyard)).toBe(false);
  });

  test('Should not fail if a lanyard is somehow generated which has an undefined available array.', () => {
    const needlePin: Pin = {
      id: 3,
    } as Pin;
    const dodgyHaystackLanyard: PinSelectionList = {
      availableIds: [2, 5, 9],
    } as PinSelectionList;

    expect(isPinOnLanyard(needlePin, dodgyHaystackLanyard)).toBe(false);
  });
});

describe('isEmptyList', () => {
  test('Should return true if no lists are present.', () => {
    const emptyLanyard: PinSelectionList = {

    } as PinSelectionList;
    expect(isEmptyList(emptyLanyard)).toBe(true);
  });

  test('Should return true if some lists are undefined and others are empty.', () => {
    const emptyLanyard: PinSelectionList = {
      availableIds: [],
      availableSetIds: [],
      wantedIds: undefined,
      wantedSetIds: undefined,
    } as any as PinSelectionList;
    expect(isEmptyList(emptyLanyard)).toBe(true);
  });

  test('Should return false if some lists have items.', () => {
    const emptyLanyard: PinSelectionList = {
      availableIds: undefined,
      availableSetIds: undefined,
      wantedIds: [1, 4, 7, 9],
      wantedSetIds: [],
    } as any as PinSelectionList;
    expect(isEmptyList(emptyLanyard)).toBe(false);
  });

  test('Should return false if all lists have items.', () => {
    const emptyLanyard: PinSelectionList = {
      availableIds: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      availableSetIds: [5, 8, 22],
      wantedIds: [1, 4, 7, 9],
      wantedSetIds: [77, 42, 12, 21],
    } as any as PinSelectionList;
    expect(isEmptyList(emptyLanyard)).toBe(false);
  });
});

describe('sanitizeListElement', () => {
  let tmpConsoleError = ():void => {};
  beforeEach(() => {
    // Capture console.err output
    tmpConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console.err
    console.error = tmpConsoleError;
  });

  test('Should add an empty array if the key is missing.', () => {
    const emptyLanyard: PinSelectionList = {
      availableIds: undefined,
      availableSetIds: [5, 8, 22],
      wantedIds: [1, 4, 7, 9],
      wantedSetIds: [77, 42, 12, 21],
    } as any as PinSelectionList;
    sanitizeListElement(emptyLanyard, 'availableIds');
    expect(emptyLanyard.availableIds).toEqual([]);
    console.error = tmpConsoleError;
  });

  test('Should not overwrite an index where values already exist.', () => {
    const emptyLanyard: PinSelectionList = {
      availableIds: undefined,
      availableSetIds: [5, 8, 22],
      wantedIds: [1, 4, 7, 9],
      wantedSetIds: [77, 42, 12, 21],
    } as any as PinSelectionList;
    sanitizeListElement(emptyLanyard, 'wantedIds');
    expect(emptyLanyard.wantedIds).toEqual([1, 4, 7, 9]);
  });
});

describe('sanitizePinList', () => {
  let tmpConsoleError = ():void => {};
  beforeEach(() => {
    // Capture console.err output
    tmpConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console.err
    console.error = tmpConsoleError;
  });

  test('Should add an empty array if the key is missing.', () => {
    const emptyLanyard: PinSelectionList = {
      availableIds: undefined,
      availableSetIds: [5, 8, 22],
      wantedIds: [1, 4, 7, 9],
      wantedSetIds: [77, 42, 12, 21],
    } as any as PinSelectionList;
    sanitizePinList(emptyLanyard, { localUserId: 'o123' } as any as ApplicationSettings);
    expect(emptyLanyard.availableIds).toEqual([]);
    expect(emptyLanyard.availableSetIds).toEqual([5, 8, 22]);
    expect(emptyLanyard.wantedIds).toEqual([1, 4, 7, 9]);
    expect(emptyLanyard.wantedSetIds).toEqual([77, 42, 12, 21]);
  });
});
