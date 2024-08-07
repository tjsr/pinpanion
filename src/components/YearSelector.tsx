import Select, { SelectChangeEvent } from '@mui/material/Select';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import config from '../config.json';

type YearSelectorProps = {
  minYear: number;
  maxYear?: number | null;
  selectedYear?: number;
  yearChanged: (year: number) => void;
  id?: string;
  label?: string;
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

export const YearSelector = (props: YearSelectorProps): JSX.Element => {
  let years = [];

  const maxYear = !props.maxYear ? getCurrentYear() : props.maxYear;

  for (let cy = props.minYear; cy <= maxYear; cy++) {
    years.push(cy);
  }
  if (config.reverseYears) {
    years = years.reverse();
  }
  return (
    <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
      <InputLabel id={props.id}>{props.label}</InputLabel>
      <Select
        id={props.id}
        value={
          props.selectedYear !== undefined && !isNaN(props.selectedYear) ?
            props.selectedYear.toString() :
            ''
        }
        label={props.label}
        onChange={(event: SelectChangeEvent) => {
          const selectedYear: number = parseInt(event.target.value);
          props.yearChanged(selectedYear);
        }}
      >
        <MenuItem key={0} value="">
          <em>None</em>
        </MenuItem>
        {years.map((y) => {
          return (
            <MenuItem key={y} value={y?.toString()}>
              {y}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
