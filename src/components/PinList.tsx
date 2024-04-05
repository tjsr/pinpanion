import '../css/pins.css';

import { BUTTON_SIZES, InfoSize, PIN_INFO_PANE_SIZES, SET_INFO_PANE_SIZES } from '../utils/sizingHints';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet, SizesType, UserId, YearAndIdComparable } from '../types';
import React, { useEffect } from 'react';
import { compareYearThenId, removeOrAddId } from '../listutils';

import { FilterQRCode } from './FilterQRCode';
import { FixedSizeGrid as Grid } from 'react-window';
import { MemoizedPinInfo } from './PinInfo';
import { MemoizedPinSetInfo } from './PinSetInfo';
import { PinListButtons } from './PinButtons';
import { getUserId } from '../settingsStorage';
import { isEditable } from '../utils';
import { newSelectionList } from '../fixture';
import useWindowDimensions from '../utils/useWindowDimensions';

interface PinListPropTypes {
  activePinSet?: PinSelectionList;
  displaySize?: SizesType;
  descendingAge: boolean;
  filter?: PinListFilter;
  heading: string;
  isPinFiltered: (pin: Pin, filter?: PinListFilter) => boolean;
  isPinSetFiltered: (pinSet: PinSet, filter?: PinListFilter) => boolean;
  paxs?: PAX[];
  pins: Pin[];
  pinSets?: PinSet[];
  setPinSet?: (list: PinSelectionList) => void;
  currentUserId: UserId;
  showInSets?: boolean;
  setShowInSets: (showInSets: boolean) => void;
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
  const columnPadding = 8;
  let sizeInfo: InfoSize | undefined = PIN_INFO_PANE_SIZES.get(displaySize);
  if (!sizeInfo) {
    sizeInfo = { heightPx: 120, widthEm: 10 };
  }
  const emsize = getEmSize(document.getElementById('root'));
  const columnWidth = emsize * sizeInfo.widthEm + columnPadding;
  return columnWidth;
};

const getPinSetInfoColumnWidth = (displaySize: SizesType): number => {
  const columnPadding = 8;
  let sizeInfo: InfoSize | undefined = SET_INFO_PANE_SIZES.get(displaySize);
  if (!sizeInfo) {
    sizeInfo = { heightPx: 240, widthEm: 20 };
  }
  const emsize = getEmSize(document.getElementById('root'));
  const columnWidth = emsize * sizeInfo.widthEm + (columnPadding);
  return columnWidth;
};

const getPinInfoRowHeight = (displaySize: SizesType): number => {
  let sizeInfo: InfoSize | undefined = PIN_INFO_PANE_SIZES.get(displaySize);
  if (!sizeInfo) {
    sizeInfo = { heightPx: 120, widthEm: 10 };
  }
  return sizeInfo.heightPx + (sizeInfo.bottomPaddingPixels || 0);
};

const getPinSetInfoRowHeight = (displaySize: SizesType): number => {
  let sizeInfo: InfoSize | undefined = SET_INFO_PANE_SIZES.get(displaySize);
  if (!sizeInfo) {
    sizeInfo = { heightPx: 240, widthEm: 20 };
  }
  return sizeInfo.heightPx + (sizeInfo.bottomPaddingPixels || 0);
};

const getPinsInSet = (pinSet: PinSet, allPins: Pin[]): Pin[] => {
  return allPins.filter((pin: Pin) => pinSet.isPackagedSet == true &&
    (pin.set_id === pinSet.id || pin.sub_set_id === pinSet.id));
};

