import '../css/pins.css';

import { InfoSize, PIN_INFO_PANE_SIZES } from '../utils/sizingHints';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet, SizesType } from '../types';

import { FilterQRCode } from './FilterQRCode';
import { FixedSizeGrid as Grid } from 'react-window';
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
  style: React.CSSProperties;
}

function getEmSize(el: HTMLElement | null): number {
  if (el === undefined) {
    el = document.getElementById('root');
  }
  const computedFont: string = getComputedStyle(el!, '').fontSize;
  if (!computedFont) {
    return 16;
  }
  const matches: RegExpMatchArray | null = computedFont.match(/(\d+)px/);
  if (!matches) {
    return 16;
  }
  return Number(matches[1]);
}

const getPinInfoColumnWidth = (displaySize: SizesType): number => {
  let sizeInfo: InfoSize | undefined = PIN_INFO_PANE_SIZES.get(displaySize);
  if (!sizeInfo) {
    sizeInfo = { heightPx: 120, widthEm: 10 };
  }
  const emsize = getEmSize(document.getElementById('root'));
  const columnWidth = emsize * sizeInfo.widthEm + 4;
  return columnWidth;
};

const getPinInfoRowHeight = (displaySize: SizesType): number => {
  let sizeInfo: InfoSize | undefined = PIN_INFO_PANE_SIZES.get(displaySize);
  if (!sizeInfo) {
    sizeInfo = { heightPx: 120, widthEm: 10 };
  }
  return sizeInfo.heightPx;
};

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

  // const rowHeights = new Array(displayedPins.length).fill(true).map(() => 25 + Math.round(Math.random() * 50));
  // const rowHeights = new Array(displayedPins.length).fill(true).map(() => 227);
  // const columnWidths = new Array(displayedPins.length).fill(true).map(() => 132);

  // tiny sm normal large = 6 8 10 12

  const columnWidth = getPinInfoColumnWidth(displaySize);
  const COLUMN_COUNT = Math.round(width / columnWidth - 0.5);
  const requestedWidth = columnWidth * COLUMN_COUNT;
  // const columnWidths = new Array(displayedPins.length).fill(true).map(() => width - 25 / COLUMN_COUNT);
  // new Array(displayedPins.length).fill(true).map(() => 75 + Math.round(Math.random() * 50));

  const rowHeight = getPinInfoRowHeight(displaySize);

  const ROW_COUNT = Math.round(displayedPins.length / COLUMN_COUNT) + 1;
  console.log(`Displaying total of ${ROW_COUNT} rows and ${COLUMN_COUNT} columns`);
  // const ROW_COUNT = 7;

  const GridPinRenderer = ({ columnIndex, rowIndex, style }: GridPinRendererProps): JSX.Element => {
    const index = rowIndex * COLUMN_COUNT + columnIndex;
    console.info(`Displaying ${index} as row ${rowIndex} col ${columnIndex} is out of range of displayable pins.`);
    if (index >= displayedPins.length) {
      console.warn(`Index ${index} on row ${rowIndex} col ${columnIndex} is out of range of displayable pins.`);
      return <></>;
    }
    const pin: Pin = displayedPins[index];

    return (
      <MemoizedPinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin} style={style}>
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
              columnWidth={columnWidth}
              height={height - 185}
              rowCount={ROW_COUNT}
              rowHeight={rowHeight}
              width={requestedWidth + 32}
            >
              {GridPinRenderer}
            </Grid>
          </div>
        </>
      )}
    </>
  );
};
