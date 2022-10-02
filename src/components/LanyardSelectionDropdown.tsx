import Select, { SelectChangeEvent } from '@mui/material/Select';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { PinSelectionList } from '../types';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import { getStoredLanyards } from '../lanyardStorage';

type LanyardSelectionDropdownProps = {
  lanyardSelected: (lanyardId: string) => void;
  activeLanyard: PinSelectionList;
  id: string
};

const hasLanyardData = (lanyard: PinSelectionList): boolean => {
  return !isEmptyList(lanyard);
};

const isEmptyList = (lanyard: PinSelectionList): boolean => {
  return (
    (lanyard.availableIds === undefined || lanyard.availableIds?.length === 0) &&
    (lanyard.wantedIds === undefined || lanyard.wantedIds?.length === 0)
  );
};

export const LanyardSelectionDropdown = (props: LanyardSelectionDropdownProps): JSX.Element => {
  const lanyards: PinSelectionList[] = getStoredLanyards();

  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={props.id}>Switch lanyard</InputLabel>
      <Select
        id={props.id}
        value={props.activeLanyard.id}
        label="Switch lanyard"
        onChange={(event: SelectChangeEvent) => {
          const selectedLanyard: string = event.target.value;
          props.lanyardSelected(selectedLanyard);
        }}
      >
        <MenuItem key={0} value="">
          <em>Create a new lanyard</em>
        </MenuItem>
        {lanyards.filter(hasLanyardData).map((l: PinSelectionList) => {
          return (
            <MenuItem key={l.id} value={l.id}>
              {l.id == props.activeLanyard.id ? <strong>{l.name}</strong> : l.name}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
