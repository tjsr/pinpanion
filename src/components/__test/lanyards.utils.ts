import {
  ByRoleMatcher,
  ByRoleOptions,
  Matcher,
  SelectorMatcherOptions,
  act,
  fireEvent,
  waitFor,
  within
} from '@testing-library/react';

import { PinSelectionList } from '../../types';

export const switchToLanyard = async (
  lanyardId: string,
  expectedAvailableLanyards: PinSelectionList[],
  queryByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null,
  getByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement
): Promise<void> => {
  expect(queryByLabelText('Switch lanyard')).toBeInTheDocument();

  fireEvent.mouseDown(getByRole('button'));
  expect(getByRole('listbox')).not.toEqual(null);

  const listbox = within(getByRole('listbox'));

  expect(listbox.getByText('Create a new lanyard')).toBeInTheDocument();
  expectedAvailableLanyards.forEach((l) => expect(listbox.getByText(l.name)).toBeInTheDocument());

  await act(() => {
    const options: HTMLElement[] = listbox.getAllByRole('option');
    const lanyardIndex: number = lanyardId === 'new' ? 0 :
      expectedAvailableLanyards.findIndex((l) => l.id === lanyardId) + 1;
    fireEvent.mouseDown(options[lanyardIndex]);
    options[lanyardIndex].click();
  });

  await waitFor(() => expect(listbox.getByText('Create a new lanyard')).not.toBeInTheDocument());
};
