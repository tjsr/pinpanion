import '../css/pins.css';

import { PAX, Pin, PinListFilter, PinSelectionList, PinSet, SizesType } from '../types';

import { FilterQRCode } from './FilterQRCode';
import { MemoizedPinListButtons } from './PinButtons';
import { PinInfo } from './PinInfo';
import { newSelectionList } from '../fixture';
import { removeOrAddId } from '../listutils';

interface PinListPropTypes {
  activePinSet?: PinSelectionList;
  displaySize?: SizesType;
  filter?: PinListFilter;
  heading: string;
  isPinFiltered: (pin: Pin, filter?: PinListFilter) => boolean;
  paxs?: PAX[];
  pins: Pin[];
  pinSets?: PinSet[];
  setPinSet?: (list: PinSelectionList) => void;
}

export const PinList = (props: PinListPropTypes): JSX.Element => {
  const {
    displaySize = 'normal',
    heading,
    pins,
    paxs,
    pinSets,
    filter,
    activePinSet,
    isPinFiltered,
    setPinSet,
  } = props;
  const displayedPins: Pin[] = pins.filter((pin: Pin) => !isPinFiltered(pin, filter));

  const togglePinAvailable = (pinId: number): void => {
    console.log(`Toggling pin ${pinId} available`);
    const availableIds: number[] = removeOrAddId(activePinSet?.availableIds, pinId);
    if (setPinSet) {
      const base: PinSelectionList = activePinSet || newSelectionList();
      setPinSet({
        ...base,
        availableIds,
        revision: ++base.revision,
      });
    }
  };

  const togglePinWanted = (pinId: number): void => {
    console.log(`Toggling pin ${pinId} wanted`);
    const wantedIds: number[] = removeOrAddId(activePinSet?.wantedIds, pinId);
    if (setPinSet) {
      const base: PinSelectionList = activePinSet || newSelectionList();
      setPinSet({
        ...base,
        revision: ++base.revision,
        wantedIds,
      });
    }
  };

  const countPinAvailable = (pinId: number): number => {
    if (activePinSet) {
      return activePinSet?.availableIds.filter((n) => +n === +pinId).length;
    }
    return 0;
  };

  const countPinWanted = (pinId: number): number => {
    if (activePinSet) {
      return activePinSet?.wantedIds.filter((n) => +n === +pinId).length;
    }
    return 0;
  };

  console.log('Re-rendering list');

  return (
    <>
      <h2>{heading}</h2>
      {activePinSet && (
        <div className="printqr">
          <FilterQRCode lanyard={activePinSet} />
        </div>
      )}
      {pins && displayedPins && (
        <>
          <div className="totalPins">Total pins: {displayedPins.length}</div>
          {activePinSet?.editable && (
            <div className="buttonKey">
              Click <button className="pinNotAvailable">A</button> to toggle from 'Available' list, or{' '}
              <button className="pinNotWanted">W</button> to add to 'Wanted' list.
            </div>
          )}
          <div className="pinListContent">
            {displayedPins.map((pin: Pin) => {
              return (
                <PinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin}>
                  {activePinSet?.editable && (
                    <MemoizedPinListButtons
                      availableCount={countPinAvailable(pin.id)}
                      wantedCount={countPinWanted(pin.id)}
                      pinId={pin.id}
                      setPinAvailable={togglePinAvailable}
                      setPinWanted={togglePinWanted}
                    />
                  )}
                </PinInfo>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};
