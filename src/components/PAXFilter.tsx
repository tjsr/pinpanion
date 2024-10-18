import '../css/pins.css';

import { PAX, PaxType } from '../types.js';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import eventnames from '../static/eventDisplayTypes.json';

type PAXSelectorProps = {
  id: string;
  paxs: PAX[];
  selectedPax: PaxType | undefined;
  paxSelected: (setId: number | undefined) => void;
};

export const PAXSelector = ({
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
