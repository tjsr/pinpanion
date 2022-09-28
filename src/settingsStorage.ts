import { SizesType } from './types';

export const getDisplaySize = (): SizesType => {
  return (localStorage.getItem('displaySize') as SizesType) || 'normal';
};

export const saveDisplaySize = (size: SizesType) => {
  localStorage.setItem('displaySize', size || 'normal');
};
