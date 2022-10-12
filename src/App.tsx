import './css/App.css';
import './css/pins.css';

import { EMPTY_FILTER, newSelectionList } from './fixture';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet, SizesType } from './types';
import { PinSearchFilterDisplay, isPinFiltered } from './components/PinSearchFilter';
import React, { useEffect, useState } from 'react';
import { countFilters, isEmptyList } from './utils';
import { getActiveLanyard, getStoredLanyard, saveListToLocal, setActiveLanyardId } from './lanyardStorage';
import { getDisplaySize, getSplitActiveAndWanted, saveDisplaySize, saveSplitActive } from './settingsStorage';

import { AppSettingsPanel } from './components/AppSettingsPanel';
import { FilterQRCode } from './components/FilterQRCode';
import { LanyardPinList } from './components/LanyardPinList';
import { PinAppDrawerSet } from './components/PinAppDrawerSet';
import { PinList } from './components/PinList';
import { PinSelectionListEditor } from './components/PinSelectionFilter';
import { generateRandomName } from './namegenerator';

const isPinOnLanyard = (pin: Pin, lanyard: PinSelectionList): boolean => {
  return lanyard.availableIds.includes(+pin.id) || lanyard.wantedIds.includes(+pin.id);
};

const App = (): JSX.Element => {
  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [filter, setFilter] = useState<PinListFilter>({
    ...EMPTY_FILTER,
  });
  const [displaySize, setDisplaySize] = useState<SizesType>(getDisplaySize());

  const shouldDefaultShowSelection = (): boolean => {
    return window.location.hash != '';
  };

  const [selectionFilterEnabled, setSelectionFilterEnabled] = useState<boolean>(shouldDefaultShowSelection());
  const [activePinList, setActivePinList] = useState<PinSelectionList | undefined>(undefined);
  const [splitActiveAndWanted, setSplitActiveAndWanted] = useState<boolean>(getSplitActiveAndWanted());

  useEffect(() => {
    saveSplitActive(splitActiveAndWanted);
  }, [splitActiveAndWanted]);

  useEffect(() => {
    if (activePinList && !isEmptyList(activePinList)) {
      setActiveLanyardId(activePinList.id);
      saveListToLocal(activePinList);
    }
  }, [activePinList]);

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
    const loadDefaultLanyard = async () => {
      let activeLanyard: PinSelectionList | undefined = getActiveLanyard();
      if (!activeLanyard) {
        activeLanyard = newSelectionList();
        setSelectionFilterEnabled(false);
      }

      const randomAnimal: string = await generateRandomName();
      console.log('A random animal name has been assigned to this list: ' + randomAnimal);
      selectionListUpdated({
        ...activeLanyard,
        name: randomAnimal,
      });
    };

    loadDefaultLanyard();
    fetchPins();
  }, []);

  const displaySizeChanged = (size: SizesType): void => {
    saveDisplaySize(size);
    setDisplaySize(size);
  };

  const selectionListUpdated = (updatedList: PinSelectionList): void => {
    if (isNaN(updatedList.revision)) {
      updatedList.revision = 0;
    }
    setActivePinList(updatedList);
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
        {pins && activePinList && (
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
                <PinSearchFilterDisplay
                  isFilterEnabled={selectionFilterEnabled}
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
