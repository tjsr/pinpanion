import './css/App.css';
import './css/pins.css';

import { EMPTY_FILTER, newSelectionList } from './fixture';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet } from './types';
import {
  PinSearchFilterDisplay,
  isPinFiltered,
} from './components/PinSearchFilter';
import React, { useEffect, useState } from 'react';
import { countFilters, isEmpty } from './utils';

import { FilterQRCode } from './components/FilterQRCode';
import { PinAppDrawerSet } from './components/PinAppDrawerSet';
import { PinList } from './components/PinList';
import { PinSelectionListEditor } from './components/PinSelectionFilter';
import useHashParam from 'use-hash-param';

const isPinOnLanyard = (pin: Pin, lanyard: PinSelectionList): boolean => {
  return (
    lanyard.availableIds.includes(+pin.id) ||
    lanyard.wantedIds.includes(+pin.id)
  );
};

function App() {
  const [availIdHash, setAvailIdHash] = useHashParam('availableIds', '');
  const [wantedIdHash, setWantedIdHash] = useHashParam('wantedIds', '');
  const [idHash, setIdHash] = useHashParam('id', '');
  const [listNameHash, setlistNameHash] = useHashParam('name', '');
  const [revisionHash, setRevisionHash] = useHashParam('revision', '');

  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [filter, setFilter] = useState<PinListFilter>({
    ...EMPTY_FILTER,
  });
  const [selectionFilterEnabled, setSelectionFilterEnabled] =
    useState<boolean>(false);

  const buildSetsFromFilterHash = (): PinSelectionList[] => {
    let revision: number = parseInt(revisionHash);
    if (isNaN(revision)) {
      revision = 0;
    }
    const availableIds: number[] = isEmpty(availIdHash) ?
      [] :
      availIdHash.split(',').map((n) => parseInt(n));
    const wantedIds: number[] = isEmpty(wantedIdHash) ?
      [] :
      wantedIdHash.split(',').map((n) => parseInt(n));

    console.log(availIdHash);
    console.log(wantedIdHash);
    console.log(availableIds);
    console.log(wantedIds);

    const selection: PinSelectionList = {
      ...newSelectionList(),
      availableIds,
      id: idHash,
      name: listNameHash,
      revision,
      wantedIds,
    };
    return [selection];
  };

  const [pinSelectionLists, updateLists] = useState<PinSelectionList[]>(
    buildSetsFromFilterHash()
  );

  useEffect(() => {
    const fetchPins = async () => {
      const response = await fetch('sample.json', {
        mode: 'cors',
      });
      const data: any = await response.json();
      setPins(data.pins);
      setPinSets(data.sets);
      setPaxs(data.paxs);
    };
    fetchPins();
  }, []);

  const updateListHash = (selection: PinSelectionList): void => {
    setAvailIdHash(selection.availableIds.join(','));
    setWantedIdHash(selection.wantedIds.join(','));
    setIdHash(selection.id);
    setlistNameHash(selection.name);
    setRevisionHash(selection.revision.toString());
    window.location.href = window.location.href.replaceAll('%2C', ',');
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
    if (isNaN(updatedList.revision)) {
      updatedList.revision = 0;
    }
    updateLists(recreatedList);
    updateListHash(updatedList);
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
                <PinSearchFilterDisplay
                  filter={filter}
                  paxs={paxs}
                  pinSets={pinSets}
                  onChange={setFilter}
                />
              }
              qrCode={<FilterQRCode />}
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
              isPinFiltered={(pin: Pin) => {
                return (
                  (selectionFilterEnabled &&
                    !isPinOnLanyard(pin, pinSelectionLists[0])) ||
                  isPinFiltered(pin, filter)
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
