import './css/App.css';
import './css/pins.css';

import { EMPTY_FILTER, generateListId, newSelectionList } from './fixture';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet } from './types';
import {
  PinSearchFilterDisplay,
  isPinFiltered,
} from './components/PinSearchFilter';
import React, { useEffect, useState } from 'react';
import { countFilters, isEmpty } from './utils';
import { getStoredLanyardList, getStoredLanyards, saveListToLocal } from './lanyardStorage';

import { FilterQRCode } from './components/FilterQRCode';
import { PinAppDrawerSet } from './components/PinAppDrawerSet';
import { PinList } from './components/PinList';
import { PinSelectionListEditor } from './components/PinSelectionFilter';
import { generateRandomName } from './namegenerator';
import useHashParam from 'use-hash-param';

const isPinOnLanyard = (pin: Pin, lanyard: PinSelectionList): boolean => {
  return (
    lanyard.availableIds.includes(+pin.id) ||
    lanyard.wantedIds.includes(+pin.id)
  );
};

const App = (): JSX.Element => {
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

  const shouldDefaultShowSelection = (): boolean => {
    const rh: number = parseInt(revisionHash);
    if (!isNaN(rh) && rh > 0) {
      return true;
    }
    return false;
  };

  const [selectionFilterEnabled, setSelectionFilterEnabled] = useState<boolean>(
    shouldDefaultShowSelection()
  );

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

    const id: string = isEmpty(idHash) ? generateListId() : idHash;
    const name: string = isEmpty(listNameHash) ? '' : listNameHash;

    const selection: PinSelectionList = {
      ...newSelectionList(),
      availableIds,
      id,
      name,
      revision,
      wantedIds,
    };
    return [selection];
  };

  const [pinSelectionLists, updateLists] = useState<PinSelectionList[]>(
    buildSetsFromFilterHash()
  );
  const [activePinList, setActivePinList] = useState<PinSelectionList>(
    pinSelectionLists[0]
  );

  useEffect(() => {
    const fetchPins = async () => {
      const response = await fetch('pins.json', {
        mode: 'cors',
      });
      const data: any = await response.json();

      setPins(data.pins);
      setPinSets(data.sets);
      setPaxs(data.paxs);
    };
    const assignRandomName = async () => {
      const randomAnimal: string = await generateRandomName();
      if (isEmpty(listNameHash) && isEmpty(pinSelectionLists[0].name)) {
        console.log(
          'A random animal name has been assigned to this list: ' + randomAnimal
        );
        selectionListUpdated({
          ...pinSelectionLists[0],
          name: randomAnimal,
        });
      }
    };

    console.log(getStoredLanyards());

    fetchPins();
    assignRandomName();
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
    setActivePinList(updatedList);
    saveListToLocal(updatedList);
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
              pinSelection={activePinList}
              pinListFilterDisplay={
                <PinSearchFilterDisplay
                  filter={filter}
                  paxs={paxs}
                  pinSets={pinSets}
                  onChange={setFilter}
                />
              }
              qrCode={<FilterQRCode lanyard={activePinList} />}
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
              activePinSet={activePinList}
              filter={filter}
              heading={getPinListHeading()}
              isPinFiltered={(pin: Pin) => {
                if (selectionFilterEnabled) {
                  const isOnLanyard: boolean = isPinOnLanyard(
                    pin,
                    activePinList
                  );
                  return !isOnLanyard;
                }
                return isPinFiltered(pin, filter);
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
};

export default App;
