import '../css/pins.css';

import React, { ReactElement } from 'react';

import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import { PinSelectionFilterProps } from '../components/PinSelectionFilter';
import { PinSelectionList } from '../types';

type PinSelectionDrawerFragmentProps = {
  filterSelectionState: boolean;
  isSelectionActive: boolean;
  pinSelection: PinSelectionList;
  toggleDrawer: (
    id: string,
    visible: boolean
  ) => (event: React.KeyboardEvent | React.MouseEvent) => void;
  pinSelectionFilter: ReactElement<PinSelectionFilterProps>;
};

export const PinSelectionDrawerFragment = ({
  filterSelectionState,
  isSelectionActive,
  pinSelection,
  toggleDrawer,
  pinSelectionFilter,
}: PinSelectionDrawerFragmentProps): JSX.Element => {
  const getSelectionButtonLabel = (): string => {
    const selectedPins: number =
      pinSelection?.availableIds.length + pinSelection?.wantedIds.length;
    return selectedPins > 0 ? `Selection (${selectedPins})` : 'Selection';
  };

  return (
    <React.Fragment key={'selection'}>
      {isSelectionActive ? (
        <Button
          className="drawerButton"
          variant="contained"
          onClick={toggleDrawer('selection', true)}
        >
          {getSelectionButtonLabel()}
        </Button>
      ) : (
        <Button
          className="drawerButton"
          onClick={toggleDrawer('selection', true)}
        >
          {getSelectionButtonLabel()}
        </Button>
      )}
      <Drawer
        anchor={'top'}
        open={filterSelectionState}
        onClose={toggleDrawer('selection', false)}
      >
        <div className="drawer">
          <div className="drawerContent">{pinSelectionFilter}</div>
        </div>
      </Drawer>
    </React.Fragment>
  );
};
