import { AppSettingsPanelProps } from '../components/AppSettingsPanel';
import { DrawerFragment } from '../components/DrawerFragment';
import { ReactElement } from 'react';

type AppSettingsDrawerFragmentProps = {
  appSettingsPanel: ReactElement<AppSettingsPanelProps>;
};

export const AppSettingsDrawerFragment = ({ appSettingsPanel } : AppSettingsDrawerFragmentProps):JSX.Element => {
  return (
    <DrawerFragment
      drawerId="settings"
      label="App settings"
    >
      <div>
        {appSettingsPanel}
      </div>
    </DrawerFragment>
  );
};
