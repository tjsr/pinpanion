import './App.css';
import './pins.css';

import { PAX, Pin, PinListFilter, PinSet } from './types';
import React, { useEffect, useState } from 'react';

import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import { EMPTY_FILTER } from './fixture';
import { FilterQRCode } from './filterqrcode';
import { PinList } from './PinList';
import { PinListFilterDisplay } from './PinFilter';
import { PinSelectionFilter } from './PinSelectionFilter';
import { filterStringToIds } from './listutils';
import { isEmpty } from './utils';

function App() {
  // const allPins: Pin[];
  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [filter, setFilter] = useState<PinListFilter>(EMPTY_FILTER);

  useEffect(() => {
    const fetchPins = async () => {
      const response = await fetch('sample.json', {
        mode: 'cors',
      });
      // const response = await fetch(ALL_PINS_URL, {
      //   mode: 'cors',
      // });
      const data: any = await response.json();
      setPins(data.pins);
      setPinSets(data.sets);
      setPaxs(data.paxs);
    };
    fetchPins();
  }, []);

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
    <div className="App">
      <>
        {pins && (
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
                <PinSelectionFilter filter={filter} onChange={setFilter} />
              </Drawer>
            </React.Fragment>

            <React.Fragment key={'filter'}>
              <Button
                className="drawerButton"
                onClick={toggleDrawer('filter', true)}
              >
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
                <PinListFilterDisplay
                  filter={filter}
                  paxs={paxs}
                  pinSets={pinSets}
                  onChange={setFilter}
                />
              </Drawer>
            </React.Fragment>

            <React.Fragment key={'qr'}>
              <Button
                className="drawerButton"
                onClick={toggleDrawer('qr', true)}
              >
                QR
              </Button>
              <Drawer
                anchor={'top'}
                open={filterQrState}
                onClose={toggleDrawer('qr', false)}
              >
                <FilterQRCode filter={filter} />
              </Drawer>
            </React.Fragment>
            <PinList
              pins={pins}
              paxs={paxs}
              pinSets={pinSets}
              filter={filter}
              setFilter={setFilter}
            />
          </>
        )}
      </>
    </div>
  );
}

export default App;
