import '../css/pinSetInfo.css';

import { PAX, Pin, PinSet, SizesType } from '../types';

import { PinInfo } from './PinInfo';
import React from 'react';
import config from '../config.json';
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
  return <><div className={setClasses}><h3>{pinSet.name}</h3>
    {pinSetPins.map(
      (pin: Pin) => {
        const url = `${config.imagePrefix}/${pin.image_name.split('?')[0]}`;
        return (<div key={`set_${pinSet.id}_pin_${pin.id}`} className='setpin'>
          <img className="pinImage" alt={pin.name} src={url} />
        </div>);
      }
      // <PinInfo displaySize={'tiny'} pin={pin} />
    )}
    {children}
  </div>
  </>;
};

export const MemoizedPinSetInfo: React.NamedExoticComponent<PinSetInfoPropTypes> =
  React.memo<PinSetInfoPropTypes>(PinSetInfo);
