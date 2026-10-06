import '../css/pincolours.css';

import type { PAX, PAXEvent, Pin, PinCategory, PinGroup, PinSet, SizesType } from '../types.ts';

import { PinSash } from './PinSash.tsx';
import React from 'react';
import config from '../config.json';
import { getPinClassForSize } from '../utils.ts';

type PinInfoPropTypes = {
  categories: PinCategory[];
  displaySize: SizesType;
  pin: Pin;
  paxs: PAX[];
  events: PAXEvent[];
  pinSets: PinSet[];
  groups: PinGroup[];
  children?: React.ReactNode;
  htmlId?: string;
  imagePrefix?: string;
  style?: any;
};

export const PinInfo = ({
  categories,
  displaySize = 'normal',
  pin,
  paxs,
  events,
  pinSets,
  groups,
  children,
  htmlId,
  imagePrefix = config.imagePrefix,
  style,
}: PinInfoPropTypes): JSX.Element => {
  if (events === undefined || events.length === 0) {
    throw new Error(`PAXEvents list is required (${events === undefined ? 'undefined' : 'empty list'})`);
  }
  const url = pin.image_name ? `${imagePrefix}/${pin.image_name.split('?')[0]}` : undefined;

  const pinClasses = getPinClassForSize(displaySize);
  return (
    <>
      <div className={pinClasses} id={htmlId || `pin_${pin.id}`} style={style}>
        <div className="pinInfo">
          <h3>{pin.name}</h3>
          <PinSash pin={pin} sets={pinSets} groups={groups} events={events} paxs={paxs} categories={categories}/>
          { url && <img className="pinImage" alt={pin.name} src={url} />}
        </div>
        {children}
      </div>
    </>
  );
};

export const MemoizedPinInfo: React.NamedExoticComponent<PinInfoPropTypes> = React.memo<PinInfoPropTypes>(PinInfo);

