import { PAX, Pin, PinSet } from '../types';

import React from 'react';

const PIN_IMG_PREFIX = 'https://pinnypals.com/imgs';

type PinInfoPropTypes = {
  pin: Pin;
  paxs?: PAX[];
  pinSets?: PinSet[];
  togglePinInSet: (id: number) => boolean;
  isSelected: boolean;
  children: React.ReactNode;
};

export const PinInfo = ({
  pin,
  paxs,
  pinSets,
  children,
}: PinInfoPropTypes): JSX.Element => {
  const url = `${PIN_IMG_PREFIX}/${pin.image_name}`;
  const pinPax: PAX | undefined = paxs?.find(
    (pax: PAX) => pax.id == pin.pax_id
  );
  const pinSet: PinSet | undefined = pinSets?.find((set: PinSet) => {
    return set?.id == pin.set_id || set?.id == pin.sub_set_id;
  });

  return (
    <>
      <div className="pin" id={`pin_${pin.id}`}>
        <div className="pinInfo">
          <h3>{pin.name}</h3>
          {pinPax?.name ? <div className="pax">{pinPax?.name}</div> : <></>}
          {pinSet?.name ? <div className="set">{pinSet?.name}</div> : <></>}
          <img className="pinImage" alt={pin.name} src={url} />
        </div>
        {children}
      </div>
    </>
  );
};
