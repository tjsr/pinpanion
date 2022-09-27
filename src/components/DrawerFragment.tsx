import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import React from 'react';
import { VariantType } from '../types';

type DrawerFragmentPropTypes = {
  active?: boolean;
  drawerId: string;
  label: string;
  children: React.ReactNode;
};

export const DrawerFragment = ({
  active = false,
  drawerId,
  label,
  children,
}: DrawerFragmentPropTypes): JSX.Element => {
  const [drawerState, setDrawerState] = React.useState<boolean>(false);

  const toggleDrawer =
    (display: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      {
        if (
          event.type === 'keydown' &&
          ((event as React.KeyboardEvent).key === 'Tab' ||
            (event as React.KeyboardEvent).key === 'Shift')
        ) {
          return;
        }

        setDrawerState(display);
      }
    };

  const variant: VariantType = active ? 'contained' : 'text';

  return (
    <React.Fragment key={drawerId}>
      <Button
        className="drawerButton"
        variant={variant}
        onClick={toggleDrawer(true)}
      >
        {label}
      </Button>
      <Drawer
        anchor={'top'}
        open={drawerState}
        onClose={toggleDrawer(false)}
        ModalProps={{
          keepMounted: true,
        }}
      >
        <div className="drawer">
          <div className="drawerContent">{children}</div>
        </div>
      </Drawer>
    </React.Fragment>
  );
};
