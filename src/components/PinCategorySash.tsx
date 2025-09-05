import { PinCategory, PinCategoryId } from '../types';

import { getCategoryCssClass } from '../css/cssClasses';

export const findFirstFromTargetList = (needles: PinCategoryId[], prioritizedHaystack: PinCategory[]): PinCategory | null => {
  return prioritizedHaystack.find((category) => needles.includes(category.id)) || null;
}

export const PinCategorySash = (
  { categoryIds, pinCategories }: { categoryIds: PinCategoryId[]; pinCategories: PinCategory[]; }
) => {
  const category = findFirstFromTargetList(categoryIds, pinCategories);
  if (!category) {
    throw new Error(`Category in list ${categoryIds} not found`);
  }

  const categoryCssClass = 'category ' + getCategoryCssClass(category);
  return <div className={categoryCssClass} data-pin-category-id={category.id}>{category.name}</div>;
};
