import {
  type ByRoleMatcher,
  type ByRoleOptions,
  act,
  fireEvent,
  getByText,
  render,
  type waitForOptions
} from '@testing-library/react';
import type { Pin, PinListFilter } from '../types.ts';
import { PinSearchFilterDisplay, isPaxEventType, isPinFiltered } from './PinSearchFilter.js';

import type { Container } from 'react-dom';
import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import pindata from '../../test/pinpanion-pin-data.json';
import userEvent from '@testing-library/user-event';

describe('PinsSearchFilter', () => {
  const data = pindata as PinCollectionData;

  const selectPaxEventFromFilter = async (paxEventSearch: RegExp | string, paxEventId: number): Promise<{
    container: Container,
    findByRole: (
      role: ByRoleMatcher, options?: ByRoleOptions | undefined, waitForElementOptions?: waitForOptions | undefined
    ) => Promise<HTMLElement>
   }> => {
    const filterChange = vitest.fn((updatedFilter: PinListFilter) => {
      expect(updatedFilter.paxEventId).toBe(paxEventId);
    });

    const { container, findByLabelText, findByRole } = render(
      <PinSearchFilterDisplay events={data.events} onChange={filterChange} isFilterEnabled={false} />
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

  it('Should update selection filter when dropdown value is changed.', async () => {
    const filterResult = await selectPaxEventFromFilter(/PAX East 2019/i, 17);
    console.log(filterResult.container.children[0].innerHTML);
  });
});

describe('isPinFiltered', () => {
  const data = pindata as PinCollectionData;

  it('Should return true if a pin is filtered by year', () => {
    const pinFilter: PinListFilter = {
      endYear: 2021,
      startYear: 2019,
    };

    const filterMap: Map<number, boolean> = new Map([
      [2022, true],
      [2021, false],
      [2020, false],
      [2019, false],
      [2018, true],
      [2027, true],
    ]);
    filterMap.forEach((expected, year) => {
      const testPin: Pin = { year } as Pin;
      expect(isPinFiltered(testPin, pinFilter)).toBe(expected);
    });
  });

  it('Should return true if a pin does not have the desired eventId', () => {
    const pinFilter: PinListFilter = {
      paxEventId: 20,
    };

    const filterMap: Map<number, boolean> = new Map([
      [10, true],
      [20, false],
      [21, true],
    ]);

    filterMap.forEach((expected, paxEventId) => {
      const testPin: Pin = { paxEventId } as Pin;
      expect(isPinFiltered(testPin, pinFilter), `Pin with eventId ${paxEventId} does not match expected filter.`).toBe(expected);
    });
  });

  it('Should return true if a pins event is not of an event type', () => {
    const pinFilter: PinListFilter = {
      paxType: 'PAX_EAST',
    };

    const filterMap: Map<number, boolean> = new Map([
      [13, false],
      [15, false],
      [27, true],
      [37, true],
    ]);

    filterMap.forEach((expected, paxEventId) => {
      const testPin: Pin = { paxEventId } as Pin;
      expect(isPinFiltered(testPin, pinFilter, data.events),
        `Pin with eventId ${paxEventId} does not match expected event type of ${pinFilter.paxType}.`
      ).toBe(expected);
    });
  });
});

describe('isPaxEventType', () => {
  const data = pindata as PinCollectionData;
  it('Should return true if the eventId is from a matching subtype', () => {
    expect(isPaxEventType(13, 'PAX_EAST', data.events)).toBe(true);
    expect(isPaxEventType(27, 'PAX_EAST', data.events)).toBe(false);
    expect(isPaxEventType(27, 'PAX_AUS', data.events)).toBe(true);
  });
});
