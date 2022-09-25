import { addIdToList, removeIdFromList } from './listutils';

describe('addIdToList', () => {
  test('Should return a list containing only the newly added element from a blank list', () => {
    const output: string = addIdToList('', 2);
    const expected = '2';

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
