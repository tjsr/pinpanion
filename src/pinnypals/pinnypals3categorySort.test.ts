import {
  CATEGORY_TYPE_ORDER,
  compareIdIndex,
  compareTypeIndex,
  sortPinnypals3CategoryData,
} from './pinnypals3categorySort.ts';

import type { Pinnypals3PinCategory } from './pinnypals3types.ts';
import pinpanionJson from '../../test/pinpanion-pin-data.json';

describe('compareIdIndex', () => {
  test('Should prioritize category ID#100', () => {
    const catA = { id: 100, type: 'OTHER' } as Pinnypals3PinCategory;
    const catB = { id: 60, type: 'OTHER' } as Pinnypals3PinCategory;
    expect(compareIdIndex(catA, catB, [100])).toBe(-1);
    expect(compareIdIndex(catB, catA, [100])).toBe(1);
  });

  test('Should ignore type and return by id order', () => {
    const catA = { id: 40 } as Pinnypals3PinCategory;
    const catB = { id: 50 } as Pinnypals3PinCategory;
    expect(compareIdIndex(catA, catB, [100])).toBe(-10);
    expect(compareIdIndex(catB, catA, [100])).toBe(10);
  });

  test('Should retun normal non-prioritized comparison', () => {
    const catA = { id: 49 } as Pinnypals3PinCategory;
    const catB = { id: 50 } as Pinnypals3PinCategory;
    expect(compareIdIndex(catA, catB, [100])).toBe(-1);
    expect(compareIdIndex(catB, catA, [100])).toBe(1);
  });
});

describe('compareTypeIndex', () => {
  test('Should ignore type and return by id order', () => {
    const catA = { id: 40 } as Pinnypals3PinCategory;
    const catB = { id: 50 } as Pinnypals3PinCategory;
    expect(compareTypeIndex(catA, catB, CATEGORY_TYPE_ORDER)).toBe(0);
    expect(compareTypeIndex(catB, catA, CATEGORY_TYPE_ORDER)).toBe(0);

    expect(compareTypeIndex(catA, catB, ['GAME', 'COMPANY'])).toBe(0);
    expect(compareTypeIndex(catB, catA, ['GAME', 'COMPANY'])).toBe(0);
  });

  test('Should order OTHER type pins first type and return by id order', () => {
    const catA = { id: 40, type: 'GAME' } as Pinnypals3PinCategory;
    const catB = { id: 60, type: 'OTHER' } as Pinnypals3PinCategory;
    const catC = { id: 80, type: 'COMPANY' } as Pinnypals3PinCategory;
    expect(compareTypeIndex(catA, catB, CATEGORY_TYPE_ORDER)).toBe(1);
    expect(compareTypeIndex(catB, catA, CATEGORY_TYPE_ORDER)).toBe(-1);

    expect(compareTypeIndex(catA, catC, CATEGORY_TYPE_ORDER)).toBe(0);
    expect(compareTypeIndex(catC, catA, CATEGORY_TYPE_ORDER)).toBe(0);

    expect(compareTypeIndex(catB, catC, CATEGORY_TYPE_ORDER)).toBe(-1);
    expect(compareTypeIndex(catC, catB, CATEGORY_TYPE_ORDER)).toBe(1);
  });
});

describe('pinnypals3CategorySort', () => {
  test('Should sort type order with no preferential IDs at front.', () => {
    const allCategories = pinpanionJson.categories.filter((c) =>
      [12, 1, 101, 38].includes(c.id)
    ) as Pinnypals3PinCategory[];
    const sortedList = sortPinnypals3CategoryData(allCategories);
    const expectedOrder = [101, 1, 12, 38];
    expect(sortedList.map((i) => i.id)).toEqual(expectedOrder);
  });

  test('Should return company pins ahead of game pins non-prioritized comparison', () => {
    const testDataList: Pinnypals3PinCategory[] = [
      { id: 40 } as Pinnypals3PinCategory,
      { id: 50 } as Pinnypals3PinCategory,
    ];

    const sortedList = sortPinnypals3CategoryData(testDataList);
    const expectedOrder = [40, 50];
    expect(sortedList.map((i) => i.id)).toEqual(expectedOrder);
  });

  test('Should return company pins ahead of game pins non-prioritized comparison', () => {
    const testDataList: Pinnypals3PinCategory[] = [
      { id: 49 } as Pinnypals3PinCategory,
      { id: 50 } as Pinnypals3PinCategory,
    ];

    const sortedList = sortPinnypals3CategoryData(testDataList);
    const expectedOrder = [49, 50];
    expect(sortedList.map((i) => i.id)).toEqual(expectedOrder);
  });

  test('Should bring category ID#100 then OTHER types to the front.', () => {
    const allCategories = pinpanionJson.categories.filter((c) =>
      [1, 12, 38, 100].includes(c.id)
    ) as Pinnypals3PinCategory[];
    const sortedList = sortPinnypals3CategoryData(allCategories);
    const expectedOrder = [100, 1, 12, 38];
    expect(sortedList.map((i) => i.id)).toEqual(expectedOrder);
  });

  test('Should bring category ID#100 then OTHER types to the front.', () => {
    const allCategories = pinpanionJson.categories.filter((c) =>
      [1, 12, 38, 100, 101, 103].includes(c.id)
    ) as Pinnypals3PinCategory[];
    const sortedList = sortPinnypals3CategoryData(allCategories);
    const expectedOrder = [100, 101, 103, 1, 12, 38];
    expect(sortedList.map((i) => i.id)).toEqual(expectedOrder);
  });
});
