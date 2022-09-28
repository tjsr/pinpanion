import { PAX, Pin, PinSet, SizesType } from '../types';

import React from 'react';
import eventnames from '../eventnames.json';
import { getPinClassForSize } from '../utils';

const PIN_IMG_PREFIX = 'https://pinnypals.com/imgs';

type PinInfoPropTypes = {
  displaySize: SizesType;
  pin: Pin;
  paxs?: PAX[];
  pinSets?: PinSet[];
  children?: React.ReactNode;
};

export const PinInfo = ({
  displaySize = 'normal',
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

  const pinClasses = getPinClassForSize(displaySize);

  return (
    <>
      <div className={pinClasses} id={`pin_${pin.id}`}>
        <div className="pinInfo">
          <h3>{pin.name}</h3>
          {pinPax?.name ? (
            <div className="pax">{eventnames[pinPax.id!].description}</div>
          ) : (
            <></>
          )}
          {pinSet?.name ? <div className="set">{pinSet?.name}</div> : <></>}
          <img className="pinImage" alt={pin.name} src={url} />
        </div>
        {children}
      </div>
    </>
  );
};
