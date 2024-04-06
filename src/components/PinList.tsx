import '../css/pins.css';

import { BUTTON_SIZES, InfoSize, PIN_INFO_PANE_SIZES, SET_INFO_PANE_SIZES } from '../utils/sizingHints';
import { PAX, Pin, PinListFilter, PinSelectionList, PinSet, SizesType, UserId, YearAndIdComparable } from '../types';
import React, { useEffect, useRef } from 'react';
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

  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

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

  const DEFAULT_MIN_COLUMNS = 3;

  const MINIMUM_ELEMENT_COLUMNS = new Map<SizesType, number>();
  MINIMUM_ELEMENT_COLUMNS.set('tiny', 4);
  MINIMUM_ELEMENT_COLUMNS.set('sm', 3);
  MINIMUM_ELEMENT_COLUMNS.set('normal', 2);
  MINIMUM_ELEMENT_COLUMNS.set('large', 1);

  const getScrollbarWidth = (): number => {
    // Create a new div element
    const div = document.createElement('div');
  
    // Make the div have an overflow of scroll
    div.style.overflow = 'scroll';
  
    // Append the div to the body
    document.body.appendChild(div);
  
    // The difference between the div's offsetWidth and its clientWidth
    // is the scrollbar width
    const scrollbarWidth = div.offsetWidth - div.clientWidth;
  
    // Remove the div from the body
    document.body.removeChild(div);
  
    // Return the scrollbar width
    return scrollbarWidth;
  }

  const scrollbarWidth = getScrollbarWidth();

  const getElementTargetWidth = (displaySize: SizesType, usableScreenWidth: number): { columns: number, celWidth: number } => {
    const minColumns = MINIMUM_ELEMENT_COLUMNS.get(displaySize) || DEFAULT_MIN_COLUMNS;
    const minDesiredWidth = getPinInfoColumnWidth(displaySize);
    let targetColumns = Math.round((usableScreenWidth / minDesiredWidth) - 0.5);
    if (targetColumns < minColumns) {
      targetColumns = minColumns;
    }
    const targetPixelWidth = usableScreenWidth / targetColumns;

    return { columns: targetColumns, celWidth: targetPixelWidth };
  };

  const gridInternalWidth = windowWidth - scrollbarWidth - 4;
  const { columns: targetColumnCount, celWidth: targetGridCelWidth } = getElementTargetWidth(displaySize, gridInternalWidth);

  const rowHeight = getPinInfoRowHeight(displaySize) -
    (hideCollectionButtons ? (BUTTON_SIZES.get(displaySize) || 32) +
    (PIN_INFO_PANE_SIZES.get(displaySize)?.bottomPaddingPixels || 8) : 0);
  const setRowHeight = getPinSetInfoRowHeight(displaySize) -
    (hideCollectionButtons ? (BUTTON_SIZES.get(displaySize) || 32) +
    (SET_INFO_PANE_SIZES.get(displaySize)?.bottomPaddingPixels || 8) : 0);

  const targetPinRows = Math.round(displayedPins.length / targetColumnCount) + 1;
  const targetPinSetRows = Math.round(displayedPinSets.length / targetColumnCount) + 1;

  const GridPinRenderer = ({ columnIndex, rowIndex, style }: GridPinRendererProps): JSX.Element => {
    const index = rowIndex * targetColumnCount + columnIndex;
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
    const index = rowIndex * targetColumnCount + columnIndex;
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

  const buttonKey = useRef<HTMLDivElement>(null);
  const TOP_SECTION_HEIGHT_ALLOWANCE = 207;
  const [buttonDivBottom, setButtonDivBottom] = React.useState<number>(TOP_SECTION_HEIGHT_ALLOWANCE);

  useEffect(() => {
    if (buttonKey.current) {
      const buttonDivPosition = buttonKey.current.getBoundingClientRect();
      setButtonDivBottom(buttonDivPosition.bottom);
    }
  }, [showInSets, hideCollectionButtons, activePinSet]);

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
            <div ref={buttonKey} className="buttonKey">
              Click <button className="pinNotAvailable">A</button> to toggle from 'Available' list, or{' '}
              <button className="pinNotWanted">W</button> to add to 'Wanted' list.
              [<a onClick={() => setHideCollectionButtonsSelected(true)}>Hide buttons</a>]
            </div>
          )}
          { hideCollectionButtonsSelected && <div ref={buttonKey} className="buttonKey"><a onClick={() => setHideCollectionButtonsSelected(false)}>Show buttons</a></div> }
          { showInSets ?
            <Grid
              columnCount={targetColumnCount}
              columnWidth={targetGridCelWidth}
              height={windowHeight - buttonDivBottom}
              rowCount={targetPinSetRows}
              rowHeight={setRowHeight}
              width={windowWidth - 2}
              style={{ overflowY: 'scroll' }}
            >
              {GridPinSetRenderer}
            </Grid> :
            <Grid
              columnCount={targetColumnCount}
              columnWidth={targetGridCelWidth}
              height={windowHeight - buttonDivBottom}
              rowCount={targetPinRows}
              rowHeight={rowHeight}
              width={windowWidth - 2}
              style={{ overflowY: 'scroll' }}
            >
              {GridPinRenderer}
            </Grid>
          }
        </>
      )}
    </>
  );
};
