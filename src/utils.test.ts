import {
  buildNumberFromFlags,
  buildSet,
  compressArray,
  getMin,
  numberArrayToEncodedString,
  numberToEncodingChar,
  stringToNumberArray
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

describe('buildSet', () => {
  test('Should return static array', () => {
    const expected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('');
    const output = buildSet();
    expect(output).toEqual(expected);
  });
});

describe('stringToNumberArray', () => {
  const letters: string[] = buildSet();
  test('Should convert single character', () => {
    expect(stringToNumberArray('r', letters)).toEqual([1, 2, 4, 6]);
    expect(stringToNumberArray('A', letters)).toEqual([]);
    expect(stringToNumberArray('B', letters)).toEqual([1]);
    expect(stringToNumberArray('D', letters)).toEqual([1, 2]);
    expect(stringToNumberArray('G', letters)).toEqual([2, 3]);
    expect(stringToNumberArray('H', letters)).toEqual([1, 2, 3]);
    expect(stringToNumberArray('P', letters)).toEqual([1, 2, 3, 4]);
    expect(stringToNumberArray('f', letters)).toEqual([1, 2, 3, 4, 5]);
    expect(stringToNumberArray('-', letters)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('Should convert two characters at boundary', () => {
    expect(stringToNumberArray('AB')).toEqual([1, 7]);
    expect(stringToNumberArray('AA')).toEqual([7]);
    expect(stringToNumberArray('AG')).toEqual([2, 3, 7]);
  });

  test('Should convert two characters', () => {
    expect(stringToNumberArray('BG', letters)).toEqual([2, 3, 8]);
    expect(stringToNumberArray('BA', letters)).toEqual([8]);
    expect(stringToNumberArray('CA', letters)).toEqual([7, 8]);
    expect(stringToNumberArray('DA', letters)).toEqual([9]);
    expect(stringToNumberArray('EA', letters)).toEqual([7, 9]);
    expect(stringToNumberArray('FA', letters)).toEqual([8, 9]);
    expect(stringToNumberArray('FB', letters)).toEqual([1, 8, 9]);
    expect(stringToNumberArray('GA', letters)).toEqual([7, 8, 9]);
    expect(stringToNumberArray('HA', letters)).toEqual([10]);
    expect(stringToNumberArray('IA', letters)).toEqual([7, 10]);
    expect(stringToNumberArray('JA', letters)).toEqual([8, 10]);
    expect(stringToNumberArray('KA', letters)).toEqual([7, 8, 10]);
    expect(stringToNumberArray('gA', letters)).toEqual([7, 12]);
    expect(stringToNumberArray('CB', letters)).toEqual([1, 7, 8]);
  });

  test('Should convert four characters', () => {
    expect(stringToNumberArray('AAAA', letters)).toEqual([7, 13, 19]);
    expect(stringToNumberArray('ABBB', letters)).toEqual([1, 8, 14, 19]);
  });
});

describe('numberToEncodingChar', () => {
  test('Should get single encoding letter for number', () => {
    expect(numberToEncodingChar(43)).toEqual('r');
    expect(numberToEncodingChar(38)).toEqual('m');
    expect(numberToEncodingChar(55)).toEqual('3');
    expect(numberToEncodingChar(6)).toEqual('G');
    expect(numberToEncodingChar(0)).toEqual('A');
    expect(numberToEncodingChar(63)).toEqual('-');
  });

  test('Should throw exception if out of range character encoded', () => {
    expect(() => numberToEncodingChar(64)).toThrowError();
  });
});

describe('buildNumberFromFlags', () => {
  test('Should return 0 for empty array', () => {
    expect(buildNumberFromFlags([])).toEqual(0);
  });

  test('Should return correct value for only a single selected number', () => {
    expect(buildNumberFromFlags([4])).toEqual(8);
  });

  test('Should return correct value with three items in array', () => {
    expect(buildNumberFromFlags([1, 3, 6])).toEqual(37);
  });

  test('Should return correct value with four items in array', () => {
    expect(buildNumberFromFlags([1, 2, 4, 6])).toEqual(43);
  });

  test('Should throw an exception if you try to encode >6 in array', () => {
    expect(() => buildNumberFromFlags([1, 3, 7])).toThrowError();
  });
});

describe('numberArrayToEncodedString', () => {
  test('Should create single letter', () => {
    expect(numberArrayToEncodedString([1, 2, 4, 6])).toEqual('r');
  });

  test('Test boundary value', () => {
    expect(numberArrayToEncodedString([7])).toEqual('AA');
  });

  test('Should create two-letter letter', () => {
    expect(numberArrayToEncodedString([2, 3, 7])).toEqual('AG');
    expect(numberArrayToEncodedString([2, 3, 8])).toEqual('BG');
    expect(numberArrayToEncodedString([7])).toEqual('AA');
    expect(numberArrayToEncodedString([8])).toEqual('BA');
    expect(numberArrayToEncodedString([9])).toEqual('CA');
    expect(numberArrayToEncodedString([10])).toEqual('EA');
    expect(numberArrayToEncodedString([11])).toEqual('IA');
    expect(numberArrayToEncodedString([13])).toEqual('gA');
    expect(numberArrayToEncodedString([9, 1])).toEqual('CB');
  });

  test('Should create four-letter letter', () => {
    expect(numberArrayToEncodedString([21])).toEqual('AAAA');
    expect(numberArrayToEncodedString([22])).toEqual('BAAA');
    expect(numberArrayToEncodedString([2, 3, 8, 9, 10, 12, 13, 17, 18, 21])).toEqual('AM3G');
  });

  test('Should create three-letter letter', () => {
    expect(numberArrayToEncodedString([13, 14])).toEqual('AgA');
    expect(numberArrayToEncodedString([15])).toEqual('BAA');
    expect(numberArrayToEncodedString([16])).toEqual('CAA');
    expect(numberArrayToEncodedString([17])).toEqual('EAA');
    expect(numberArrayToEncodedString([18])).toEqual('IAA');
    expect(numberArrayToEncodedString([19])).toEqual('QAA');
    expect(numberArrayToEncodedString([13, 14, 20])).toEqual('ggA');
    expect(numberArrayToEncodedString([20])).toEqual('gAA');

    // expect(numberArrayToEncodedString([2, 3, 6, 9, 10, 12, 13, 17, 18, 21])).toEqual('m3G');
  });

  test('Should allow a single high number', () => {
    console.log(numberArrayToEncodedString([198]));
  });
});

describe('Two-way conversion', () => {
  it.each([
    [[13, 14], 'AgA'],
    [[13], 'gA'],
    [[14], 'AAA'],
    [[15], 'BAA'],
    [[16], 'CAA'],
    [[17], 'EAA'],
    [[18], 'IAA'],
    [[19], 'QAA'],
    [[1, 2, 3, 4, 5, 6], '-'],
  ])('Converts %p expecting %p', (numbers: number[], str: string) => {
    expect(numberArrayToEncodedString(numbers)).toEqual(str);
    expect(stringToNumberArray(str)).toEqual(numbers.sort());
  });
});
