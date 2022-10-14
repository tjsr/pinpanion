import { SizesType } from './types';

export type ApplicationSettings = {
  splitActiveAndWanted: boolean;
  descendingAge: boolean;
  displaySize: SizesType;
};

const DEFAULT_SETTINGS: ApplicationSettings = {
  descendingAge: true,
  displaySize: 'normal',
  splitActiveAndWanted: true,
};
// export const getDisplaySize = (): SizesType => {
//   return (localStorage.getItem('displaySize') as SizesType) || 'normal';
// };

// export const saveDisplaySize = (size: SizesType) => {
//   localStorage.setItem('displaySize', size || 'normal');
// };

// export const getSplitActiveAndWanted = (): boolean => {
//   const existingValue: string | null = localStorage.getItem(
//     'splitActiveAndWanted'
//   );
//   if (existingValue === null) {
//     saveSplitActive(true);
//     return true;
//   }
//   return JSON.parse(existingValue) === true;
// };

// export const saveSplitActive = (enabled: boolean) => {
//   localStorage.setItem('splitActiveAndWanted', enabled.toString());
// };
export const loadSettings = (): ApplicationSettings => {
  const existingSettingsString: string | null = localStorage.getItem('settings');
  const existingSettings = existingSettingsString ? JSON.parse(existingSettingsString) : DEFAULT_SETTINGS;
  return existingSettings;
};

export const saveSettings = (settings:ApplicationSettings) => {
  localStorage.setItem('settings', JSON.stringify(settings));
};
