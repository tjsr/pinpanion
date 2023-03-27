import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { LanyardSelectionDropdown } from './LanyardSelectionDropdown';
import { PinSelectionList } from '../types';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { filterStringToIds } from '../listutils';
import { isEmptyList } from '../utils';

type PinSelectionProps = {
  activeLanyard: PinSelectionList;
  changeListDisplayed: (display: boolean) => void;
  onlyShowSelectedPins: boolean;
  onChange: (updatedList: PinSelectionList) => void;
  showSelectedOnlyToggleDisabled?: () => boolean;
};

export type PinSelectionFilterProps = {
  activeLanyard: PinSelectionList;
  changeListDisplayed: (id: string, display: boolean) => void;
  enableFilter: boolean;
  lanyardSelected: (lanyardId: string) => void;
  onChange: (updatedList: PinSelectionList) => void;
  storedLanyardList?: PinSelectionList[];
};

export const PinSelectionEditor = ({
  activeLanyard,
  changeListDisplayed,
  onlyShowSelectedPins,
  onChange,
  showSelectedOnlyToggleDisabled,
}: PinSelectionProps): JSX.Element => {
  if (!showSelectedOnlyToggleDisabled) {
    showSelectedOnlyToggleDisabled = () => {
      return isEmptyList(activeLanyard) || !activeLanyard.editable;
    };
  }

  return (
    <>
      <div className="pinSelectionFilter">
        Current:
        <div className="selectionFilterItem">
          <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
            <TextField
              id="listName"
              label="List Name"
              variant="outlined"
              value={activeLanyard.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const updatedList: PinSelectionList = {
                  ...activeLanyard,
                  availableIds: activeLanyard.availableIds === undefined ? [] : activeLanyard.availableIds,
                  name: event.target.value,
                  wantedIds: activeLanyard.wantedIds === undefined ? [] : activeLanyard.wantedIds,
                };
                onChange(updatedList);
                return true;
              }}
            />
          </FormControl>
        </div>
        <div className="selectionFilterItem">
          <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
            <TextField
              id="selectedPins"
              label="Wanted"
              variant="outlined"
              value={activeLanyard.wantedIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const wantedIds: number[] = filterStringToIds(event.target.value);

                const updatedList: PinSelectionList = {
                  ...activeLanyard,
                  availableIds: activeLanyard.availableIds === undefined ? [] : activeLanyard.availableIds,
                  revision: activeLanyard.revision + 1,
                  wantedIds: wantedIds === undefined ? [] : wantedIds,
                };
                onChange(updatedList);
                return true;
              }}
            />
          </FormControl>
        </div>
        <div className="selectionFilterItem">
          <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
            <TextField
              id="selectedPins"
              label="Available"
              variant="outlined"
              value={activeLanyard.availableIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const availableIds: number[] = filterStringToIds(event.target.value);
                const updatedList: PinSelectionList = {
                  ...activeLanyard,
                  availableIds,
                  revision: activeLanyard.revision + 1,
                  wantedIds: activeLanyard.wantedIds === undefined ? [] : activeLanyard.wantedIds,
                };
                onChange(updatedList);
                return true;
              }}
            />
          </FormControl>
        </div>
        <div className="selectionFilterItem">
          <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
            <FormControlLabel
              control={
                <Switch
                  disabled={showSelectedOnlyToggleDisabled()}
                  id="selectedPinsOnly"
                  checked={onlyShowSelectedPins}
                  onChange={(event: React.FormEvent<HTMLInputElement>) => {
                    changeListDisplayed(event.currentTarget.checked);
                  }}
                />
              }
              label="Show selected pins only"
            />
          </FormControl>
          {!activeLanyard.editable && (
            <Alert severity="info">This lanyard is not editable, so only selected pins will be shown.</Alert>
          )}
          <div className="knownBug">
            <strong>Known bug:</strong> Due to the app re-rendering 1400 pins on every change, tapping this button might
            take 3-5 seconds on some mobile devices. Give it a moment as clicking again might just toggle it again, and
            cause another re-render. This will be fixed ASAP, but not by October 9.
          </div>
        </div>
      </div>
    </>
  );
};

export const PinSelectionListEditor = ({
  activeLanyard,
  lanyardSelected,
  onChange,
  enableFilter,
  changeListDisplayed,
  storedLanyardList,
}: PinSelectionFilterProps): JSX.Element => {
  return (
    <>
      <div className="pinSelectionList">
        <LanyardSelectionDropdown
          storedLanyardList={storedLanyardList}
          lanyardSelected={lanyardSelected}
          activeLanyard={activeLanyard}
          id="lanyardSelect"
        />
      </div>
      <PinSelectionEditor
        key={activeLanyard.id}
        onlyShowSelectedPins={enableFilter}
        changeListDisplayed={(display: boolean) => changeListDisplayed(activeLanyard.id, display)}
        onChange={onChange}
        activeLanyard={activeLanyard}
      />
    </>
  );
};
