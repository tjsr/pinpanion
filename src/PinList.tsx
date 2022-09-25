import './pins.css';

import { PAX, Pin, PinListFilter, PinSet } from './types';
import { addIdToList, removeIdFromList } from './listutils';
import { isPinFiltered, isPinSelected } from './PinFilter';

import { PinInfo } from './PinInfo';
import React from 'react';

interface PinListPropTypes {
  pins: Pin[];
  paxs?: PAX[];
  pinSets?: PinSet[];
  filter?: PinListFilter;
  setFilter: (filter: PinListFilter) => void;
}

type PinListButtonsProps = {
  isSelected: boolean;
  pinId: number;
  addPin: (pinId: number) => void;
  removePin: (pinId: number) => void;
  togglePinInSet: (pinId: number) => boolean;
};

const PinListButtons = ({
  isSelected,
  pinId,
  addPin,
  removePin,
}: PinListButtonsProps): JSX.Element => {
  return (
    <div className="listButtons">
      <button
        className="addButton"
        disabled={isSelected}
        id={`add_${pinId}`}
        value={pinId}
        onClick={() => {
          addPin(pinId);
        }}
      >
        +
      </button>
      <button
        className="removeButton"
        disabled={!isSelected}
        id={`remove_${pinId}`}
        value={pinId}
        onClick={() => {
          removePin(pinId);
        }}
      >
        -
      </button>
    </div>
  );
};

export const PinList = ({
  pins,
  paxs,
  pinSets,
  filter,
  setFilter,
}: PinListPropTypes): JSX.Element => {
  const displayedPins: Pin[] = pins.filter(
    (pin: Pin) => !isPinFiltered(pin, filter)
  );

  const addToFilter = (id: number): void => {
    const selectedPinsList: string = addIdToList(
      filter?.selectedPinsList || '',
      id
    );
    console.log('Updated list: ' + selectedPinsList);
    const updatedFilter: PinListFilter = {
      ...filter,
      selectedPinsList,
    };
    setFilter(updatedFilter);
  };

  const removeFromFilter = (id: number): void => {
    const selectedPinsList: string = removeIdFromList(
      filter?.selectedPinsList || '',
      id
    );
    console.log('Updated list: ' + selectedPinsList);
    const updatedFilter: PinListFilter = {
      ...filter,
      selectedPinsList,
    };
    setFilter(updatedFilter);
  };

  const togglePinInSet = (pinId: number): boolean => {
    if (isPinSelected(filter, pinId)) {
      removeFromFilter(pinId);
      return false;
    } else {
      addToFilter(pinId);
      return true;
    }
  };

  return (
    <>
      <h2>Pin list</h2>
      {pins && displayedPins && (
        <>
          <div>Total pins: {displayedPins.length}</div>
          {displayedPins.map((pin: Pin) => {
            const isSelected: boolean = isPinSelected(filter, pin.id);
            return (
              <PinInfo
                key={pin.id}
                paxs={paxs}
                pinSets={pinSets}
                pin={pin}
                togglePinInSet={togglePinInSet}
                isSelected={isSelected}
              >
                <PinListButtons
                  isSelected={isSelected}
                  pinId={pin.id}
                  addPin={addToFilter}
                  removePin={removeFromFilter}
                  togglePinInSet={togglePinInSet}
                />
              </PinInfo>
            );
          })}
        </>
      )}
    </>
  );
};
