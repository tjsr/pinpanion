import '../css/pins.css';

import { PAX, Pin, PinListFilter, PinSet } from '../types';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import Button from '@mui/material/Button';
import ClearIcon from '@mui/icons-material/Clear';
import { EMPTY_FILTER } from '../fixture';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import TextField from '@mui/material/TextField';
import { YearSelector } from './YearSelector';
import eventnames from '../eventnames.json';
import { filterStringToIds } from '../listutils';
import fuzzy from 'fuzzy';
import { isEmpty } from '../utils';

export type PinListFilterDisplayProps = {
  filter?: PinListFilter;
  paxs?: PAX[];
  pinSets?: PinSet[];
  onChange: (updatedFilter: PinListFilter) => void;
};

type PinSetSelectorProps = {
  id: string;
  pinSets: PinSet[];
  selectedSet: number | undefined;
  setSelected: (setId: number | undefined) => void;
};

const PinSetSelector = ({
  pinSets,
  id,
  selectedSet,
  setSelected,
}: PinSetSelectorProps): JSX.Element => {
  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={id}>Filter by Set</InputLabel>
      <Select
        id={id}
        label="Filter by Set"
        value={selectedSet !== undefined ? selectedSet.toString() : ''}
        onChange={(event: SelectChangeEvent) => {
          if (event.target?.value === '') {
            setSelected(undefined);
          } else {
            setSelected(parseInt(event.target.value));
          }
        }}
      >
        <MenuItem key="set_0" value="">
          <em>None</em>
        </MenuItem>
        {pinSets.map((s: PinSet) => (
          <MenuItem key={`set_${s.id}`} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

type PAXSelectorProps = {
  id: string;
  paxs: PAX[];
  selectedPax: number | undefined;
  paxSelected: (setId: number | undefined) => void;
};

const PAXSelector = ({
  paxs,
  id,
  selectedPax,
  paxSelected,
}: PAXSelectorProps): JSX.Element => {
  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={id}>Filter by PAX</InputLabel>
      <Select
        id={id}
        label="Filter by PAX"
        value={selectedPax?.toString() || ''}
        onChange={(event: SelectChangeEvent) => {
          if (event.target.value === '') {
            paxSelected(undefined);
          } else {
            paxSelected(parseInt(event.target.value));
          }
        }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {paxs.map((p: PAX) => (
          <MenuItem key={`pax_${p.id}`} value={p.id}>
            {eventnames[p.id].description}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const filterString = (filter: PinListFilter): string => {
  const start =
    filter.startYear && !isNaN(filter.startYear) ? filter.startYear : '*';
  const end = filter.endYear && !isNaN(filter.endYear) ? filter.endYear : '*';
  let output = start == '*' && end == '*' ? 'all years' : `${start}-${end}`;
  if (filter.setPinsOnly) {
    output += ', Set pins only';
  }
  return output;
};

export const PinListFilterDisplay = ({
  filter,
  paxs,
  pinSets,
  onChange,
}: PinListFilterDisplayProps): JSX.Element => {
  return (
    <>
      {filter && (
        <div className="filterInfo">Filtered for {filterString(filter)}</div>
      )}
      <div className="searchFields">
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
            minYear={2013}
            maxYear={2022}
            label="Year from"
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
            minYear={2013}
            maxYear={2022}
            label="Year until"
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
    </>
  );
};

export const isPinSelected = (
  filter: PinListFilter | undefined,
  pinId: number
): boolean => {
  if (!filter) {
    return false;
  }
  if (isEmpty(filter.selectedPinsList)) {
    return false;
  }
  const ids: number[] = filterStringToIds(filter.selectedPinsList || '');
  if (ids.includes(+pinId)) {
    return true;
  }
  return false;
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
  if (filter.setPinsOnly && pin.sub_set_id == null) {
    return true;
  }
  if (filter.paxId && pin.pax_id != filter.paxId) {
    return true;
  }
  if (filter.pinSetId && pin.set_id != filter.pinSetId) {
    return true;
  }

  if (!isEmpty(filter?.filterText)) {
    return fuzzy.filter(filter.filterText!, [pin.name, pin.year]).length === 0;
  }

  return false;
};
