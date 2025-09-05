import '../css/pins.css';

import React, { type ReactElement } from 'react';

import { DrawerFragment } from '../components/DrawerFragment.tsx';
import type { PinListFilter } from '../types.ts';
import type { PinListFilterDisplayProps } from '../components/PinSearchFilter.tsx';
import { countFilters } from '../utils.ts';

type PinFilterDrawerFragmentProps = {
  filter: PinListFilter;
  pinListFilterDisplay: ReactElement<PinListFilterDisplayProps>;
};

export const PinFilterDrawerFragment = ({
  filter,
  pinListFilterDisplay,
}: PinFilterDrawerFragmentProps): JSX.Element => {
  const getFilterButtonLabel = (): string => {
    const filters: number = countFilters(filter);

    if (filters > 0) {
      return `Filters (${filters})`;
    } else {
      return 'Filters';
    }
  };

  return (
    <DrawerFragment
      active={countFilters(filter) > 0}
      drawerId="filter"
      label={getFilterButtonLabel()}
    >
      {pinListFilterDisplay}
    </DrawerFragment>
  );
};
