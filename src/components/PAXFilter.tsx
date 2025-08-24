import '../css/pins.css';

import { PAXEvent, PAXEventId, PaxType } from '../types.ts';
import React, { useEffect } from 'react';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { SEARCH_CONTROL_WIDTH } from '../globals';

type PAXSelectorProps = {
  id: string;
  events: PAXEvent[];
  // selectedPax: PaxType | undefined;
  selectedPaxEventOrType: PAXEventId|PaxType|undefined;
  eventSelected: (eventId: PAXEventId|undefined) => void;
  // eventSelected: (event: PaxType | undefined) => void;
};

export const PAXEventSelector = ({
  events,
  id,
  selectedPaxEventOrType,
  eventSelected: paxSelected,
}: PAXSelectorProps): JSX.Element => {
  const [selectValue, setSelectValue] = React.useState<string>('');
  useEffect(() => {
    if (typeof selectedPaxEventOrType === 'number') {
      setSelectValue(selectedPaxEventOrType.toString());
    } else if (typeof selectedPaxEventOrType === 'string') {
      setSelectValue(selectedPaxEventOrType);
    } else {
      setSelectValue('');
    }
  }, [selectedPaxEventOrType]);

  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={id}>Filter by PAX</InputLabel>
      <Select
        id={id}
        label="Filter by PAX"
        value={selectValue}
        onChange={(event: SelectChangeEvent) => {
          if (event.target.value === '') {
            paxSelected(undefined);
          } else {
            paxSelected(parseInt(event.target.value) as PAXEventId);
            // paxSelected(event.target.value as PaxType);
          }
        }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {events.map((e: PAXEvent) => (
          <MenuItem key={`event_${e.id}`} value={e.id}>
            {e.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
