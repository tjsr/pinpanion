import './css/App.css';
import './css/pins.css';

import { ApplicationSettings, loadSettings, saveSettings } from './settingsStorage';
import { EMPTY_FILTER, newSelectionList } from './fixture';
import { PAX, PAXEvent, Pin, PinGroup, PinListFilter, PinSelectionList, PinSet } from './types.js';
import { PinSearchFilterDisplay, isPinFiltered, isPinSetFiltered } from './components/PinSearchFilter';
import React, { useEffect, useState } from 'react';
import { countFilters, isEmptyList, isPinOnLanyard, isPinSetOnLanyard, sanitizePinList } from './utils';
import { getActiveLanyard, getStoredLanyard, saveListToLocal, setActiveLanyardId } from './lanyardStorage';

import { AppSettingsPanel } from './components/AppSettingsPanel';
import { FilterQRCode } from './components/FilterQRCode';
import { LanyardPinList } from './components/LanyardPinList';
import { PinAppDrawerSet } from './components/PinAppDrawerSet';
import { PinCollectionData } from './pinnypals/pinnypals3convertor';
import { PinList } from './components/PinList';
import { PinSelectionListEditor } from './components/PinSelectionFilter';
import { decodePinSelectionHash } from './utils/decodePinSelectionList';
import { generateRandomName } from './namegenerator';

// import { PinCollectionData } from './pinnypals/pinnypals3convertor';

const PINS_CACHE_DATA_FILE = 'pins.json';

const App = (): JSX.Element => {
  const [pins, setPins] = useState<Pin[] | undefined>(undefined);
  const [pinSets, setPinSets] = useState<PinSet[]>([]);
  const [pinGroups, setPinGroups] = useState<PinGroup[]>([]);
  const [paxs, setPaxs] = useState<PAX[]>([]);
  const [events, setEvents] = useState<PAXEvent[]>([]);
  const [filter, setFilter] = useState<PinListFilter>({
    ...EMPTY_FILTER,
  });
  const [showInSets, setShowInSets] = useState<boolean>(false);


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
        setPinGroups(data.groups);
        setEvents(data.events);
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
      isEmptyList(lanyard)
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

  const getSetListHeading = (): string => {
    if (selectionFilterEnabled) {
      return 'Selected sets';
    } else if (countFilters(filter, showInSets)) {
      return 'Filtered sets';
    } else {
      return 'Pin Set list';
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
                allPins={pins}
                descendingAge={applicationSettings.descendingAge}
                displaySize={applicationSettings.displaySize}
                heading={`Lanyard for ${activePinList.name}`}
                availablePins={pins.filter((p) => activePinList.availableIds?.includes(+p.id))}
                wantedPins={pins.filter((p) => activePinList.wantedIds?.includes(+p.id))}
                paxs={paxs}
                events={events}
                pinSets={pinSets}
                groups={pinGroups}
                showInSets={showInSets}
                setShowInSets={setShowInSets}
                availableSets={pinSets.filter((ps) => activePinList.availableSetIds?.includes(+ps.id))}
                wantedSets={pinSets.filter((ps) => activePinList.wantedSetIds?.includes(+ps.id))}
              />
            ) : (
              <PinList
                activePinSet={activePinList}
                descendingAge={applicationSettings.descendingAge}
                displaySize={applicationSettings.displaySize}
                filter={filter}
                heading={showInSets ? getSetListHeading() : getPinListHeading()}
                isPinFiltered={(pin: Pin) => {
                  if (selectionFilterEnabled) {
                    const isOnLanyard: boolean = isPinOnLanyard(pin, activePinList);
                    return !isOnLanyard;
                  }
                  return isPinFiltered(pin, filter);
                }}
                isPinSetFiltered={(pinSet: PinSet) => {
                  if (selectionFilterEnabled) {
                    const isOnLanyard: boolean = isPinSetOnLanyard(pinSet, activePinList);
                    return !isOnLanyard;
                  }
                  const pinsInSet: Pin[] = pins.filter((pin) => pin.set_id === pinSet.id);
                  return isPinSetFiltered(pinSet, pinsInSet, filter);
                }}
                paxs={paxs}
                pins={pins}
                events={events}
                pinSets={pinSets}
                groups={pinGroups}
                setPinSet={selectionListUpdated}
                currentUserId={applicationSettings.localUserId}
                showInSets={showInSets}
                setShowInSets={setShowInSets}
              />
            )}
          </>
        )}
      </>
    </div>
  );
};

export default App;
