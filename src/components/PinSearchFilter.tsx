import '../css/pins.css';
import '../css/search.css';
import '../css/App.css';

import { PAX, Pin, PinListFilter, PinSet } from '../types';

import Button from '@mui/material/Button';
import ClearIcon from '@mui/icons-material/Clear';
import { EMPTY_FILTER } from '../fixture';
import FormControl from '@mui/material/FormControl';
import { PAXSelector } from './PAXFilter';
import { PinSetSelector } from './PinSetSelector';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import TextField from '@mui/material/TextField';
import { YearSelector } from './YearSelector';
import config from '../config.json';
import fuzzy from 'fuzzy';
import { isEmpty } from '../utils';

export type PinListFilterDisplayProps = {
  filter?: PinListFilter;
  paxs?: PAX[];
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
  paxs,
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
        {paxs ? (
          <div>
            <PAXSelector
              id="byPax"
              paxs={paxs}
              selectedPax={filter?.paxId}
              paxSelected={(paxId: number | undefined) => {
                const updatedFilter = {
                  ...filter,
                  paxId,
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

export const isPinFiltered = (pin: Pin, filter?: PinListFilter): boolean => {
  if (!filter) {
    return false;
  }
  if (filter.startYear && pin.year < filter.startYear) {
    return true;
  }
  if (filter.endYear && pin.year > filter.endYear) {
    return true;
  }
  if (filter.paxId && pin.paxId != filter.paxId) {
    return true;
  }
  if (filter.pinSetId && pin.set_id != filter.pinSetId) {
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

export const isPinSetFiltered = (pinSet: PinSet, pinsInSet: Pin[], filter?: PinListFilter): boolean => {
  if (!filter) {
    return false;
  }
  if (filter.startYear && pinSet.year && pinSet.year < filter.startYear) {
    return true;
  }
  if (filter.endYear && pinSet.year && pinSet.year > filter.endYear) {
    return true;
  }
  const hasPinInFilteredPax = pinsInSet.some((pin: Pin) => pin.paxId == filter.paxId);
  if (filter.paxId && !hasPinInFilteredPax) {
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

