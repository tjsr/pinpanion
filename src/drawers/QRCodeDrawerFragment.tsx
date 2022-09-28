import '../css/pins.css';

import React, { ReactElement } from 'react';

import { DrawerFragment } from '../components/DrawerFragment';
import { FilterQRCodeProps } from '../components/FilterQRCode';

type QRCodeDrawerFragmentProps = {
  qrCode: ReactElement<FilterQRCodeProps>;
};

export const QRCodeDrawerFragment = ({
  qrCode,
}: QRCodeDrawerFragmentProps): JSX.Element => {
  return (
    <DrawerFragment drawerId="qr" label="QR code">
      {qrCode}
    </DrawerFragment>
  );
};
