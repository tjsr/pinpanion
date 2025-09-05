import type {
  ByRoleMatcher,
  ByRoleOptions,
  waitForOptions
} from '@testing-library/react';
import type { PAXEventId, PaxType } from '../types.ts';
import {
  act,
  fireEvent,
  getByText,
  render,
} from '@testing-library/react';

import type { Container } from 'react-dom';
import { PAXEventSelector } from './PAXFilter.tsx';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import pindata from '../../test/pinpanion-pin-data.json';
import userEvent from '@testing-library/user-event';

describe('PAXFilter', () => {
  const data = pindata as PinCollectionData;

  const selectPaxEventFromFilter = async (
    filterAssertionFunction: (eventId: PAXEventId|PaxType|undefined) => void,
    paxEventSearch: RegExp | string): Promise<{
    container: Container,
    findByRole: (
      role: ByRoleMatcher, options?: ByRoleOptions | undefined, waitForElementOptions?: waitForOptions | undefined
    ) => Promise<HTMLElement>
   }> => {
    const { container, findByLabelText, findByRole } = render(
      <PAXEventSelector
        events={data.events}
        id='testEventIdFilter'
        eventSelected={filterAssertionFunction}
        selectedPaxEventOrType={undefined}
      />
    );

    const paxDropdownByLabel = await findByLabelText('Filter by PAX');
    const paxDropdown = await findByRole('combobox', { name: /Filter by PAX/i });
    expect(paxDropdown).toBeInTheDocument();
    expect(paxDropdown).toBeVisible();
    expect(paxDropdownByLabel).toBeInTheDocument();

    await userEvent.click(paxDropdown);

    const listbox = await findByRole('listbox');
    const paxEventListItem = getByText(listbox, paxEventSearch);
    await act(async () => {
      fireEvent.click(paxEventListItem);
    });

    return Promise.resolve({
      container,
      findByRole,
    });
  };


  it('Should update the events filter when the dropdown value is changed.', async () => {

  });

  it('Should send filter change event when dropdown value is changed.', async () => {
    const filterChange = vitest.fn((eventId: PAXEventId|PaxType|undefined): void => {
      expect(eventId).toBe(17);
    });

    const filterResult = await selectPaxEventFromFilter(filterChange, /PAX East 2019/i);
    console.log(filterResult.container.children[0].innerHTML);
  });
});
