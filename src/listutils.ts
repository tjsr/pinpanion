import type { YearAndIdComparable } from './types.ts';

export const addIdToList = (data: string, id: number): string => {
  const existingIds: number[] = data
    .split(',')
    .filter((v) => v.trim() !== '')
    .map((v) => +v)
    .filter((n) => !isNaN(n));
  if (!existingIds.includes(+id)) {
    existingIds.push(id);
  }
  const output: string = existingIds.join(', ');
  return output;
};

export const removeIdFromList = (data: string, id: number): string => {
  const existingIds: number[] = data
    .split(',')
    .map((v) => +v.trim())
    .filter((n) => !isNaN(n) && +n !== +id);
  const output: string = existingIds.join(', ');
  return output;
};

export const filterStringToIds = (data: string): number[] => {
  return data
    .split(',')
    .map((v) => +v.trim())
    .filter((n) => !isNaN(n))
    .sort();
};

export const removeOrAddId = (idList: number[] | undefined, id: number): number[] => {
  if (idList === undefined) {
    return <number[]>[+id];
  }
  const updatedIds: number[] | undefined = idList.filter((setId) => +id !== +setId);
  if (updatedIds.length === idList.length) {
    updatedIds.push(+id);
  }
  return updatedIds;
};

export const compareYearThenId = (a: YearAndIdComparable, b: YearAndIdComparable, descending = false) => {
  if (a.year === b.year) {
    return descending ? b.id - a.id : a.id - b.id;
  }
  if (b.year && !a.year) {
    return descending ? 1 : -1;
  }
  if (a.year && !b.year) {
    return descending ? -1 : 1;
  }
  return descending ? (b.year ?? 0) - (a.year ?? 0) : (a.year ?? 0) - (b.year ?? 0);
};
