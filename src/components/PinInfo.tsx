import '../css/pincolours.css';

import { PAX, Pin, PinGroup, PinSet, SizesType } from '../types.js';

import { PinSash } from './PinSash.js';
import React from 'react';
import config from '../config.json';
import eventnames from '../eventnames.json';
import { getPinClassForSize } from '../utils';

type PinInfoPropTypes = {
  displaySize: SizesType;
  pin: Pin;
  paxs: PAX[];
  pinSets: PinSet[];
  groups: PinGroup[];
  children?: React.ReactNode;
  style?: any;
};

export const getPaxCssClass = (prefix: string, paxId: number): string|undefined => {
  if (!categories[categoryId]) {

  }
  if (!eventnames[paxId]) {
    console.warn(`No event name known for PAX with Id ${paxId}`);
    return undefined;
  }
  return prefix + eventnames[paxId].cssClass;
};

const toProperCase = (str: string): string =>
  str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

export const getGroupCssClass = (group: PinGroup): string => toProperCase(group.type || 'OTHER');

export const PinInfo = ({
  displaySize = 'normal',
  pin,
  paxs,
  pinSets,
  groups,
  children,
  style,
}: PinInfoPropTypes): JSX.Element => {
  const url = pin.image_name ? `${config.imagePrefix}/${pin.image_name.split('?')[0]}` : undefined;
  // const pinPax: PAX | undefined = paxs?.find((pax: PAX) => pax.id == pin.pax_id);

  let pinClasses = getPinClassForSize(displaySize);

  if (pinPax) {
    pinClasses = pinClasses + ' ' + getPaxCssClass('pin', pinPax.id) || '';
  }

  return (
    <>
      <div className={pinClasses} id={`pin_${pin.id}`} style={style}>
        <div className="pinInfo">
          <h3>{pin.name}</h3>
          <PinSash pin={pin} sets={pinSets} groups={groups} />
          { url && <img className="pinImage" alt={pin.name} src={url} />}
        </div>
        {children}
      </div>
    </>
  );
};

export const MemoizedPinInfo: React.NamedExoticComponent<PinInfoPropTypes> = React.memo<PinInfoPropTypes>(PinInfo);

