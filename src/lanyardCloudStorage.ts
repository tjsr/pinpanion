import type { PinSelectionList } from './types.ts';

const lanyardEndpoint = (id: string): string => `/api/lanyards/${encodeURIComponent(id)}`;

export const getLanyardFromCloud = async (id: string): Promise<PinSelectionList | undefined> => {
  const response = await fetch(lanyardEndpoint(id));
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to load lanyard (${response.status})`);
  }
  const lanyard = await response.json() as PinSelectionList;
  if (lanyard.id !== id) {
    throw new Error('The lanyard returned by the server has a different ID');
  }
  return lanyard;
};

export const saveLanyardToCloud = async (lanyard: PinSelectionList): Promise<void> => {
  const response = await fetch(lanyardEndpoint(lanyard.id), {
    body: JSON.stringify(lanyard),
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error(`Failed to save lanyard (${response.status})`);
  }
};