export const PinList = (props: PinListPropTypes): JSX.Element => {
  const {
    descendingAge,
    displaySize = 'normal',
    heading,
    pins,
    paxs,
    pinSets,
    filter,
    activePinSet,
    isPinFiltered,
    isPinSetFiltered,
    setPinSet,
    currentUserId,
    showInSets = true,
    setShowInSets,
  } = props;
  const displayedPins: Pin[] = pins.filter((pin: Pin) => !isPinFiltered(pin, filter)).sort(
    (a: YearAndIdComparable, b: YearAndIdComparable) => compareYearThenId(a, b, descendingAge));
  // TODO: isPackagedSets might not be what we thought?
  const displayedPinSets: PinSet[] = (pinSets?.filter(
    (pinSet: PinSet) => !isPinSetFiltered(pinSet, filter) && pinSet.isPackagedSet) || []).sort(
    (a: YearAndIdComparable, b: YearAndIdComparable) => compareYearThenId(a, b, descendingAge));
  const pinsInDisplayedSets: Pin[] = displayedPinSets.flatMap((pinSet: PinSet) => getPinsInSet(pinSet, pins));

  const { height, width } = useWindowDimensions();
  const scrollbarAllowance = 32;

  const [hideCollectionButtonsSelected, setHideCollectionButtonsSelected] = React.useState<boolean>(false);
  const [hideCollectionButtons, setHideCollectionButtons] = React.useState<boolean>(activePinSet
    && !isEditable(currentUserId, activePinSet) || hideCollectionButtonsSelected);

  useEffect(() => {
    setHideCollectionButtons(activePinSet && !isEditable(currentUserId, activePinSet) || hideCollectionButtonsSelected);
  }, [hideCollectionButtonsSelected, activePinSet]);

  const togglePinAvailable = (pinId: number, isPinSet: boolean): void => {
    console.log(`Toggling ${isPinSet ? 'set' : 'pin'} ${pinId} available`);
    const availableIds: number[] = removeOrAddId(
      !isPinSet ? activePinSet?.availableIds : activePinSet?.availableSetIds,
      pinId);
    if (setPinSet) {
      const base: PinSelectionList = activePinSet || newSelectionList(getUserId());
      const updatedAvailableList = {
        ...base,
        revision: ++base.revision,
      };
      if (isPinSet) {
        updatedAvailableList.availableSetIds = availableIds;
      } else {
        updatedAvailableList.availableIds = availableIds;
      }

      setPinSet(updatedAvailableList);
    } else {
      console.warn('Couldn\'t update available list as setPinSet is not defined.');
    }
  };

  const togglePinWanted = (pinId: number, isPinSet: boolean): void => {
    console.log(`Toggling ${isPinSet ? 'set' : 'pin'} ${pinId} wanted`);
    const wantedIds: number[] = removeOrAddId(
      !isPinSet ? activePinSet?.wantedIds : activePinSet?.wantedSetIds,
      pinId);
    if (setPinSet) {
      const base: PinSelectionList = activePinSet || newSelectionList(getUserId());
      const updatedWantedList = {
        ...base,
        revision: ++base.revision,
      };
      if (isPinSet) {
        updatedWantedList.wantedSetIds = wantedIds;
      } else {
        updatedWantedList.wantedIds = wantedIds;
      }
      setPinSet(updatedWantedList);
    } else {
      console.warn('Couldn\'t update wanted list as setPinSet is not defined.');
    }
  };

  const countPinAvailable = (pinId: number, isPinSet?: boolean): number => {
    if (activePinSet) {
      let safePinSet = (isPinSet ? activePinSet?.availableSetIds : activePinSet.availableIds);
      if (safePinSet === undefined) {
        safePinSet = [];
      }
      return safePinSet.filter((n) => +n === +pinId).length;
    }
    return 0;
  };

  const countPinWanted = (pinId: number, isPinSet?: boolean): number => {
    if (activePinSet) {
      let safePinSet = (isPinSet ? activePinSet?.wantedSetIds : activePinSet?.wantedIds);
      if (safePinSet === undefined) {
        safePinSet = [];
      }
      return safePinSet.filter((n) => +n === +pinId).length;
    }
    return 0;
  };

  const columnWidth = getPinInfoColumnWidth(displaySize);
  const setColumnWidth = getPinSetInfoColumnWidth(displaySize);
  const COLUMN_COUNT = Math.round((width - scrollbarAllowance) / columnWidth - 0.5);
  const SET_COLUMN_COUNT = Math.round((width - scrollbarAllowance) / setColumnWidth - 0.5);
  const requestedWidth = showInSets ? setColumnWidth * SET_COLUMN_COUNT : columnWidth * COLUMN_COUNT;

  const rowHeight = getPinInfoRowHeight(displaySize) -
    (hideCollectionButtons ? (BUTTON_SIZES.get(displaySize) || 32) +
    (PIN_INFO_PANE_SIZES.get(displaySize)?.bottomPaddingPixels || 8) : 0);
  const setRowHeight = getPinSetInfoRowHeight(displaySize) -
    (hideCollectionButtons ? (BUTTON_SIZES.get(displaySize) || 32) +
    (SET_INFO_PANE_SIZES.get(displaySize)?.bottomPaddingPixels || 8) : 0);

  const ROW_COUNT = Math.round(displayedPins.length / COLUMN_COUNT) + 1;
  const SET_ROW_COUNT = Math.round(displayedPinSets.length / SET_COLUMN_COUNT) + 1;
  const TOP_SECTION_HEIGHT_ALLOWANCE = 207;

  const GridPinRenderer = ({ columnIndex, rowIndex, style }: GridPinRendererProps): JSX.Element => {
    const index = rowIndex * COLUMN_COUNT + columnIndex;
    if (index >= displayedPins.length) {
      return <></>;
    } else {
    }
    const pin: Pin = displayedPins[index];

    return (
      <div className="pinInfoPadding" style={style}>
        <MemoizedPinInfo displaySize={displaySize} key={pin.id} paxs={paxs} pinSets={pinSets} pin={pin}>
          {activePinSet && isEditable(currentUserId, activePinSet) && !hideCollectionButtonsSelected && (
            <PinListButtons
              availableCount={countPinAvailable(pin.id)}
              wantedCount={countPinWanted(pin.id)}
              pinId={pin.id}
              isPinSet={false}
              setPinAvailable={togglePinAvailable}
              setPinWanted={togglePinWanted}
            />
          )}
        </MemoizedPinInfo>
      </div>
    );
  };

  const GridPinSetRenderer = ({ columnIndex, rowIndex, style }: GridPinRendererProps): JSX.Element => {
    const index = rowIndex * SET_COLUMN_COUNT + columnIndex;
    if (index >= displayedPinSets.length) {
      return <></>;
    } else {
    }
    const pinSet: PinSet = displayedPinSets[index];
    const setPins: Pin[] = getPinsInSet(pinSet, pins);

    return (
      <div className="pinInfoPadding" style={style}>
        <MemoizedPinSetInfo
          displaySize={displaySize}
          key={pinSet.id}
          paxs={paxs}
          pinSets={pinSets}
          pinSet={pinSet}
          pinSetPins={setPins}>
          {activePinSet && isEditable(currentUserId, activePinSet) && !hideCollectionButtonsSelected && (
            <PinListButtons
              availableCount={countPinAvailable(pinSet.id, true)}
              wantedCount={countPinWanted(pinSet.id, true)}
              pinId={pinSet.id}
              isPinSet={true}
              setPinAvailable={togglePinAvailable}
              setPinWanted={togglePinWanted}
            />
          )}
        </MemoizedPinSetInfo>
      </div>
    );
  };

  const listCentreOffset = (width - requestedWidth - scrollbarAllowance) / 2;

  return (
    <>
      <h2>{heading}</h2>
      <a onClick={() => setShowInSets(!showInSets)}>Switch to {showInSets ? 'pins' : 'sets'}</a>
      {activePinSet && (
        <div className="printqr">
          <FilterQRCode lanyard={activePinSet} />
        </div>
      )}
      {pins && displayedPins && (
        <>
          { showInSets ? <>
            <div className="totalPins">Total pins in sets: {pinsInDisplayedSets.length}</div>
            <div className="totalPins">Total sets: {displayedPinSets.length}</div></> :
            <div className="totalPins">Total pins: {displayedPins.length}</div> }
          {activePinSet && isEditable(currentUserId, activePinSet) && !hideCollectionButtonsSelected && (
            <div className="buttonKey">
              Click <button className="pinNotAvailable">A</button> to toggle from 'Available' list, or{' '}
              <button className="pinNotWanted">W</button> to add to 'Wanted' list.
              [<a onClick={() => setHideCollectionButtonsSelected(true)}>Hide buttons</a>]
            </div>
          )}
          { hideCollectionButtonsSelected && <a onClick={() => setHideCollectionButtonsSelected(false)}>Show buttons</a> }
          { showInSets ?
            <Grid
              columnCount={SET_COLUMN_COUNT}
              columnWidth={setColumnWidth}
              height={height - TOP_SECTION_HEIGHT_ALLOWANCE}
              rowCount={SET_ROW_COUNT}
              rowHeight={setRowHeight}
              width={requestedWidth + scrollbarAllowance}
              style={{ left: listCentreOffset }}
            >
              {GridPinSetRenderer}
            </Grid> :
            <Grid
              columnCount={COLUMN_COUNT}
              columnWidth={columnWidth}
              height={height - TOP_SECTION_HEIGHT_ALLOWANCE}
              rowCount={ROW_COUNT}
              rowHeight={rowHeight}
              width={requestedWidth + scrollbarAllowance}
              style={{ left: listCentreOffset, position: 'absolute' }}
            >
              {GridPinRenderer}
            </Grid>
          }
        </>
      )}
    </>
  );
};
