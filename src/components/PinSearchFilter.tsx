import '../css/pins.css';
import '../css/search.css';
import '../css/App.css';

import { PAXEvent, PAXEventId, PaxType, Pin, PinListFilter, PinSet } from '../types.js';

import Button from '@mui/material/Button';
import ClearIcon from '@mui/icons-material/Clear';
import { EMPTY_FILTER } from '../fixture.js';
import FormControl from '@mui/material/FormControl';
import { PAXEventSelector } from './PAXFilter.js';
import { PinSetSelector } from './PinSetSelector.js';
import { SEARCH_CONTROL_WIDTH } from '../globals.js';
import TextField from '@mui/material/TextField';
import { YearSelector } from './YearSelector.js';
import config from '../config.json';
import fuzzy from 'fuzzy';
import { isEmpty } from '../utils.js';

export type PinListFilterDisplayProps = {
  filter?: PinListFilter;
  // paxs: PAX[];
  events: PAXEvent[];
  pinSets?: PinSet[];
  onChange: (updatedFilter: PinListFilter) => void;
  isFilterEnabled: boolean;
};

const filterString = (filter: PinListFilter): string => {
  const start = filter.startYear && !isNaN(filter.startYear) ? filter.startYear : '*';
  const end = filter.endYear && !isNaN(filter.endYear) ? filter.endYear : '*';
  let output = start == '*' && end == '*' ? 'all years' : `${start}-${end}`;
  if (filter.setPinsOnly) {
    output += ', Set pins only';
  }
  return output;
};

export const PinSearchFilterDisplay = ({
  filter,
  isFilterEnabled,
  events,
  pinSets,
  onChange,
}: PinListFilterDisplayProps): JSX.Element => {
  return (
    <>
      <div className="searchFields">
        {filter && <div className="filterInfo">Filtered for {filterString(filter)}</div>}
        {isFilterEnabled && (
          <div className="searchHint">
            <strong>Note:</strong>You currently have a lanyard selected to display only its selected pins. Search
            results may appear to not update unless you un-check this from the 'Lanyards' drawer.
          </div>
        )}
        <div>
          <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
            <TextField
              id="filterText"
              label="Search text"
              value={filter?.filterText || ''}
              onChange={(event) => {
                const filterText: string = event.target.value;
                const updatedFilter = {
                  ...filter,
                  filterText,
                };

                onChange(updatedFilter);
              }}
            />
          </FormControl>
        </div>
        <div>
          <YearSelector
            id="startYear"
            selectedYear={filter?.startYear}
            minYear={config.minYear}
            maxYear={config.maxYear || new Date().getFullYear()}
            label="Earliest release year"
            yearChanged={(startYear: number) => {
              const updatedFilter = {
                ...filter,
                startYear,
              };
              if (filter?.endYear && startYear > filter.endYear) {
                updatedFilter.endYear = startYear;
              }

              onChange(updatedFilter);
            }}
          />
        </div>
        <div>
          <YearSelector
            id="endYear"
            selectedYear={filter?.endYear}
            minYear={config.minYear}
            maxYear={config.maxYear || new Date().getFullYear()}
            label="Latest release year"
            yearChanged={(endYear: number) => {
              const updatedFilter = {
                ...filter,
                endYear,
              };
              if (filter?.startYear && endYear < filter.startYear) {
                updatedFilter.startYear = endYear;
              }
              onChange(updatedFilter);
            }}
          />
        </div>
        {events ? (
          <div>
            <PAXEventSelector
              data-testid="paxEventSelector"
              id="byPax"
              events={events}
              selectedPaxEventOrType={filter?.paxType}
              eventSelected={(paxEventId: PAXEventId|undefined) => {
                const updatedFilter: PinListFilter = {
                  ...filter,
                  paxEventId,
                };
                onChange(updatedFilter);
              }}
            />
          </div>
        ) : (
          <div>No PAX events loaded.</div>
        )}
        {pinSets ? (
          <div>
            <PinSetSelector
              id="bySet"
              pinSets={pinSets}
              selectedSet={filter?.pinSetId}
              setSelected={(pinSetId: number | undefined) => {
                const updatedFilter = {
                  ...filter,
                  pinSetId,
                };
                onChange(updatedFilter);
              }}
            />
          </div>
        ) : (
          <div>No sets loaded.</div>
        )}
        {/* <div>
        <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
          <FormControlLabel
            control={
              <Switch
                id="setPinsOnly"
                checked={filter?.setPinsOnly}
                onChange={(event) => {
                  const updatedFilter: PinListFilter = {
                    ...filter,
                    setPinsOnly: event.target.checked,
                  };
                  onChange(updatedFilter);
                }}
              />
            }
            label="Set pins only"
          />
          </FormControl>
        </div> */}
        <Button
          variant="outlined"
          sx={{ marginBottom: 4 }}
          startIcon={<ClearIcon />}
          onClick={() => {
            onChange(EMPTY_FILTER);
          }}
        >
          Clear filters
        </Button>
      </div>
      <div className="searchHint">Search settings are updated immediately as you type or change selections.</div>
    </>
  );
};

export const isPinFiltered = (pin: Pin, filter?: PinListFilter, events?: PAXEvent[]): boolean => {
  if (!filter) {
    return false;
  }
  if (filter.startYear && pin.year < filter.startYear) {
    return true;
  }
  if (filter.endYear && pin.year > filter.endYear) {
    return true;
  }
  if (filter.pinSetId && pin.setId != filter.pinSetId) {
    return true;
  }
  if (filter.paxEventId && pin.paxEventId != filter.paxEventId) {
    return true;
  }
  if (filter.paxType && events && (
    pin.paxEventId && !isPaxEventType(pin.paxEventId, filter.paxType, events))) {
    return true;
  }

  const fuzzyChecks = [pin.name];
  if (pin.year != null && pin.year !== undefined && pin.year > 0) {
    fuzzyChecks.push(pin.year.toString());
  }

  if (!isEmpty(filter?.filterText)) {
    return fuzzy.filter(filter.filterText!, fuzzyChecks).length === 0;
  }

  return false;
};

const getEventById = (eventId: PAXEventId | undefined, eventList: PAXEvent[]): PAXEvent | undefined => {
  return eventList.find((event: PAXEvent) => event.id === eventId);
};

export const isPaxEventType = (eventId: PAXEventId | undefined, paxType: PaxType | undefined, eventList: PAXEvent[]): boolean|undefined => {
  const paxEvent = getEventById(eventId, eventList);

  if (paxType === undefined || eventId === undefined) {
    return undefined;
  }
  return paxEvent?.subType === paxType;
};

export const isPinSetFiltered = (pinSet: PinSet, pinsInSet: Pin[], filter?: PinListFilter, events?: PAXEvent[]): boolean => {
  if (!filter) {
    return false;
  }
  if (filter.startYear && pinSet.year && pinSet.year < filter.startYear) {
    return true;
  }
  if (filter.endYear && pinSet.year && pinSet.year > filter.endYear) {
    return true;
  }
  const hasPinInFilteredPax = events && pinsInSet.some((pin: Pin) => isPaxEventType(pin.paxEventId, filter.paxType, events));
  if (filter.paxType && !hasPinInFilteredPax) {
    return true;
  }

  const fuzzyChecks = [pinSet.name];
  if (pinSet.year != null && pinSet.year !== undefined && pinSet.year > 0) {
    fuzzyChecks.push(pinSet.year.toString());
  }

  if (!isEmpty(filter?.filterText)) {
    return fuzzy.filter(filter.filterText!, fuzzyChecks).length === 0;
  }

  return false;
};

