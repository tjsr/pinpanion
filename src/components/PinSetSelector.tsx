import Select, { type SelectChangeEvent } from '@mui/material/Select';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import type { PinSet } from '../types.ts';
import { SEARCH_CONTROL_WIDTH } from '../globals.ts';

type PinSetSelectorProps = {
  id: string;
  pinSets: PinSet[];
  selectedSet: number | undefined;
  setSelected: (setId: number | undefined) => void;
};

export const PinSetSelector = ({
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
