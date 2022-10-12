import Select, { SelectChangeEvent } from '@mui/material/Select';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { PinSelectionList } from '../types';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import { getStoredLanyards } from '../lanyardStorage';
import { isEmptyList } from '../utils';

type LanyardSelectionDropdownProps = {
  lanyardSelected: (lanyardId: string) => void;
  activeLanyard: PinSelectionList;
  id: string;
};

const hasLanyardData = (lanyard: PinSelectionList): boolean => {
  return !isEmptyList(lanyard);
};

export const LanyardSelectionDropdown = (props: LanyardSelectionDropdownProps): JSX.Element => {
  const lanyards: PinSelectionList[] = getStoredLanyards();
  const hasSelected: boolean =
    lanyards.filter((psl: PinSelectionList) => {
      psl.id === props.activeLanyard.id;
    }).length > 0;

  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={props.id}>Switch lanyard</InputLabel>
      <Select
        id={props.id}
        value={hasSelected ? props.activeLanyard.id : ''}
        label="Switch lanyard"
        onChange={(event: SelectChangeEvent) => {
          const selectedLanyard: string = event.target.value;
          props.lanyardSelected(selectedLanyard);
        }}
      >
        <MenuItem key={0} value="" disabled={isEmptyList(props.activeLanyard)}>
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
