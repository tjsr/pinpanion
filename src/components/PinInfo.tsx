import '../css/pincolours.css';

import { PAX, Pin, PinSet, SizesType } from '../types';

import React from 'react';
import config from '../config.json';
import eventnames from '../eventnames.json';
import { getPinClassForSize } from '../utils';

type PinInfoPropTypes = {
  displaySize: SizesType;
  pin: Pin;
  paxs?: PAX[];
  pinSets?: PinSet[];
  children?: React.ReactNode;
  style?: any;
};

export const getPaxCssClass = (prefix: string, paxId: number): string => {
  return prefix + eventnames[paxId].cssClass;
};

export const PinInfo = ({
  displaySize = 'normal',
  pin,
  paxs,
  pinSets,
  children,
  style,
}: PinInfoPropTypes): JSX.Element => {
  const url = `${config.imagePrefix}/${pin.image_name.split('?')[0]}`;
  const pinPax: PAX | undefined = paxs?.find((pax: PAX) => pax.id == pin.pax_id);
  const pinSet: PinSet | undefined = pinSets?.find((set: PinSet) => {
    return set?.id == pin.set_id || set?.id == pin.sub_set_id;
  });

  let pinClasses = getPinClassForSize(displaySize);
  let paxCssClass = 'pax';
  let setCssClass = 'set';

  if (pinPax) {
    pinClasses = pinClasses + ' ' + getPaxCssClass('pin', pinPax.id!);
    paxCssClass = paxCssClass + ' ' + getPaxCssClass('pax', pinPax.id!);
    setCssClass = setCssClass + ' ' + getPaxCssClass('pax', pinPax.id!);
  }

  return (
    <>
      <div className={pinClasses} id={`pin_${pin.id}`} style={style}>
        <div className="pinInfo">
          <h3>{pin.name}</h3>
          {pinSet?.name ? (
            <div className={setCssClass}>{pinSet?.name}</div>
          ) : pinPax ? (
            <div className={paxCssClass}>{eventnames[pinPax.id!].description} {pin.year}</div>
          ) : (
            <></>
          )}
          <img className="pinImage" alt={pin.name} src={url} />
        </div>
        {children}
      </div>
    </>
  );
};

export const MemoizedPinInfo: React.NamedExoticComponent<PinInfoPropTypes> = React.memo<PinInfoPropTypes>(PinInfo);

