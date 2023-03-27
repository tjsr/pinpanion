import '../css/pins.css';

import React, { ReactElement } from 'react';

import { DrawerFragment } from '../components/DrawerFragment';
import { FilterQRCodeProps } from '../components/FilterQRCode';

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
