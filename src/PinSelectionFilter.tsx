import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { PinListFilter } from './types';
import { SEARCH_CONTROL_WIDTH } from './globals';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';

type PinSelectionFilterProps = {
  filter: PinListFilter;
  onChange: (updatedFilter: PinListFilter) => void;
};

export const PinSelectionFilter = ({
  filter,
  onChange,
}: PinSelectionFilterProps): JSX.Element => {
  return (
    <>
      <div>
        <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
          <TextField
            id="selectedPins"
            label="Selected pins list"
            variant="outlined"
            value={filter?.selectedPinsList}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const updatedFilter: PinListFilter = {
                ...filter,
                selectedPinsList: event.target.value,
              };
              onChange(updatedFilter);
              return true;
            }}
          />
        </FormControl>
      </div>
      <div>
        <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
          <FormControlLabel
            control={
              <Switch
                id="selectedPinsOnly"
                checked={filter?.selectedPinsOnly}
                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                  const updatedFilter: PinListFilter = {
                    ...filter,
                    selectedPinsOnly: event.currentTarget.checked,
                  };
                  onChange(updatedFilter);
                }}
              />
            }
            label="Show selected pins only"
          />
        </FormControl>
      </div>
    </>
  );
};
