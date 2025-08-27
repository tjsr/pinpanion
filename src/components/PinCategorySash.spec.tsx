import { PinCategorySash } from "./PinCategorySash";
import { PinCollectionData } from "../pinnypals/pinnypals3convertor";
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
        pinCategories={allCategories}
      />
    );
    const result = getByText('Limited');
    expect(result).toBeInTheDocument();
  });

});
