import './App.css';
import './pins.css';

import { PAX, Pin, PinListFilter, PinSet } from './types';
import React, { useEffect, useState } from 'react';

import { EMPTY_FILTER } from './fixture';
import { FilterQRCode } from './filterqrcode';
import { PinAppDrawerSet } from './PinAppDrawerSet';
import { PinList } from './PinList';
import { PinListFilterDisplay } from './PinFilter';
import { PinSelectionFilter } from './PinSelectionFilter';
import { filterStringToIds } from './listutils';
import useHashParam from 'use-hash-param';

function App() {
  // const allPins: Pin[];
  // const [hash, setHash] = useHash();
  const [filterHash, setFilterHash] = useHashParam('filter', '');
  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [filter, setFilter] = useState<PinListFilter>({
    ...EMPTY_FILTER,
    selectedPinsList: filterHash
  });

  useEffect(() => {
    // setHash('#');
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

  const buildFilterHashString = (filter: PinListFilter): string => {
    return filterStringToIds(filter.selectedPinsList || '').join(',');
  };

  const filterUpdated = (updatedFilter: PinListFilter): void => {
    const filterString: string = buildFilterHashString(updatedFilter);
    setFilterHash(filterString);
    setFilter(updatedFilter);
  };

  return (
    <div className="App">
      <>
        {pins && (
          <>
            <PinAppDrawerSet
              filter={filter}
              pinListFilterDisplay={
                <PinListFilterDisplay
                  filter={filter}
                  paxs={paxs}
                  pinSets={pinSets}
                  onChange={filterUpdated}
                />
              }
              qrCode={<FilterQRCode filter={filter} />}
              pinSelectionFilter={
                <PinSelectionFilter filter={filter} onChange={filterUpdated} />
              }
            />
            <PinList
              pins={pins}
              paxs={paxs}
              pinSets={pinSets}
              filter={filter}
              setFilter={filterUpdated}
            />
          </>
        )}
      </>
    </div>
  );
}

export default App;
