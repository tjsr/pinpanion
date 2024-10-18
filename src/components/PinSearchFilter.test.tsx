import { PinListFilter } from '../types.js';
import { PinSearchFilterDisplay } from './PinSearchFilter.js';
import { render } from '@testing-library/react';

describe('PinsSearchFilter', () => {
  it('Should update selection filter when dropdown value is changed.', async () => {
    const filterChange = vitest.fn(() => {
      console.log('Filter changed');
    });
    const { container } = render(<PinSearchFilterDisplay onChange={filterChange} isFilterEnabled={true} />);
  });
});
