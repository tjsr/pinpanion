import { SizesType, UserId } from './types';

import { generateUserId } from './fixture';

let userId: UserId;

export const setUserId = (id: UserId) => {
  userId = id;
};

export const getUserId = (): UserId => {
  if (userId === undefined) {
    userId = generateUserId();
  }
  return userId;
};

export type ApplicationSettings = {
  splitActiveAndWanted: boolean;
  descendingAge: boolean;
  displaySize: SizesType;
  userDisplayName: string|undefined;
  localUserId: string,
};

const DEFAULT_SETTINGS: ApplicationSettings = {
  descendingAge: true,
  displaySize: 'normal',
  localUserId: generateUserId(),
  splitActiveAndWanted: true,
  userDisplayName: undefined,
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
  const existingSettings: ApplicationSettings = existingSettingsString ?
    JSON.parse(existingSettingsString) : DEFAULT_SETTINGS;
  if (existingSettings.localUserId === undefined) {
    existingSettings.localUserId = getUserId();
  }
  if (userId === undefined) {
    setUserId(existingSettings.localUserId);
  }
  return existingSettings;
};

export const saveSettings = (settings:ApplicationSettings) => {
  localStorage.setItem('settings', JSON.stringify(settings));
};
