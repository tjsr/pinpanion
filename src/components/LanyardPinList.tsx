/* eslint-disable operator-linebreak */

import { PAX, PAXEvent, Pin, PinCategory, PinGroup, PinSet, SizesType, YearAndIdComparable } from '../types.js';

import { PinInfo } from './PinInfo.js';
import { PinSetInfo } from './PinSetInfo.js';
import { compareYearThenId } from '../listutils.js';

type LanyardPinListPropTypes = {
  allPins: Pin[];
  categories: PinCategory[];
  descendingAge: boolean;
  displaySize?: SizesType;
  heading: string;
  availablePins: Pin[];
  wantedPins: Pin[];
  availableSets: PinSet[];
  wantedSets: PinSet[];
  paxs: PAX[];
  events: PAXEvent[];
  pinSets: PinSet[];
  groups: PinGroup[];
  showInSets: boolean;
  setShowInSets: (showInSets: boolean) => void;
};

export const LanyardPinList = ({
  allPins,
  categories,
  availablePins,
  availableSets,
  descendingAge,
  displaySize = 'normal',
  heading,
  paxs,
  pinSets,
  events,
  groups,
  wantedPins,
  wantedSets,
}: LanyardPinListPropTypes): JSX.Element => {
  const displayedAvailable: Pin[] = availablePins.sort(
    (a: YearAndIdComparable, b: YearAndIdComparable) => compareYearThenId(a, b, descendingAge));
  const displayedWanted: Pin[] = wantedPins.sort(
    (a: YearAndIdComparable, b: YearAndIdComparable) => compareYearThenId(a, b, descendingAge));
  const displayedAvailableSets: PinSet[] = availableSets.sort(
    (a: YearAndIdComparable, b: YearAndIdComparable) => compareYearThenId(a, b, descendingAge));
  const displayedWantedSets: PinSet[] = wantedSets.sort(
    (a: YearAndIdComparable, b: YearAndIdComparable) => compareYearThenId(a, b, descendingAge));

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
                  const pinsInSet = allPins.filter((pin: Pin) => pin.setId === pinSet.id);
                  return <PinSetInfo
                    displaySize={displaySize} key={pinSet.id} paxs={paxs}
                    pinSets={pinSets} pinSet={pinSet} pinSetPins={pinsInSet} />;
                })}
              </div>
            )}
            {displayedAvailable.length > 0 && (
              <div className="availablePins">
                {displayedAvailable.map((pin: Pin) => {
                  return <PinInfo
                    categories={categories}
                    displaySize={displaySize}
                    key={pin.id}
                    paxs={paxs}
                    pinSets={pinSets}
                    pin={pin}
                    groups={groups}
                    events={events}
                  />;
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
                  const pinsInSet = allPins.filter((pin: Pin) => pin.setId === pinSet.id);
                  return <PinSetInfo
                    displaySize={displaySize} key={pinSet.id}
                    paxs={paxs} pinSets={pinSets} pinSet={pinSet} pinSetPins={pinsInSet} />;
                })
              )}
            </div>
            <div className="wantedPins">
              {displayedWanted.length > 0 && (
                displayedWanted.map((pin: Pin) => {
                  return <PinInfo
                    categories={categories}
                    displaySize={displaySize}
                    key={pin.id}
                    paxs={paxs}
                    pinSets={pinSets}
                    pin={pin}
                    groups={groups}
                    events={events} />;
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
