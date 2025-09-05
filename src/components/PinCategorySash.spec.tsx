import { PinCategorySash, findFirstFromTargetList } from "./PinCategorySash.tsx";

import { PinCollectionData } from "../pinnypals/pinnypals3convertor.ts";
import { Pinnypals3PinCategory } from "../pinnypals/pinnypals3types.ts";
import pinpanionTestData from '../../test/pinpanion-pin-data.json';
import { render } from "@testing-library/react";

describe('Should display correct selected category by order', () => {
  test('Should display correct category', () => {
    const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;
    const allCategories = pinData.categories;

    const idList = [12, 38, 100, 101];
    const reducedCategories = allCategories.filter((category) => idList.includes(category.id));

    const { getByText } = render(
      <PinCategorySash
        categoryIds={idList}
        pinCategories={reducedCategories}
      />
    );
    const result = getByText('Limited');
    expect(result).toBeInTheDocument();
  });
});


describe('findFirstFromTargetList', () => {
  test('Should return the category from the predefined display order from the given list', () => {
    const needles = [101, 100];
    const prioritizedHaystack: Pinnypals3PinCategory[] = [
      { id: 100, name: 'Limited' } as Pinnypals3PinCategory,
      { id: 101, name: 'General' } as Pinnypals3PinCategory,
      { id: 102, name: 'Custom' } as Pinnypals3PinCategory,
    ];

    const result = findFirstFromTargetList(needles, prioritizedHaystack);
    expect(result).toEqual({ id: 100, name: 'Limited' });
  });
});