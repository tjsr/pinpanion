import React, { ReactElement } from 'react';

import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import { FilterQRCodeProps } from '../components/FilterQRCode';

type QRCodeDrawerFragmentProps = {
  toggleDrawer: (
    id: string,
    visible: boolean
  ) => (event: React.KeyboardEvent | React.MouseEvent) => void;
  qrCode: ReactElement<FilterQRCodeProps>;
  filterQrState: boolean;
};

export const QRCodeDrawerFragment = ({
  filterQrState,
  toggleDrawer,
  qrCode,
}: QRCodeDrawerFragmentProps): JSX.Element => {
  return (
    <React.Fragment key={'qr'}>
      <Button className="drawerButton" onClick={toggleDrawer('qr', true)}>
        QR
      </Button>
      <Drawer
        anchor={'top'}
        open={filterQrState}
        onClose={toggleDrawer('qr', false)}
      >
        {qrCode}
      </Drawer>
    </React.Fragment>
  );
};
