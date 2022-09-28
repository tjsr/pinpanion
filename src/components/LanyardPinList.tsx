import { PAX, Pin, PinSet, SizesType } from '../types';

import { PinInfo } from './PinInfo';

type LanyardPinListPropTypes = {
  displaySize?: SizesType;
  heading: string;
  availablePins: Pin[];
  wantedPins: Pin[];
  paxs: PAX[];
  pinSets: PinSet[];
};


export const LanyardPinList = ({
  availablePins, displaySize = 'normal', heading, paxs, pinSets, wantedPins
}: LanyardPinListPropTypes): JSX.Element => {
  return (
    <>
      <h2>{heading}</h2>
      <div className="pinListContent">
        { availablePins.length > 0 &&
        <div className="availablePins">
          <h3>Available for trade</h3>
          {availablePins.map((pin: Pin) => {
            return (
              <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} />
            );
          })}
        </div>
        }
        { wantedPins.length > 0 &&
        <div className="wantedPins">
          <h3>Wanted</h3>
          {wantedPins.map((pin: Pin) => {
            return (
              <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} />
            );
          })}
        </div>
        }
      </div>
    </>
  );
};
