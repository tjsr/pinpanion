import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import { PinSelectionList } from '../types';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { filterStringToIds } from '../listutils';

type PinSelectionProps = {
  displayList: boolean;
  pinList: PinSelectionList;
  onChange: (updatedList: PinSelectionList) => void;
  changeListDisplayed: (display: boolean) => void;
};

export type PinSelectionFilterProps = {
  enableFilter: boolean;
  pinLists: PinSelectionList[];
  onChange: (updatedList: PinSelectionList) => void;
  changeListDisplayed: (id: string, display: boolean) => void;
};

export const PinSelectionEditor = ({
  changeListDisplayed,
  displayList,
  onChange,
  pinList,
}: PinSelectionProps): JSX.Element => {
  return (
    <>
      <div className="pinSelectionFilter">
        <div className="selectionFilterItem">
          <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
            <TextField
              id="listName"
              label="List Name"
              variant="outlined"
              value={pinList?.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const updatedList: PinSelectionList = {
                  ...pinList,
                  name: event.target.value,
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
              id="selectedPins"
              label="Wanted"
              variant="outlined"
              value={pinList?.wantedIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const wantedIds: number[] = filterStringToIds(
                  event.target.value
                );

                const updatedList: PinSelectionList = {
                  ...pinList,
                  revision: pinList.revision + 1,
                  wantedIds,
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
              id="selectedPins"
              label="Available"
              variant="outlined"
              value={pinList?.availableIds}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const availableIds: number[] = filterStringToIds(
                  event.target.value
                );
                const updatedList: PinSelectionList = {
                  ...pinList,
                  availableIds,
                  revision: pinList.revision + 1,
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
                  id="selectedPinsOnly"
                  checked={displayList}
                  onChange={(event: React.FormEvent<HTMLInputElement>) => {
                    changeListDisplayed(event.currentTarget.checked);
                  }}
                />
              }
              label="Show selected pins only"
            />
          </FormControl>
        </div>
      </div>
    </>
  );
};

export const PinSelectionListEditor = ({
  pinLists,
  onChange,
  enableFilter,
  changeListDisplayed,
}: PinSelectionFilterProps): JSX.Element => {
  return (
    <>
      {pinLists.map((pl) => (
        <PinSelectionEditor
          key={pl.id}
          pinList={pl}
          displayList={enableFilter}
          changeListDisplayed={(display: boolean) =>
            changeListDisplayed(pl.id, display)
          }
          onChange={onChange}
        />
      ))}
    </>
  );
};
