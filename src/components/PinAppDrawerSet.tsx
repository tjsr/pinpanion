import '../css/App.css';

import type { PinListFilter, PinSelectionList } from '../types.ts';
import React, { type ReactElement } from 'react';

import { AppSettingsDrawerFragment } from '../drawers/AppSettingsDrawFragment.tsx';
import { type AppSettingsPanelProps } from './AppSettingsPanel.tsx';
import { FeedbackDrawerFragment } from '../drawers/FeedbackDrawerFragment.tsx';
import { type FilterQRCodeProps } from './FilterQRCode.tsx';
import { PinFilterDrawerFragment } from '../drawers/PinFilterDrawerFragment.tsx';
import { type PinListFilterDisplayProps } from './PinSearchFilter.tsx';
import { PinSelectionDrawerFragment } from '../drawers/PinSelectionDrawerFragment.tsx';
import { type PinSelectionFilterProps } from './PinSelectionFilter.tsx';
import { ShareDrawerFragment } from '../drawers/ShareDrawerFragment.tsx';

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
      <div className="drawers">
        <PinSelectionDrawerFragment
          isSelectionActive={isSelectionActive}
          pinSelection={pinSelection}
          pinSelectionFilter={pinSelectionFilter}
        />

        <PinFilterDrawerFragment filter={filter} pinListFilterDisplay={pinListFilterDisplay} />

        <ShareDrawerFragment qrCode={qrCode} />

        <AppSettingsDrawerFragment appSettingsPanel={appSettingsPanel} />
        <FeedbackDrawerFragment />
      </div>
    </>
  );
};
