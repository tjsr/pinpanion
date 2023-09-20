import { findShareGaps } from './shareUrl';

describe('findShareGaps', () => {
  test('Should find a missing range', () => {
    expect(findShareGaps([1, 2, 3, 15, 16, 19, 26, 47, 48, 50], 10)).toStrictEqual([[4, 14], [27, 46]]);
  });

  test('Should find more missing ranges', () => {
    const inputRange1 = [77, 102, 108, 242, 437, 664, 666, 727, 778, 786, 826, 854, 1026, 1274, 1275,
      1276, 1277, 1278, 1279, 1280, 1308, 1311, 1312, 1324, 1326, 1336, 1337, 1338, 1339];
    const removeRange1: [number, number][] = [[1, 76], [109, 241], [243, 436], [438, 663], [667, 726], [728, 777],
      [787, 825], [855, 1025], [1027, 1273]];
    const output = findShareGaps(inputRange1);
    expect(output).toStrictEqual(removeRange1);
  });
});
