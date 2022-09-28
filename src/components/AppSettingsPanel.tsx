import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

import InputLabel from '@mui/material/InputLabel';
import { SizesType } from '../types';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

type ObjectSizeSettingProps = {
  size: SizesType;
  setObjectSize: (size: SizesType) => void;
};

export type AppSettingsPanelProps = {
  size: SizesType;
  setObjectSize: (size: SizesType) => void;
};

const ObjectSizeSetting = ({ size, setObjectSize } : ObjectSizeSettingProps ): JSX.Element => {
  const handleSizeChange = (
    event: React.MouseEvent<HTMLElement>,
    newSize: SizesType | null,
  ) => {
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
      <InputLabel id="pinDisplaySize">Pin display size</InputLabel>
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
    </>
  );
};

export const AppSettingsPanel = ({ size, setObjectSize } : AppSettingsPanelProps):JSX.Element => {
  return (<>
    <div>
      <ObjectSizeSetting size={size} setObjectSize={setObjectSize} />
    </div></>);
};
