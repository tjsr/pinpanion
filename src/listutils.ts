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
