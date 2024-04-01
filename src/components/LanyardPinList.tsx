/* eslint-disable operator-linebreak */

import { PAX, Pin, PinSet, SizesType } from '../types';

import { PinInfo } from './PinInfo';
import { PinSetInfo } from './PinSetInfo';

type LanyardPinListPropTypes = {
  allPins: Pin[];
  descendingAge: boolean;
  displaySize?: SizesType;
  heading: string;
  availablePins: Pin[];
  wantedPins: Pin[];
  availableSets: PinSet[];
  wantedSets: PinSet[];
  paxs: PAX[];
  pinSets: PinSet[];
  showInSets: boolean;
  setShowInSets: (showInSets: boolean) => void;
};

export const LanyardPinList = ({
  allPins,
  availablePins,
  availableSets,
  descendingAge,
  displaySize = 'normal',
  heading,
  paxs,
  pinSets,
  wantedPins,
  wantedSets,
  showInSets,
  setShowInSets,
}: LanyardPinListPropTypes): JSX.Element => {
  const displayedAvailable: Pin[] = descendingAge
    ? availablePins.sort((a: Pin, b: Pin) => b.id - a.id)
    : availablePins.sort((a: Pin, b: Pin) => a.id - b.id);
  const displayedWanted: Pin[] = descendingAge
    ? wantedPins.sort((a: Pin, b: Pin) => b.id - a.id)
    : wantedPins.sort((a: Pin, b: Pin) => a.id - b.id);
  const displayedAvailableSets: PinSet[] = descendingAge
    ? availableSets.sort((a: PinSet, b: PinSet) => b.id - a.id)
    : availableSets.sort((a: PinSet, b: PinSet) => a.id - b.id);
  const displayedWantedSets: PinSet[] = descendingAge
    ? wantedSets.sort((a: PinSet, b: PinSet) => b.id - a.id)
    : wantedSets.sort((a: PinSet, b: PinSet) => a.id - b.id);
  return (
    <>
      <h2>{heading}</h2>
      <div className="pinListContent">
        {(displayedAvailable.length > 0 || displayedAvailableSets.length > 0) && (
          <>
            <h3>Available for trade</h3>
            { displayedAvailableSets.length > 0 && (
              <div className="availableSets">
                {displayedAvailableSets.map((pinSet: PinSet) => {
                  const pinsInSet = allPins.filter((pin: Pin) => pin.set_id === pinSet.id);
                  return <PinSetInfo
                    displaySize={displaySize} key={pinSet.id} paxs={paxs}
                    pinSets={pinSets} pinSet={pinSet} pinSetPins={pinsInSet} />;
                })}
              </div>
            )}
            {displayedAvailable.length > 0 && (
              <div className="availablePins">
                {displayedAvailable.map((pin: Pin) => {
                  return <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} />;
                })}
              </div>
            )}
          </>
        )}
        {(displayedWanted.length > 0 || displayedWantedSets.length > 0) && (
          <>
            <h3>Wanted</h3>
            <div className="wantedSets">
              {displayedWantedSets.length > 0 && (
                displayedWantedSets.map((pinSet: PinSet) => {
                  const pinsInSet = allPins.filter((pin: Pin) => pin.set_id === pinSet.id);
                  return <PinSetInfo
                    displaySize={displaySize} key={pinSet.id}
                    paxs={paxs} pinSets={pinSets} pinSet={pinSet} pinSetPins={pinsInSet} />;
                })
              )}
            </div>
            <div className="wantedPins">
              {displayedWanted.length > 0 && (
                displayedWanted.map((pin: Pin) => {
                  return <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} />;
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
