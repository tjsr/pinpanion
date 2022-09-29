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

export const LanyardSelectionDropdown = (props:LanyardSelectionDropdownProps): JSX.Element => {
  const lanyards: PinSelectionList[] = getStoredLanyards();

  return (<FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
    <InputLabel id={props.id}>Switch lanyard</InputLabel>
    <Select
      id={props.id}
      value=""
      label="Switch lanyard"
      onChange={(event: SelectChangeEvent) => {
        const selectedLanyard: string = event.target.value;
        if (selectedLanyard != '') {
          props.lanyardSelected(selectedLanyard);
        }
      }}
    >
      <MenuItem key={0} value="">
        <em>None</em>
      </MenuItem>
      {lanyards.filter((l) => l.id !== props.activeLanyard.id).map((l: PinSelectionList) => {
        return (
          <MenuItem key={l.id} value={l.id}>
            {l.name}
          </MenuItem>
        );
      })}
    </Select>
  </FormControl>
  );
};
