import type { AppSettingsPanelProps } from '../components/AppSettingsPanel.tsx';
import { DrawerFragment } from '../components/DrawerFragment.tsx';
import type { ReactElement } from 'react';

type AppSettingsDrawerFragmentProps = {
  appSettingsPanel: ReactElement<AppSettingsPanelProps>;
};

export const AppSettingsDrawerFragment = ({
  appSettingsPanel,
}: AppSettingsDrawerFragmentProps): JSX.Element => {
  return (
    <DrawerFragment drawerId="settings" label="Settings">
      {appSettingsPanel}
    </DrawerFragment>
  );
};
