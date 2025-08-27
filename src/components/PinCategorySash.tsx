import { PinCategory, PinCategoryId } from '../types';

import { getCategoryCssClass } from '../css/cssClasses';

export const PinCategorySash = (
  { categoryIds, pinCategories }: { categoryIds: PinCategoryId[]; pinCategories: PinCategory[]; }
) => {
  const firstCategoryId = categoryIds[0];
  const category = pinCategories.find((c) => c.id === firstCategoryId);
  if (!category) {
    throw new Error(`Category with id ${firstCategoryId} not found`);
  }

  const categoryCssClass = 'category ' + getCategoryCssClass(category);
  return <div className={categoryCssClass} data-pin-category-id={category.id}>{category.name}</div>;
};
