import '../css/pinSetInfo.css';

import { PAX, PAXId, Pin, PinSet, SizesType } from '../types';
import { PinInfo, getPaxCssClass } from './PinInfo';

import React from 'react';
import config from '../config.json';
import eventnames from '../eventnames.json';
import { getPinSetClassForSize } from '../utils';

type PinSetInfoPropTypes = {
  displaySize: SizesType;
  pinSet: PinSet;
  pinSetPins: Pin[];
  paxs?: PAX[];
  pinSets?: PinSet[];
  children?: React.ReactNode;
  style?: any;
};

export const PinSetInfo = ({
  displaySize = 'normal',
  pinSet,
  pinSetPins,
  paxs,
  pinSets,
  children,
  style,
}: PinSetInfoPropTypes): JSX.Element => {
  const setClasses = getPinSetClassForSize(displaySize);
  const chunkedPinSets:Pin[][] = [];
  const rowSize = pinSetPins.length == 4 ? 2 : 3;
  for (let i = 0;i < pinSetPins.length;i += rowSize) {
    chunkedPinSets.push(pinSetPins.slice(i, i + rowSize));
  }

  // let pinClasses = getPinSetClassForSize(displaySize);
  let paxCssClass = 'pax';
  // let setCssClass = 'set';

  const getPaxIdFromPinsInSet = (pinsInSet: Pin[]): PAXId => {
    return pinsInSet[0].pax_id;
  };

  const paxId = getPaxIdFromPinsInSet(pinSetPins) || 0;

  if (paxId > 0) {
    // pinClasses = pinClasses + ' ' + getPaxCssClass('pin', paxId);
    paxCssClass = paxCssClass + ' ' + getPaxCssClass('pax', paxId);
    // setCssClass = setCssClass + ' ' + getPaxCssClass('pax', paxId);
  }

  return <><div className={setClasses}>
    <h3>{pinSet.name}</h3>
    <div className={paxCssClass}>{eventnames[paxId].description} {pinSet.year}</div>

    <div className='setpins'>
      {chunkedPinSets.map((rowinSetPins: Pin[], index: number) => {
        return (
          <div key={`set_${pinSet.id}_row${index}`} className={`pinRow-${rowSize}`}>
            {rowinSetPins.map(
              (pin: Pin) => {
                const url = `${config.imagePrefix}/${pin.image_name.split('?')[0]}`;
                return (
                  <img key={`set_${pinSet.id}_pin_${pin.id}`} className="pinImage" alt={pin.name} src={url} />
                );
              }
              // <PinInfo displaySize={'tiny'} pin={pin} />
            )}
          </div>);
      })}
    </div>
    {children}
  </div>
  </>;
};

export const MemoizedPinSetInfo: React.NamedExoticComponent<PinSetInfoPropTypes> =
  React.memo<PinSetInfoPropTypes>(PinSetInfo);
