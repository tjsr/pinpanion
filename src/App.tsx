import './css/App.css';
import './css/pins.css';

import { EMPTY_FILTER, generateListId, newSelectionList } from './fixture';
import {
  PAX,
  Pin,
  PinListFilter,
  PinSelectionList,
  PinSet,
  SizesType,
} from './types';
import {
  PinSearchFilterDisplay,
  isPinFiltered,
} from './components/PinSearchFilter';
import React, { useEffect, useState } from 'react';
import { countFilters, isEmpty } from './utils';
import {
  getDisplaySize,
  getSplitActiveAndWanted,
  saveDisplaySize,
  saveSplitActive,
} from './settingsStorage';
import { getStoredLanyard, saveListToLocal } from './lanyardStorage';

import { AppSettingsPanel } from './components/AppSettingsPanel';
import { FilterQRCode } from './components/FilterQRCode';
import { LanyardPinList } from './components/LanyardPinList';
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
  const [displaySize, setDisplaySize] = useState<SizesType>(getDisplaySize());

  const shouldDefaultShowSelection = (): boolean => {
    const rh: number = parseInt(revisionHash);
    if (!isNaN(rh) && rh > 0) {
      return true;
    }
    return false;
  };

  const [selectionFilterEnabled, setSelectionFilterEnabled] = useState<boolean>(shouldDefaultShowSelection());

  const buildSetsFromFilterHash = (baseList: PinSelectionList = newSelectionList()): PinSelectionList => {
    let revision: number = parseInt(revisionHash);
    if (isNaN(revision)) {
      revision = 0;
    }
    const availableIds: number[] = isEmpty(availIdHash) ? [] : availIdHash.split(',').map((n) => parseInt(n));
    const wantedIds: number[] = isEmpty(wantedIdHash) ? [] : wantedIdHash.split(',').map((n) => parseInt(n));

    const id: string = isEmpty(idHash) ? generateListId() : idHash;
    const name: string = isEmpty(listNameHash) ? '' : listNameHash;

    const selection: PinSelectionList = {
      ...baseList,
      availableIds,
      id,
      name,
      revision,
      wantedIds,
    };
    return selection;
  };

  const [activePinList, setActivePinList] = useState<PinSelectionList>(buildSetsFromFilterHash());

  const [splitActiveAndWanted, setSplitActiveAndWanted] = useState<boolean>(getSplitActiveAndWanted());

  useEffect(() => {
    saveSplitActive(splitActiveAndWanted);
  }, [splitActiveAndWanted]);

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
      if (isEmpty(listNameHash) && isEmpty(activePinList.name)) {
        console.log('A random animal name has been assigned to this list: ' + randomAnimal);
        selectionListUpdated({
          ...activePinList,
          name: randomAnimal,
        });
      }
    };

    fetchPins();
    assignRandomName();
  }, []);

  const displaySizeChanged = (size: SizesType): void => {
    saveDisplaySize(size);
    setDisplaySize(size);
  };

  const updateListHash = (selection: PinSelectionList): void => {
    setAvailIdHash(selection.availableIds.join(','));
    setWantedIdHash(selection.wantedIds.join(','));
    setIdHash(selection.id);
    setlistNameHash(selection.name);
    setRevisionHash(selection.revision.toString());
    window.location.href = window.location.href.replaceAll('%2C', ',');
  };

  const selectionListUpdated = (updatedList: PinSelectionList, skipHashUpdate = false): void => {
    if (isNaN(updatedList.revision)) {
      updatedList.revision = 0;
    }
    if (!skipHashUpdate) {
      updateListHash(updatedList);
    }
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

  const lanyardSelected = async (lanyardId: string): Promise<void> => {
    console.log('Lanyard: ', lanyardId);
    const lanyard: PinSelectionList | undefined = getStoredLanyard(lanyardId);
    if (lanyard) {
      setActivePinList(lanyard);
      updateListHash(lanyard);
      return Promise.resolve();
    } else {
      const newList: PinSelectionList = newSelectionList();
      const randomAnimal: string = await generateRandomName();
      newList.name = randomAnimal;
      selectionListUpdated(newList);
      return Promise.resolve();
    }
  };

  return (
    <div className="App">
      <>
        {pins && (
          <>
            <PinAppDrawerSet
              appSettingsPanel={
                <AppSettingsPanel
                  size={displaySize}
                  setObjectSize={displaySizeChanged}
                  splitActiveAndWanted={splitActiveAndWanted}
                  setSplitActiveAndWanted={setSplitActiveAndWanted}
                />
              }
              filter={filter}
              isSelectionActive={selectionFilterEnabled}
              pinSelection={activePinList}
              pinListFilterDisplay={
                <PinSearchFilterDisplay filter={filter} paxs={paxs} pinSets={pinSets} onChange={setFilter} />
              }
              qrCode={<FilterQRCode lanyard={activePinList} />}
              pinSelectionFilter={
                <PinSelectionListEditor
                  enableFilter={selectionFilterEnabled}
                  onChange={selectionListUpdated}
                  changeListDisplayed={(id: string, display: boolean) => {
                    setSelectionFilterEnabled(display);
                  }}
                  activeLanyard={activePinList}
                  lanyardSelected={lanyardSelected}
                />
              }
            />
            {splitActiveAndWanted && selectionFilterEnabled ? (
              <LanyardPinList
                displaySize={displaySize}
                heading={`Lanyard for ${activePinList.name}`}
                availablePins={pins.filter((p) => activePinList.availableIds.includes(+p.id))}
                wantedPins={pins.filter((p) => activePinList.wantedIds.includes(+p.id))}
                paxs={paxs}
                pinSets={pinSets}
              />
            ) : (
              <PinList
                activePinSet={activePinList}
                displaySize={displaySize}
                filter={filter}
                heading={getPinListHeading()}
                isPinFiltered={(pin: Pin) => {
                  if (selectionFilterEnabled) {
                    const isOnLanyard: boolean = isPinOnLanyard(pin, activePinList);
                    return !isOnLanyard;
                  }
                  return isPinFiltered(pin, filter);
                }}
                paxs={paxs}
                pins={pins}
                pinSets={pinSets}
                setPinSet={selectionListUpdated}
              />
            )}
          </>
        )}
      </>
    </div>
  );
};

export default App;
