import { generateListId } from './fixture.ts';

export const getOrCreateIdentity = (): string => {
  let id: string | null = localStorage.getItem('userId');
  if (id === null) {
    id = generateListId();
    localStorage.setItem('userId', id);
  }
  return id;
};
