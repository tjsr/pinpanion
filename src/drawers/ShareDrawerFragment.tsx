import '../css/pins.css';

import React, { type ReactElement } from 'react';

import { DrawerFragment } from '../components/DrawerFragment.tsx';
import type { FilterQRCodeProps } from '../components/FilterQRCode.tsx';

type ShareDrawerFragmentProps = {
  qrCode: ReactElement<FilterQRCodeProps>;
};

export const ShareDrawerFragment = ({ qrCode }: ShareDrawerFragmentProps): JSX.Element => {
  return (
    <DrawerFragment drawerId="qr" label="Share">
      {qrCode}
    </DrawerFragment>
  );
};
