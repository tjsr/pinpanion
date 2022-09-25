export const isEmpty = (value: string | undefined): boolean => {
  return value === undefined || value.trim() == '';
};
