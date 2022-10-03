import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import React from 'react';
import { SEARCH_CONTROL_WIDTH } from '../globals';
import { SizesType } from '../types';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

type ObjectSizeSettingProps = {
  size: SizesType;
  setObjectSize: (size: SizesType) => void;
};

export type AppSettingsPanelProps = {
  size: SizesType;
  setObjectSize: (size: SizesType) => void;
  splitActiveAndWanted: boolean;
  setSplitActiveAndWanted: (enabled: boolean) => void;
};

const ObjectSizeSetting = ({ size, setObjectSize }: ObjectSizeSettingProps): JSX.Element => {
  const [clickEventsDisabled, setClickEventsDisabled] = React.useState<boolean>(false);

  const handleSizeChange = (event: React.MouseEvent<HTMLElement>, newSize: SizesType | null) => {
    setClickEventsDisabled(true);
    if (newSize !== null && !clickEventsDisabled) {
      setObjectSize(newSize);
      setTimeout(() => {
        setClickEventsDisabled(false);
      }, 200);
    } else if (clickEventsDisabled) {
      console.warn(`Ghost second click event prevented from being executed, tried to change value to ${newSize}`);
    }
  };

  const HomeIcon = (props: SvgIconProps): JSX.Element => {
    return (
      <SvgIcon {...props}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </SvgIcon>
    );
  };

  return (
    <>
      <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
        <FormControlLabel
          labelPlacement="top"
          control={
            <ToggleButtonGroup
              id="pinDisplaySize"
              value={size}
              exclusive
              onChange={handleSizeChange}
              aria-label="text alignment"
            >
              <ToggleButton value="tiny" aria-label="Tiny">
                <HomeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="sm" aria-label="Small">
                <HomeIcon />
              </ToggleButton>
              <ToggleButton value="normal" aria-label="Normal">
                <HomeIcon fontSize="large" />
              </ToggleButton>
              <ToggleButton value="large" aria-label="Large">
                <HomeIcon sx={{ fontSize: 40 }} />
              </ToggleButton>
            </ToggleButtonGroup>
          }
          label="Pin display size"
        />
      </FormControl>
    </>
  );
};

type SplitActiveAndWantedSettingProps = {
  splitActiveAndWanted: boolean;
  setSplitActiveAndWanted: (enabled: boolean) => void;
};

const SplitActiveAndWantedSetting = ({
  splitActiveAndWanted,
  setSplitActiveAndWanted,
}: SplitActiveAndWantedSettingProps): JSX.Element => {
  return (
    <>
      <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
        <FormControlLabel
          labelPlacement="start"
          control={
            <Switch
              id="splitActiveAndWanted"
              checked={splitActiveAndWanted}
              onChange={() => setSplitActiveAndWanted(!splitActiveAndWanted)}
            />
          }
          label="Separate lanyard active and wanted pins"
        />

        <InputLabel id="splitActiveAndWanted"></InputLabel>
      </FormControl>
    </>
  );
};

export const AppSettingsPanel = ({
  size,
  setObjectSize,
  splitActiveAndWanted,
  setSplitActiveAndWanted,
}: AppSettingsPanelProps): JSX.Element => {
  return (
    <>
      <div className="settingFields">
        <div className="settingItem">
          <ObjectSizeSetting size={size} setObjectSize={setObjectSize} />
        </div>
        <div className="settingItem">
          <SplitActiveAndWantedSetting
            splitActiveAndWanted={splitActiveAndWanted}
            setSplitActiveAndWanted={setSplitActiveAndWanted}
          />
        </div>
      </div>
    </>
  );
};
