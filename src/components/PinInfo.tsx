import '../css/pincolours.css';

import { PAX, PAXEvent, Pin, PinGroup, PinSet, SizesType } from '../types.js';

import { PinSash } from './PinSash.js';
import React from 'react';
import config from '../config.json';
import { getCssNameForEventId } from '../css/cssClasses.js';
import { getPinClassForSize } from '../utils.js';

type PinInfoPropTypes = {
  displaySize: SizesType;
  pin: Pin;
  paxs: PAX[];
  events: PAXEvent[];
  pinSets: PinSet[];
  groups: PinGroup[];
  children?: React.ReactNode;
  style?: any;
};

export const PinInfo = ({
  displaySize = 'normal',
  pin,
  paxs,
  events,
  pinSets,
  groups,
  children,
  style,
}: PinInfoPropTypes): JSX.Element => {
  if (events === undefined || events.length === 0) {
    throw new Error(`PAXEvents list is required (${events === undefined ? 'undefined' : 'empty list'})`);
  }
  const url = pin.image_name ? `${config.imagePrefix}/${pin.image_name.split('?')[0]}` : undefined;

  const pinClasses = getPinClassForSize(displaySize);
  return (
    <>
      <div className={pinClasses} id={`pin_${pin.id}`} style={style}>
        <div className="pinInfo">
          <h3>{pin.name}</h3>
          <PinSash pin={pin} sets={pinSets} groups={groups} events={events} paxs={paxs} />
          { url && <img className="pinImage" alt={pin.name} src={url} />}
        </div>
        {children}
      </div>
    </>
  );
};

export const MemoizedPinInfo: React.NamedExoticComponent<PinInfoPropTypes> = React.memo<PinInfoPropTypes>(PinInfo);

