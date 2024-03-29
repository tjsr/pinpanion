import './css/App.css';
import './css/pins.css';

import { ApplicationSettings, loadSettings, saveSettings } from './settingsStorage';
import { EMPTY_FILTER, newSelectionList } from './fixture';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet } from './types';
import { PinSearchFilterDisplay, isPinFiltered } from './components/PinSearchFilter';
import React, { useEffect, useState } from 'react';
import { countFilters, isEmptyList, isPinOnLanyard, sanitizePinList } from './utils';
import { getActiveLanyard, getStoredLanyard, saveListToLocal, setActiveLanyardId } from './lanyardStorage';

import { AppSettingsPanel } from './components/AppSettingsPanel';
import { FilterQRCode } from './components/FilterQRCode';
import { LanyardPinList } from './components/LanyardPinList';
import { PinAppDrawerSet } from './components/PinAppDrawerSet';
import { PinCollectionData } from './pinnypals/pinnypals2convertor';
import { PinList } from './components/PinList';
import { PinSelectionListEditor } from './components/PinSelectionFilter';
import { decodePinSelectionHash } from './utils/decodePinSelectionList';
import { generateRandomName } from './namegenerator';

const PINS_CACHE_DATA_FILE = 'pins.json';

const App = (): JSX.Element => {
  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [filter, setFilter] = useState<PinListFilter>({
    ...EMPTY_FILTER,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hash, setHash] = React.useState(() => window.location.hash);

  const hashChanged = React.useCallback(() => {
    setHash(window.location.hash);
    console.log(`Read hash value: ${window.location.hash}`);
  }, []);

  const hasListOnUrlHash = (): boolean => {
    return window.location.hash !== undefined && window.location.hash.startsWith('#');
  };

  const processCurrentHash = (): void => {
    if (hasListOnUrlHash()) {
      const pinSelection: PinSelectionList = decodePinSelectionHash(
        window.location.hash);
      // check that we're not the owner of this list
      selectionListUpdated(pinSelection);
    }
  };

  React.useEffect(() => {
    window.addEventListener('hashchange', hashChanged);
    return () => {
      window.removeEventListener('hashchange', hashChanged);
    };
  }, []);

  const shouldDefaultShowSelection = (): boolean => {
    return window.location.hash != '';
  };

  const [selectionFilterEnabled, setSelectionFilterEnabled] = useState<boolean>(shouldDefaultShowSelection());
  const [activePinList, setActivePinList] = useState<PinSelectionList | undefined>(undefined);
  const [applicationSettings, setApplicationSettings] = useState<ApplicationSettings>(loadSettings());

  useEffect(() => {
    saveSettings(applicationSettings);
  }, [applicationSettings]);

  useEffect(() => {
    if (activePinList && !isEmptyList(activePinList)) {
      setActiveLanyardId(activePinList.id);
      saveListToLocal(activePinList);
    } else {
      setSelectionFilterEnabled(false);
    }
  }, [activePinList]);

  useEffect(() => {
    const fetchPins = async () => {
      try {
        const response = await fetch(PINS_CACHE_DATA_FILE, {
          mode: 'cors',
        });
        const data: PinCollectionData = await response.json();
        console.log(`Loaded pins list from ${PINS_CACHE_DATA_FILE}`);

        setPins(data.pins);
        setPinSets(data.sets);
        if (!data.pax || data?.pax.length === 0) {
          console.warn('PAX event data received from server was an empty set.');
        } else {
          setPaxs(data.pax);
        }
      } catch (err) {
        console.warn(`Failed while trying to fetch  ${PINS_CACHE_DATA_FILE} file: ${err}`);
      }
    };
    const loadDefaultLanyard = async () => {
      let activeLanyard: PinSelectionList | undefined = getActiveLanyard();
      if (!activeLanyard) {
        setSelectionFilterEnabled(false);
      }
      if (!activeLanyard) {
        activeLanyard = newSelectionList(applicationSettings.localUserId);
      }

      const randomAnimal: string = activeLanyard ? activeLanyard.name : await generateRandomName();
      console.log('A random animal name has been assigned to this list: ' + randomAnimal);
      selectionListUpdated({
        ...activeLanyard,
        availableIds: activeLanyard.availableIds === undefined ? [] : activeLanyard.availableIds,
        name: randomAnimal,
        wantedIds: activeLanyard.wantedIds === undefined ? [] : activeLanyard.wantedIds,
      });
    };

    if (hasListOnUrlHash()) {
      processCurrentHash();
    } else {
      loadDefaultLanyard();
    }
    fetchPins();
  }, []);

  const updateFilterSelectionFromLanyard = (lanyard: PinSelectionList): void => {
    if (
      lanyard.availableIds?.length === 0 &&
      lanyard.wantedIds?.length === 0
    ) {
      console.debug('Set selection filter enabled to false because list is empty');
      setSelectionFilterEnabled(false);
    } else if (lanyard.ownerId !== applicationSettings.localUserId) {
      console.debug('Set selection filter enabled to true because list is not editable');
      setSelectionFilterEnabled(true);
    }
  };

  const selectionListUpdated = (updatedList: PinSelectionList): void => {
    if (isNaN(updatedList.revision)) {
      updatedList.revision = 0;
    }

    updateFilterSelectionFromLanyard(updatedList);
    sanitizePinList(updatedList, applicationSettings);
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
    const lanyard: PinSelectionList | undefined = getStoredLanyard(lanyardId, applicationSettings);
    if (lanyard) {
      sanitizePinList(lanyard, applicationSettings);
      setActivePinList(lanyard);
      updateFilterSelectionFromLanyard(lanyard);

      return Promise.resolve();
    } else {
      const newList: PinSelectionList = newSelectionList(applicationSettings.localUserId);
      const randomAnimal: string = await generateRandomName();
      newList.name = randomAnimal;
      selectionListUpdated(newList);
      return Promise.resolve();
    }
  };

  if (pins === undefined) {
    return <div className="App">Pin list was not loaded.</div>;
  }

  console.log(`Rendering ${pins?.length} pins`);
  if (!paxs) {
    console.warn('Got no PAX set when rendering pins.');
  }
  return (
    <div className="App">
      <>
        {pins && activePinList && (
          <>
            <PinAppDrawerSet
              appSettingsPanel={
                <AppSettingsPanel settings={applicationSettings} updateSettings={(settings) => {
                  if (settings.userDisplayName?.trim() === '') {
                    settings.userDisplayName = undefined;
                  }
                  setApplicationSettings(settings);
                }} />
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
                  onlyShowSelectedPins={selectionFilterEnabled}
                  onChange={selectionListUpdated}
                  changeListDisplayed={(id: string, display: boolean) => {
                    // When the switch checkbox is toggled, set the show only marked pins selection to match.
                    setSelectionFilterEnabled(display);
                  }}
                  activeLanyard={activePinList}
                  lanyardSelected={lanyardSelected}
                  currentUserId={applicationSettings.localUserId}
                />
              }
            />
            {applicationSettings.splitActiveAndWanted && selectionFilterEnabled ? (
              <LanyardPinList
                descendingAge={applicationSettings.descendingAge}
                displaySize={applicationSettings.displaySize}
                heading={`Lanyard for ${activePinList.name}`}
                availablePins={pins.filter((p) => activePinList.availableIds?.includes(+p.id))}
                wantedPins={pins.filter((p) => activePinList.wantedIds?.includes(+p.id))}
                paxs={paxs}
                pinSets={pinSets}
              />
            ) : (
              <PinList
                activePinSet={activePinList}
                descendingAge={applicationSettings.descendingAge}
                displaySize={applicationSettings.displaySize}
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
                currentUserId={applicationSettings.localUserId}
              />
            )}
          </>
        )}
      </>
    </div>
  );
};

export default App;
