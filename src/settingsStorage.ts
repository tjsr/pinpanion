import { SizesType } from './types';

export const getDisplaySize = (): SizesType => {
  return (localStorage.getItem('displaySize') as SizesType) || 'normal';
};

export const saveDisplaySize = (size: SizesType) => {
  localStorage.setItem('displaySize', size || 'normal');
};

export const getSplitActiveAndWanted = (): boolean => {
  const existingValue: string | null = localStorage.getItem(
    'splitActiveAndWanted'
  );
  if (existingValue === null) {
    saveSplitActive(true);
    return true;
  }
  return JSON.parse(existingValue) === true;
};

export const saveSplitActive = (enabled: boolean) => {
  localStorage.setItem('splitActiveAndWanted', enabled.toString());
};
