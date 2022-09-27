import { PinListFilter, PinSelectionList } from '../types';
import React, { ReactElement } from 'react';

import { FilterQRCodeProps } from './FilterQRCode';
import { PinFilterDrawerFragment } from '../drawers/PinFilterDrawerFragment';
import { PinListFilterDisplayProps } from './PinSearchFilter';
import { PinSelectionDrawerFragment } from '../drawers/PinSelectionDrawerFragment';
import { PinSelectionFilterProps } from './PinSelectionFilter';
import { QRCodeDrawerFragment } from '../drawers/QRCodeDrawerFragment';

type PinAppDrawerSetProps = {
  filter: PinListFilter;
  isSelectionActive: boolean;
  pinSelection: PinSelectionList;
  pinListFilterDisplay: ReactElement<PinListFilterDisplayProps>;
  qrCode: ReactElement<FilterQRCodeProps>;
  pinSelectionFilter: ReactElement<PinSelectionFilterProps>;
};

export const PinAppDrawerSet = ({
  filter,
  isSelectionActive,
  pinListFilterDisplay,
  qrCode,
  pinSelectionFilter,
  pinSelection,
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

  return (
    <>
      <PinSelectionDrawerFragment
        filterSelectionState={filterSelectionState}
        isSelectionActive={isSelectionActive}
        pinSelection={pinSelection}
        toggleDrawer={toggleDrawer}
        pinSelectionFilter={pinSelectionFilter} />

      <PinFilterDrawerFragment
        filter={filter}
        toggleDrawer={toggleDrawer}
        filterDrawerState={filterDrawerState}
        pinListFilterDisplay={pinListFilterDisplay}
      />

      <QRCodeDrawerFragment
        filterQrState={filterQrState}
        toggleDrawer={toggleDrawer}
        qrCode={qrCode}
      />
    </>
  );
};
