import '../css/settings.css';

import { SEARCH_CONTROL_WIDTH, TEXT_INPUT_WIDTH } from '../globals';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

import { ApplicationSettings } from '../settingsStorage';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import React from 'react';
import { SizesType } from '../types';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

type ObjectSizeSettingProps = {
  size: SizesType;
  setObjectSize: (size: SizesType) => void;
};

export type AppSettingsPanelProps = {
  settings: ApplicationSettings;
  updateSettings: (settings: ApplicationSettings) => void;
};

const ObjectSizeSetting = ({ size, setObjectSize }: ObjectSizeSettingProps): JSX.Element => {
  const handleSizeChange = (event: React.MouseEvent<HTMLElement>, newSize: SizesType | null) => {
    if (newSize !== null) {
      setObjectSize(newSize);
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
      <div className="pinDisplaySizeSelect">
        <Typography>Pin display size</Typography>
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
      </div>
    </>
  );
};

type SplitActiveAndWantedSettingProps = {
  splitActiveAndWanted: boolean;
  setSplitActiveAndWanted: (enabled: boolean) => void;
};

type NewestFirstSettingProps = {
  descendingAge: boolean;
  setDescendingAge: (enabled: boolean) => void;
};

type DisplayNameSettingProps = {
  displayName: string|undefined;
  setUserDisplayName: (name: string) => void;
}

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

const NewestFirstSetting = ({ descendingAge, setDescendingAge }: NewestFirstSettingProps): JSX.Element => {
  return (
    <>
      <FormControl sx={{ m: 1, minWidth: SEARCH_CONTROL_WIDTH }}>
        <FormControlLabel
          labelPlacement="start"
          control={<Switch id="oldestLast" checked={descendingAge} onChange={() => setDescendingAge(!descendingAge)} />}
          label="Display Oldest pins last"
        />

        <InputLabel id="oldestLast"></InputLabel>
      </FormControl>
    </>
  );
};

const DisplayNameSetting = ({ displayName, setUserDisplayName }: DisplayNameSettingProps): JSX.Element => {
  return (
    <>
      <FormControl sx={{ m: 1, minWidth: TEXT_INPUT_WIDTH }}>
        <TextField
          className="textField"
          id="displayName"
          label="Display Name"
          variant="outlined"
          value={displayName || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setUserDisplayName(event.target.value);
            return true;
          }}
        />
      </FormControl>
    </>
  );
};

export const AppSettingsPanel = ({ settings, updateSettings }: AppSettingsPanelProps): JSX.Element => {
  return (
    <>
      <div className="settingFields">
        <div className="settingItem">
          <ObjectSizeSetting
            size={settings.displaySize}
            setObjectSize={(displaySize) => updateSettings({ ...settings, displaySize })}
          />
        </div>
        <div className="settingItem">
          <SplitActiveAndWantedSetting
            splitActiveAndWanted={settings.splitActiveAndWanted}
            setSplitActiveAndWanted={(splitActiveAndWanted) => updateSettings({ ...settings, splitActiveAndWanted })}
          />
        </div>
        <div className="settingItem">
          <NewestFirstSetting
            descendingAge={settings.descendingAge}
            setDescendingAge={(descendingAge) => updateSettings({ ...settings, descendingAge })}
          />
        </div>
        <div className="settingItem">
          <DisplayNameSetting
            displayName={settings.userDisplayName}
            setUserDisplayName={(userDisplayName) => updateSettings({ ...settings, userDisplayName })} />
        </div>
      </div>
    </>
  );
};
