/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';

import {
  ByRoleMatcher,
  ByRoleOptions,
  Matcher,
  SelectorMatcherOptions,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react';

import { LanyardSelectionDropdown } from './LanyardSelectionDropdown';
import { PinSelectionList } from '../types';
import { act } from 'react-dom/test-utils';

describe('LanyardSelctionDropdown', () => {
  const selectedId = 'abc123';
  const activeLanyard: PinSelectionList = {
    availableIds: [1001, 1003, 1005],
    editable: true,
    id: selectedId,
    name: 'Test list',
    revision: 2,
    wantedIds: [1002, 997, 994],
  };

  const alternativeLanyard2: PinSelectionList = {
    availableIds: [202],
    editable: true,
    id: 'bbb222',
    name: 'Filled list 2',
    revision: 2,
    wantedIds: [201],
  };

  const alternativeLanyard3: PinSelectionList = {
    availableIds: [302],
    editable: true,
    id: 'ccc333',
    name: 'Filled list 3',
    revision: 3,
    wantedIds: [301],
  };

  const storedLanyardList: PinSelectionList[] = [activeLanyard, alternativeLanyard2, alternativeLanyard3];

  let mockCallback: jest.Mock<any, any, any>;

  beforeEach(() => {
    mockCallback = jest.fn();
  });

  const callMockOnNew = (id: string): void => {
    if (id === 'new') {
      mockCallback();
    }
  };

  const switchToNewLanyard = async (
    queryByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null,
    getByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement
  ): Promise<void> => {
    expect(queryByLabelText('Switch lanyard')).toBeInTheDocument();

    fireEvent.mouseDown(getByRole('button'));
    expect(getByRole('listbox')).not.toEqual(null);

    const listbox = within(getByRole('listbox'));

    expect(listbox.getByText('Create a new lanyard')).toBeInTheDocument();
    expect(listbox.getByText('Filled list 3')).toBeInTheDocument();
    expect(listbox.getByText('Filled list 2')).toBeInTheDocument();
    expect(listbox.getByText('Test list')).toBeInTheDocument();

    await act(() => {
      const options: HTMLElement[] = listbox.getAllByRole('option');
      fireEvent.mouseDown(options[0]);
      options[0].click();
    });

    await waitFor(() => expect(listbox.getByText('Create a new lanyard')).not.toBeInTheDocument());
  };

  it('Should display name in select box when a list is selected', async () => {
    const { queryByLabelText, getByRole } = render(
      <LanyardSelectionDropdown
        lanyardSelected={callMockOnNew}
        activeLanyard={activeLanyard}
        id="testDropdownId"
        storedLanyardList={storedLanyardList}
      />
    );

    await switchToNewLanyard(queryByLabelText, getByRole);

    expect(mockCallback.mock.calls).toHaveLength(1);
  });
});
