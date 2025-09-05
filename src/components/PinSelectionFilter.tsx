import type { PinSelectionList, UserId } from '../types.ts';

import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { LanyardSelectionDropdown } from './LanyardSelectionDropdown.tsx';
import { SEARCH_CONTROL_WIDTH } from '../globals.ts';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { filterStringToIds } from '../listutils.ts';
import { isEmptyList } from '../utils.ts';

type PinSelectionProps = {
  activeLanyard: PinSelectionList;
  changeListDisplayed: (display: boolean) => void;
  onlyShowSelectedPins: boolean;
  onChange: (updatedList: PinSelectionList) => void;
  showSelectedOnlyToggleDisabled?: () => boolean;
  currentUserId: UserId
};

export type PinSelectionFilterProps = {
  activeLanyard: PinSelectionList;
  changeListDisplayed: (id: string, display: boolean) => void;
  onlyShowSelectedPins: boolean;
  lanyardSelected: (lanyardId: string) => void;
  onChange: (updatedList: PinSelectionList) => void;
  storedLanyardList?: PinSelectionList[];
  currentUserId: UserId;
};

export const PinSelectionEditor = ({
  activeLanyard,
  changeListDisplayed,
  onlyShowSelectedPins,
  onChange,
  showSelectedOnlyToggleDisabled,
  currentUserId,
}: PinSelectionProps): JSX.Element => {
  if (!showSelectedOnlyToggleDisabled) {
    showSelectedOnlyToggleDisabled = () => {
      return isEmptyList(activeLanyard) || activeLanyard.ownerId !== currentUserId;
    };
  }

  const isEditable = currentUserId === activeLanyard.ownerId || activeLanyard.ownerId === undefined;

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
              disabled={!isEditable}
              id="wantedPins"
              label="Wanted"
              variant="outlined"
              value={activeLanyard.wantedIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                if (!isEditable) {
                  return false;
                }
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
              disabled={!isEditable}
              id="availablePins"
              label="Available"
              variant="outlined"
              value={activeLanyard.availableIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                if (!isEditable) {
                  return false;
                }
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
            <TextField
              disabled={!isEditable}
              id="wantedSets"
              label="Wanted Sets"
              variant="outlined"
              value={activeLanyard.wantedSetIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                if (!isEditable) {
                  return false;
                }
                const wantedSetIds: number[] = filterStringToIds(event.target.value);

                const updatedList: PinSelectionList = {
                  ...activeLanyard,
                  availableSetIds: activeLanyard.availableSetIds === undefined ? [] : activeLanyard.availableSetIds,
                  revision: activeLanyard.revision + 1,
                  wantedSetIds: wantedSetIds === undefined ? [] : wantedSetIds,
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
              disabled={!isEditable}
              id="availableSets"
              label="Available Sets"
              variant="outlined"
              value={activeLanyard.availableSetIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                if (!isEditable) {
                  return false;
                }
                const availableSetIds: number[] = filterStringToIds(event.target.value);
                const updatedList: PinSelectionList = {
                  ...activeLanyard,
                  availableSetIds: availableSetIds,
                  revision: activeLanyard.revision + 1,
                  wantedSetIds: activeLanyard.wantedSetIds === undefined ? [] : activeLanyard.wantedSetIds,
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
          {!isEditable && (
            <Alert severity="info">This lanyard is not editable, so only selected pins will be shown.</Alert>
          )}
        </div>
      </div>
    </>
  );
};

export const PinSelectionListEditor = ({
  activeLanyard,
  lanyardSelected,
  onChange,
  onlyShowSelectedPins,
  changeListDisplayed,
  storedLanyardList,
  currentUserId,
}: PinSelectionFilterProps): JSX.Element => {
  return (
    <>
      <div className="pinSelectionList">
        <LanyardSelectionDropdown
          storedLanyardList={storedLanyardList}
          lanyardSelected={lanyardSelected}
          activeLanyard={activeLanyard}
          id="lanyardSelect"
          currentUserId={currentUserId}
        />
      </div>
      <PinSelectionEditor
        key={activeLanyard.id}
        onlyShowSelectedPins={onlyShowSelectedPins}
        changeListDisplayed={(display: boolean) => changeListDisplayed(activeLanyard.id, display)}
        onChange={onChange}
        activeLanyard={activeLanyard}
        currentUserId={currentUserId}
      />
    </>
  );
};
