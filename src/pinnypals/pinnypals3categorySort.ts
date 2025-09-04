import { Pinnypals3CategoryType, Pinnypals3PinCategory } from "./pinnypals3types.ts";

import { PinCategoryId } from "../types.ts";

export const CATEGORY_ID_REORDER: PinCategoryId[] = [100];
export const CATEGORY_TYPE_ORDER: Pinnypals3CategoryType[] = ['OTHER'];

const compareKeyIndex = <ObjectType extends object, KeyType>(
  a: ObjectType,
  b: ObjectType,
  key: keyof ObjectType,
  keyOrder: KeyType[]
): number => {
  const va = a[key] as keyof ObjectType & KeyType;
  const vb = b[key] as keyof ObjectType & KeyType;
  // for (const currentOrderedKey of keyOrder) {
  const ia = keyOrder.indexOf(va);
  const ib = keyOrder.indexOf(vb);

  return ib - ia;
};

export const compareIdIndex = (
  a: Pinnypals3PinCategory,
  b: Pinnypals3PinCategory,
  idOrder: PinCategoryId[]
): number => {
  if (idOrder.includes(a.id) || !idOrder.includes(b.id)) {
    const compared = compareKeyIndex(a, b, 'id', idOrder);
    if (compared !== 0) {
      return compared;
    }
  }
  return a.id - b.id;
};

export const compareTypeIndex = (
  a: Pinnypals3PinCategory,
  b: Pinnypals3PinCategory,
  typeOrder: Pinnypals3CategoryType[]
): number => {
  if (typeOrder.includes(a.type) || typeOrder.includes(b.type)) {
    const compared = compareKeyIndex(a, b, 'type', typeOrder);
    if (compared !== 0) {
      return compared;
    }
  }
  return 0;
};

const comparePrioritizedCategories = (
  a: Pinnypals3PinCategory,
  b: Pinnypals3PinCategory,
  priorityIds: PinCategoryId[],
  priorityTypes: Pinnypals3CategoryType[]
): number => {
  const idComparison = compareIdIndex(a, b, priorityIds);
  if (idComparison !== 0) {
    return idComparison;
  }
  return compareTypeIndex(a, b, priorityTypes);
};

export const sortPinnypals3CategoryData = (
  categories: Pinnypals3PinCategory[],
  priorityIds: PinCategoryId[] = CATEGORY_ID_REORDER,
  priorityTypes: Pinnypals3CategoryType[] = CATEGORY_TYPE_ORDER
): Pinnypals3PinCategory[] => {
  return [...categories].sort((a: Pinnypals3PinCategory, b: Pinnypals3PinCategory) => {
    const aPriorityId = priorityIds.includes(a.id) ? 0 : 1;
    const bPriorityId = priorityIds.includes(b.id) ? 0 : 1;
    if (aPriorityId !== bPriorityId) {
      return aPriorityId - bPriorityId;
    }

    const aPriorityType = priorityTypes.includes(a.type) ? 0 : 1;
    const bPriorityType = priorityTypes.includes(b.type) ? 0 : 1;
    if (aPriorityType !== bPriorityType) {
      return aPriorityType - bPriorityType;
    }

    return a.id - b.id;
  });
};

// export const pinnypals3CategorySort = (a: Pinnypals3PinCategory, b: Pinnypals3PinCategory) => {
//   if (CATEGORY_ID_REORDER.includes(a.id) || CATEGORY_ID_REORDER.includes(b.id)) {

//   }
//   const id = compareIdIndex(a, b, CATEGORY_ID_REORDER);
//   if (id !== 0) {
//     return id;
//   }

//   const t = compareTypeIndex(a, b, CATEGORY_TYPE_ORDER);
//   if (id !== 0) {
//     return t;
//   }

//   return a.id - b.id;
// };

