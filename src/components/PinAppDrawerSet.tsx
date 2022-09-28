import { PinListFilter, PinSelectionList } from '../types';
import React, { ReactElement } from 'react';

import { AppSettingsDrawerFragment } from '../drawers/AppSettingsDrawFragment';
import { AppSettingsPanelProps } from './AppSettingsPanel';
import { FilterQRCodeProps } from './FilterQRCode';
import { PinFilterDrawerFragment } from '../drawers/PinFilterDrawerFragment';
import { PinListFilterDisplayProps } from './PinSearchFilter';
import { PinSelectionDrawerFragment } from '../drawers/PinSelectionDrawerFragment';
import { PinSelectionFilterProps } from './PinSelectionFilter';
import { QRCodeDrawerFragment } from '../drawers/QRCodeDrawerFragment';

type PinAppDrawerSetProps = {
  appSettingsPanel: ReactElement<AppSettingsPanelProps>;
  filter: PinListFilter;
  isSelectionActive: boolean;
  pinSelection: PinSelectionList;
  pinListFilterDisplay: ReactElement<PinListFilterDisplayProps>;
  qrCode: ReactElement<FilterQRCodeProps>;
  pinSelectionFilter: ReactElement<PinSelectionFilterProps>;
};

export const PinAppDrawerSet = ({
  appSettingsPanel,
  filter,
  isSelectionActive,
  pinListFilterDisplay,
  qrCode,
  pinSelectionFilter,
  pinSelection,
}: PinAppDrawerSetProps): JSX.Element => {
  return (
    <>
      <PinSelectionDrawerFragment
        isSelectionActive={isSelectionActive}
        pinSelection={pinSelection}
        pinSelectionFilter={pinSelectionFilter}
      />

      <PinFilterDrawerFragment
        filter={filter}
        pinListFilterDisplay={pinListFilterDisplay}
      />

      <QRCodeDrawerFragment qrCode={qrCode} />

      <AppSettingsDrawerFragment appSettingsPanel={appSettingsPanel} />
    </>
  );
};
