import React, { ReactElement } from 'react';

import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import { FilterQRCodeProps } from './filterqrcode';
import { PinListFilter } from './types';
import { PinListFilterDisplayProps } from './PinFilter';
import { PinSelectionFilterProps } from './PinSelectionFilter';
import { filterStringToIds } from './listutils';
import { isEmpty } from './utils';

type PinAppDrawerSetProps = {
  filter: PinListFilter;
  pinListFilterDisplay: ReactElement<PinListFilterDisplayProps>;
  qrCode: ReactElement<FilterQRCodeProps>;
  pinSelectionFilter: ReactElement<PinSelectionFilterProps>;
};

export const PinAppDrawerSet = ({
  filter,
  pinListFilterDisplay,
  qrCode,
  pinSelectionFilter,
}: PinAppDrawerSetProps): JSX.Element => {
  const [filterSelectionState, setSelectionDrawerState] =
    React.useState<boolean>(false);
  const [filterDrawerState, setFilterDrawerState] =
    React.useState<boolean>(false);
  const [filterQrState, setQrDrawerState] = React.useState<boolean>(false);

  const toggleDrawer =
    (drawer: string, display: boolean) =>
      (event: React.KeyboardEvent | React.MouseEvent) => {
        {
          if (
            event.type === 'keydown' &&
          ((event as React.KeyboardEvent).key === 'Tab' ||
            (event as React.KeyboardEvent).key === 'Shift')
          ) {
            return;
          }

          switch (drawer) {
          case 'selection':
            setSelectionDrawerState(display);
            break;
          case 'filter':
            setFilterDrawerState(display);
            break;
          case 'qr':
            setQrDrawerState(display);
            break;
          }
        }
      };

  const getFilterButtonLabel = (): string => {
    let filters = 0;
    if (filter.endYear) {
      filters++;
    }
    if (filter.startYear) {
      filters++;
    }
    if (!isEmpty(filter.filterText)) {
      filters++;
    }
    if (filter?.paxId !== undefined && filter?.paxId > 0) {
      filters++;
    }
    if (filter?.pinSetId !== undefined && filter?.pinSetId > 0) {
      filters++;
    }
    if (filters > 0) {
      return `Filters (${filters})`;
    } else {
      return 'Filters';
    }
  };

  const getSelectionButtonLabel = (): string => {
    if (isEmpty(filter.selectedPinsList)) {
      return 'Selection';
    }
    const selectedPins: number = filterStringToIds(
      filter.selectedPinsList || ''
    ).length;
    return `Selection (${selectedPins})`;
  };

  return (
    <>
      <React.Fragment key={'selection'}>
        {filter.selectedPinsOnly ? (
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
          {pinSelectionFilter}
        </Drawer>
      </React.Fragment>

      <React.Fragment key={'filter'}>
        <Button className="drawerButton" onClick={toggleDrawer('filter', true)}>
          {getFilterButtonLabel()}
        </Button>
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

      <React.Fragment key={'qr'}>
        <Button className="drawerButton" onClick={toggleDrawer('qr', true)}>
          QR
        </Button>
        <Drawer
          anchor={'top'}
          open={filterQrState}
          onClose={toggleDrawer('qr', false)}
        >
          {qrCode}
        </Drawer>
      </React.Fragment>
    </>
  );
};
