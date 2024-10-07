import '@testing-library/jest-dom';

import { activeLanyard, storedLanyardList } from './__test/lanyards.testdata';

import { LanyardSelectionDropdown } from './LanyardSelectionDropdown';
import { Mock } from 'vitest';
import { render } from '@testing-library/react';
import { switchToLanyard } from './__test/lanyards.utils';

describe('LanyardSelctionDropdown', () => {
  let mockCallback: Mock;
  let tmpConsoleError = (): void => {};

  beforeEach(() => {
    tmpConsoleError = console.error;
    console.error = vitest.fn();
    mockCallback = vitest.fn();
  });

  afterEach(() => {
    console.error = tmpConsoleError;
  });

  const callMockOnNew = (id: string): void => {
    if (id === 'new') {
      mockCallback();
    }
  };

  it('Should display name in select box when a list is selected', async () => {
    const { queryByLabelText, getByRole } = render(
      <LanyardSelectionDropdown
        lanyardSelected={callMockOnNew}
        activeLanyard={activeLanyard}
        id="testDropdownId"
        storedLanyardList={storedLanyardList}
        currentUserId={'o123'}
      />
    );

    await switchToLanyard('new', storedLanyardList, queryByLabelText, getByRole);

    expect(mockCallback.mock.calls).toHaveLength(1);
  });
});
