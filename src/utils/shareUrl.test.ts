import { findShareGaps } from './shareUrl';

describe('findShareGaps', () => {
  test('Should find a missing range', () => {
    expect(findShareGaps([1, 2, 3, 15, 16, 19, 26, 47, 48, 50], 10)).toStrictEqual([[4, 14], [27, 46]]);
  });
});
