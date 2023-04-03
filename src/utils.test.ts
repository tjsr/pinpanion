import { Pin, PinSelectionList } from './types';
import {
  compressArray,
  getMin,
  isPinOnLanyard
} from './utils';

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
