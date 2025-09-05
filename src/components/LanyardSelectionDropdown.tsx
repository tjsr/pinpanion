import type { PinSelectionList, UserId } from '../types.ts';

import FormControl from '@mui/material/FormControl';
import { InputAdornment } from '@mui/material';
import InputLabel from '@mui/material/InputLabel';
import LockPerson from '@mui/icons-material/LockPerson';
import MenuItem from '@mui/material/MenuItem';
import { SEARCH_CONTROL_WIDTH } from '../globals.ts';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import { getStoredLanyards } from '../lanyardStorage.ts';
import { isEmptyList } from '../utils.ts';

type LanyardSelectionDropdownProps = {
  lanyardSelected: (lanyardId: string) => void;
  activeLanyard: PinSelectionList;
  id: string;
  storedLanyardList?: PinSelectionList[];
  currentUserId: UserId
};

const hasLanyardData = (lanyard: PinSelectionList): boolean => {
  return !isEmptyList(lanyard);
};

export const LanyardSelectionDropdown = (props: LanyardSelectionDropdownProps): JSX.Element => {
  const lanyards: PinSelectionList[] =
    props.storedLanyardList === undefined ? getStoredLanyards() : props.storedLanyardList;
  const hasSelected: boolean =
    lanyards.filter((psl: PinSelectionList) => {
      psl.id === props.activeLanyard.id;
    }).length > 0;

  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={props.id}>Switch lanyard</InputLabel>
      <Select
        data-testid="lanyardSelectTestElement"
        id={props.id}
        value={hasSelected ? props.activeLanyard.id : ''}
        label="Switch lanyard"
        onChange={(event: SelectChangeEvent) => {
          const selectedLanyard: string = event.target.value;
          props.lanyardSelected(selectedLanyard);
        }}
      >
        <MenuItem key={0} value="new" disabled={isEmptyList(props.activeLanyard)}>
          <em>Create a new lanyard</em>
        </MenuItem>
        {lanyards.filter(hasLanyardData).map((l: PinSelectionList) => {
          return (
            <MenuItem key={l.id} value={l.id}>
              {l.id == props.activeLanyard.id ? <strong>{l.name}</strong> : l.name}
              {l.ownerId !== props.currentUserId && <InputAdornment position="end"><LockPerson /></InputAdornment>}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
