import { SizesType } from './types';

export const getDisplaySize = (): SizesType => {
  return (localStorage.getItem('displaySize') as SizesType) || 'normal';
};

export const saveDisplaySize = (size: SizesType) => {
  localStorage.setItem('displaySize', size || 'normal');
};

export const getSplitActiveAndWanted = (): boolean => {
  const existingValue: string | null = localStorage.getItem(
    'setSplitActiveAndWanted'
  );
  if (existingValue === null) {
    saveSplitActive(true);
    return true;
  }
  return Boolean(existingValue);
};

export const saveSplitActive = (enabled: boolean) => {
  localStorage.setItem('splitActiveAndWanted', enabled.toString());
};
