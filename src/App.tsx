import './css/App.css';
import './css/pins.css';

import { EMPTY_FILTER, newSelectionList } from './fixture';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet } from './types';
import { PinListFilterDisplay, isPinFiltered } from './components/PinFilter';
import React, { useEffect, useState } from 'react';

import { FilterQRCode } from './components/FilterQRCode';
import { PinAppDrawerSet } from './components/PinAppDrawerSet';
import { PinList } from './components/PinList';
import { PinSelectionListEditor } from './components/PinSelectionFilter';
import { countFilters } from './utils';
import { filterStringToIds } from './listutils';
import useHashParam from 'use-hash-param';

const isPinOnLanyard = (pin:Pin, lanyard: PinSelectionList):boolean => {
  return lanyard.availableIds.includes(pin.id) || lanyard.wantedIds.includes(pin.id);
};

function App() {
  const [filterHash, setFilterHash] = useHashParam('filter', '');
  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [filter, setFilter] = useState<PinListFilter>({
    ...EMPTY_FILTER,
    selectedPinsList: filterHash,
  });
  // const [selectionListIndex, updateSelectionListIndex] = useState<number>(0);
  const [selectionFilterEnabled, setSelectionFilterEnabled] =
    useState<boolean>(false);

  const buildSetsFromFilterHash = (): PinSelectionList[] => {
    return [newSelectionList()];
  };

  const [pinSelectionLists, updateLists] = useState<PinSelectionList[]>(
    buildSetsFromFilterHash()
  );

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

  const buildFilterHashString = (filter: PinListFilter): string => {
    return filterStringToIds(filter.selectedPinsList || '').join(',');
  };

  const filterUpdated = (updatedFilter: PinListFilter): void => {
    const filterString: string = buildFilterHashString(updatedFilter);
    setFilterHash(filterString);
    setFilter(updatedFilter);
  };

  const selectionListUpdated = (updatedList: PinSelectionList): void => {
    const recreatedList: PinSelectionList[] = [];

    for (let i = 0; i < pinSelectionLists.length; i++) {
      if (pinSelectionLists[i].id == updatedList.id) {
        recreatedList[i] = updatedList;
      } else {
        recreatedList[i] = pinSelectionLists[i];
      }
    }
    updateLists(recreatedList);
  };

  const getPinListHeading = (): string => {
    if (selectionFilterEnabled) {
      return 'Selected pins';
    } else if (countFilters(filter)) {
      return 'Filtered pins';
    } else {
      return 'Pin list';
    }
  };

  return (
    <div className="App">
      <>
        {pins && (
          <>
            <PinAppDrawerSet
              filter={filter}
              isSelectionActive={selectionFilterEnabled}
              pinSelection={pinSelectionLists[0]}
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
                <PinSelectionListEditor
                  enableFilter={selectionFilterEnabled}
                  pinLists={pinSelectionLists}
                  onChange={selectionListUpdated}
                  changeListDisplayed={(id: string, display: boolean) => {
                    setSelectionFilterEnabled(display);
                  }}
                />
              }
            />
            <PinList
              activePinSet={pinSelectionLists[0]}
              filter={filter}
              heading={getPinListHeading()}

              isPinFiltered={(pin:Pin) => {
                return isPinFiltered(pin, filter) || (
                  selectionFilterEnabled && !isPinOnLanyard(pin, pinSelectionLists[0])
                );
              }}
              paxs={paxs}
              pins={pins}
              pinSets={pinSets}
              setPinSet={selectionListUpdated}
            />
          </>
        )}
      </>
    </div>
  );
}

export default App;
