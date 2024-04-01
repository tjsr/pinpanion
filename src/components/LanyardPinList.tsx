/* eslint-disable operator-linebreak */

import { PAX, Pin, PinSet, SizesType } from '../types';

import { PinInfo } from './PinInfo';

type LanyardPinListPropTypes = {
  descendingAge: boolean;
  displaySize?: SizesType;
  heading: string;
  availablePins: Pin[];
  wantedPins: Pin[];
  paxs: PAX[];
  pinSets: PinSet[];
  showInSets: boolean;
  setShowInSets: (showInSets: boolean) => void;
};

export const LanyardPinList = ({
  availablePins,
  descendingAge,
  displaySize = 'normal',
  heading,
  paxs,
  pinSets,
  wantedPins,
  showInSets,
  setShowInSets,
}: LanyardPinListPropTypes): JSX.Element => {
  const displayedAvailable: Pin[] = descendingAge
    ? availablePins.sort((a: Pin, b: Pin) => b.id - a.id)
    : availablePins.sort((a: Pin, b: Pin) => a.id - b.id);
  const displayedWanted: Pin[] = descendingAge
    ? wantedPins.sort((a: Pin, b: Pin) => b.id - a.id)
    : wantedPins.sort((a: Pin, b: Pin) => a.id - b.id);
  return (
    <>
      <h2>{heading}</h2>
      <div className="pinListContent">
        {displayedAvailable.length > 0 && (
          <div className="availablePins">
            <h3>Available for trade</h3>
            {displayedAvailable.map((pin: Pin) => {
              return <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} />;
            })}
          </div>
        )}
        {displayedWanted.length > 0 && (
          <div className="wantedPins">
            <h3>Wanted</h3>
            {displayedWanted.map((pin: Pin) => {
              return <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} />;
            })}
          </div>
        )}
      </div>
    </>
  );
};
