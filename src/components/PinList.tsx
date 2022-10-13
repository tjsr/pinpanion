import '../css/pins.css';

import { PAX, Pin, PinListFilter, PinSelectionList, PinSet, SizesType } from '../types';

import { FilterQRCode } from './FilterQRCode';
import { VariableSizeGrid as Grid } from 'react-window';
import { MemoizedPinInfo } from './PinInfo';
import { PinListButtons } from './PinButtons';
import React from 'react';
import { newSelectionList } from '../fixture';
import { removeOrAddId } from '../listutils';
import useWindowDimensions from '../utils/useWindowDimensions';

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

interface GridPinRendererProps {
  columnIndex: number;
  rowIndex: number;
  style: any;
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
  const { height, width } = useWindowDimensions();

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

  const rowHeights = new Array(displayedPins.length).fill(true).map(() => 25 + Math.round(Math.random() * 50));

  const COLUMN_COUNT = 6;
  const columnWidths = new Array(displayedPins.length).fill(true).map(() => width - 25 / COLUMN_COUNT);
  // new Array(displayedPins.length).fill(true).map(() => 75 + Math.round(Math.random() * 50));
  const ROW_COUNT = displayedPins.length / COLUMN_COUNT + 1;

  const GridPinRenderer = ({ columnIndex, rowIndex, style }: GridPinRendererProps): JSX.Element => {
    const index = rowIndex * COLUMN_COUNT + columnIndex;
    const pin: Pin = displayedPins[index];
    if (index >= displayedPins.length) {
      console.warn(`Index ${index} on row ${rowIndex} is out of range of displayable pins.`);
      return <></>;
    }

    return (
      <MemoizedPinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin}>
        {activePinSet?.editable && (
          <PinListButtons
            availableCount={countPinAvailable(pin.id)}
            wantedCount={countPinWanted(pin.id)}
            pinId={pin.id}
            setPinAvailable={togglePinAvailable}
            setPinWanted={togglePinWanted}
          />
        )}
      </MemoizedPinInfo>
    );
  };

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
            <Grid
              columnCount={COLUMN_COUNT}
              columnWidth={(index: number) => columnWidths[index]}
              height={height}
              rowCount={ROW_COUNT}
              rowHeight={(index: number) => rowHeights[index]}
              width={width - 25}
            >
              {GridPinRenderer}
            </Grid>
          </div>
        </>
      )}
    </>
  );
};
