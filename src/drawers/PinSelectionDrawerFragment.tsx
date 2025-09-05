import '../css/pins.css';

import React, { type ReactElement } from 'react';

import { DrawerFragment } from '../components/DrawerFragment.tsx';
import type { PinSelectionFilterProps } from '../components/PinSelectionFilter.tsx';
import type { PinSelectionList } from '../types.ts';

type PinSelectionDrawerFragmentProps = {
  isSelectionActive: boolean;
  pinSelection: PinSelectionList;
  pinSelectionFilter: ReactElement<PinSelectionFilterProps>;
};

export const PinSelectionDrawerFragment = ({
  isSelectionActive,
  pinSelection,
  pinSelectionFilter,
}: PinSelectionDrawerFragmentProps): JSX.Element => {
  const getSelectionButtonLabel = (): string => {
    const selectedPins: number =
      (pinSelection?.availableIds ? pinSelection?.availableIds.length : 0) +
      (pinSelection?.wantedIds ? pinSelection?.wantedIds.length : 0);
    return selectedPins > 0 ? `Lanyard (${selectedPins})` : 'Lanyards';
  };

  return (
    <DrawerFragment
      active={isSelectionActive}
      drawerId="selection"
      label={getSelectionButtonLabel()}
    >
      {pinSelectionFilter}
    </DrawerFragment>
  );
};
