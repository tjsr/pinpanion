import { addIdToList, removeIdFromList, removeOrAddId } from './listutils';

describe('addIdToList', () => {
  test('Should return a list containing only the newly added element from a blank list', () => {
    const output: string = addIdToList('', 2);
    const expected = '2';

    expect(output).toEqual(expected);
  });

  test('Should not crash with a junk empty list', () => {
    const output: string = addIdToList(',,', 5);
    const expected = '5';

    expect(output).toEqual(expected);
  });
});

describe('removeIdFromList', () => {
  test('Should return a list with a value removed', () => {
    const output: string = removeIdFromList('2, 5, 7', 5);
    const expected = '2, 7';

    expect(output).toEqual(expected);
  });
});

describe('removeOrAddId', () => {
  test('Should return a single-entry list when list undefined', () => {
    const output: number[] = removeOrAddId(undefined, 7);
    const expected: number[] = [7];

    expect(output).toEqual(expected);
  });

  test('Should return a single-entry list when list empty', () => {
    const output: number[] = removeOrAddId([], 5);
    const expected: number[] = [5];

    expect(output).toEqual(expected);
  });

  test('Should return an empty list when only value is removed', () => {
    const output: number[] = removeOrAddId([4], 4);
    const expected: number[] = [];

    expect(output).toEqual(expected);
  });

  test('Should return a single-entry list value present', () => {
    const output: number[] = removeOrAddId([6, 3], 3);
    const expected: number[] = [6];

    expect(output).toEqual(expected);
  });

  test('Should return a three-entry list when value not present', () => {
    const output: number[] = removeOrAddId([9, 7], 2);
    const expected: number[] = [9, 7, 2];

    expect(output).toEqual(expected);
  });

  test('Should remove multiple of a single value in an array', () => {
    const output: number[] = removeOrAddId([1, 4, 2, 6, 2, 7, 7, 2], 2);
    const expected: number[] = [1, 4, 6, 7, 7];
    expect(output).toEqual(expected);

    const output2: number[] = removeOrAddId([3, 4, 4, 4, 5, 4], 4);
    const expected2: number[] = [3, 5];
    expect(output2).toEqual(expected2);
  });
});
