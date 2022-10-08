import '../css/pins.css';

import React, { ReactElement } from 'react';

import { DrawerFragment } from '../components/DrawerFragment';
import { PinSelectionFilterProps } from '../components/PinSelectionFilter';
import { PinSelectionList } from '../types';

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
      pinSelection?.availableIds.length + pinSelection?.wantedIds.length;
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
