import React, { ReactElement } from 'react';

import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import { PinListFilter } from '../types';
import { PinListFilterDisplayProps } from '../components/PinSearchFilter';
import { countFilters } from '../utils';

type PinFilterDrawerFragmentProps = {
  filter: PinListFilter;
  filterDrawerState: boolean;
  pinListFilterDisplay: ReactElement<PinListFilterDisplayProps>;
  toggleDrawer: (
    id: string,
    visible: boolean
  ) => (event: React.KeyboardEvent | React.MouseEvent) => void;
};

export const PinFilterDrawerFragment = ({
  filter,
  filterDrawerState,
  pinListFilterDisplay,
  toggleDrawer,
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
    <React.Fragment key={'filter'}>
      {countFilters(filter) > 0 ? (
        <Button
          className="drawerButton"
          variant="contained"
          onClick={toggleDrawer('filter', true)}
        >
          {getFilterButtonLabel()}
        </Button>
      ) : (
        <Button className="drawerButton" onClick={toggleDrawer('filter', true)}>
          {getFilterButtonLabel()}
        </Button>
      )}
      <Drawer
        anchor={'top'}
        open={filterDrawerState}
        onClose={toggleDrawer('filter', false)}
        ModalProps={{
          keepMounted: true,
        }}
      >
        {pinListFilterDisplay}
      </Drawer>
    </React.Fragment>
  );
};
