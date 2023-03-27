/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';

import { PinSelectionEditor, PinSelectionListEditor } from './PinSelectionFilter';
/* eslint-disable comma-dangle */
import {
  alternativeLanyard2,
  newlyCreatedEmpty,
  nonEditableList,
  storedLanyardList,
  activeLanyard as testLanyard,
} from './__test/lanyards.testdata';
// For some reason, prettier keeps inserting a dangling comma here, even without the alias.
/* eslint-enable comma-dangle */
import { render, screen } from '@testing-library/react';

import { PinSelectionList } from '../types';
import React from 'react';
import { isEmptyList } from '../utils';
import { switchToLanyard } from './__test/lanyards.utils';

const verifySelectedOnlySwitchStatus = (showSeparateDisabled: boolean): void => {
  const selectedLabel: HTMLInputElement = screen.getByLabelText(/Show selected pins only/i) as HTMLInputElement;
  expect(selectedLabel).toBeInTheDocument();
  expect(selectedLabel.disabled).toBe(showSeparateDisabled);
};

describe('PinSelectionEditor', () => {
  type TestableEditorProps = {
    activeLanyard: PinSelectionList;
    onChange?: (updatedList: PinSelectionList) => void;
    showSelectedOnlyToggleDisabled: (lanyard: PinSelectionList) => boolean;
  };

  const showSelectedOnlyToggleDisabledWithExpectations = (
    lanyard: PinSelectionList,
    expectEmpty: boolean,
    expectEditable: boolean
  ) => {
    const isEmpty = isEmptyList(lanyard);
    expect(isEmpty).toBe(expectEmpty);
    expect(lanyard.editable).toBe(expectEditable);
    return isEmpty || !lanyard.editable;
  };

  const TestablePinSelectionEditor = (props: TestableEditorProps): JSX.Element => {
    const defaultOnChange = (updatedList: PinSelectionList): void => {
      console.log('Selected list changed to ' + updatedList.name);
    };

    return (
      <PinSelectionEditor
        showSelectedOnlyToggleDisabled={() => props.showSelectedOnlyToggleDisabled(props.activeLanyard)}
        activeLanyard={props.activeLanyard}
        onChange={props.onChange || defaultOnChange}
        changeListDisplayed={function (): void {
          throw new Error('Function not implemented.');
        }}
        onlyShowSelectedPins={false}
      />
    );
  };

  const showSelectedOnlyToggleDisabled = (lanyard: PinSelectionList) => {
    /* eslint-disable indent */
    switch (lanyard.id) {
      case testLanyard.id:
        return showSelectedOnlyToggleDisabledWithExpectations(lanyard, false, true);
      case nonEditableList.id:
        return showSelectedOnlyToggleDisabledWithExpectations(lanyard, false, false);
      case newlyCreatedEmpty.id:
        return showSelectedOnlyToggleDisabledWithExpectations(lanyard, true, false);
    }
    /* eslint-enable indent */
    return showSelectedOnlyToggleDisabledWithExpectations(lanyard, true, true);
  };

  it('A list with available/wanted might be but is not disabled.', async () => {
    const component = (
      <TestablePinSelectionEditor
        showSelectedOnlyToggleDisabled={showSelectedOnlyToggleDisabled}
        activeLanyard={testLanyard}
      />
    );
    render(component);

    verifySelectedOnlySwitchStatus(false);
  });

  it('Test that lanyard can only show selected when list is set not editable.', async () => {
    const component = (
      <TestablePinSelectionEditor
        showSelectedOnlyToggleDisabled={showSelectedOnlyToggleDisabled}
        activeLanyard={nonEditableList}
      />
    );
    render(component);

    verifySelectedOnlySwitchStatus(true);
  });
});

describe('PinSelectionListEditor', () => {
  type TestableListProps = {
    activeLanyard: PinSelectionList;
    lanyardList: PinSelectionList[];
    onChange?: (updatedList: PinSelectionList) => void;
  };

  const TestablePinSelectionListEditor = (props: TestableListProps): JSX.Element => {
    const [activeLanyard, setActiveLanyard] = React.useState<PinSelectionList>(props.activeLanyard);

    const defaultOnChange = (updatedList: PinSelectionList): void => {
      console.log('Selected list changed to ' + updatedList.name);
    };

    return (
      <PinSelectionListEditor
        storedLanyardList={props.lanyardList}
        activeLanyard={activeLanyard}
        changeListDisplayed={function (id: string, display: boolean): void {
          console.log('Toggled switch to ' + display);
        }}
        enableFilter={false}
        lanyardSelected={function (lanyardId: string): void {
          if (lanyardId === 'new') {
            setActiveLanyard(newlyCreatedEmpty);
          } else {
            const switchTo: PinSelectionList | undefined = props.lanyardList.find((l) => l.id == lanyardId);
            if (switchTo == undefined) {
              throw new Error('Lanyard id not found in test data list.');
            } else {
              setActiveLanyard(switchTo);
            }
          }
        }}
        onChange={props.onChange || defaultOnChange}
      />
    );
  };

  it('Renders with starting lanyard name', async () => {
    const component = <TestablePinSelectionListEditor activeLanyard={testLanyard} lanyardList={storedLanyardList} />;
    const { getByLabelText } = render(component);

    const listName = getByLabelText(/List Name/i) as HTMLInputElement;
    expect(listName.value).toEqual(testLanyard.name);
  });

  it('Test that lanyard name has been changed when new lanyard selected', async () => {
    const component = <TestablePinSelectionListEditor activeLanyard={testLanyard} lanyardList={storedLanyardList} />;
    const { getByLabelText, queryByLabelText, getByRole } = render(component);

    await switchToLanyard('new', storedLanyardList, queryByLabelText, getByRole);

    expect(queryByLabelText(/Switch lanyard/i)).toBeInTheDocument();

    const updatedListName = getByLabelText(/List Name/i) as HTMLInputElement;

    expect(queryByLabelText(/List Name/i)).toBeInTheDocument();
    expect(updatedListName.value).not.toEqual('');
    expect(updatedListName.value).not.toEqual('Create a new lanyard');
    expect(updatedListName.value).toEqual(newlyCreatedEmpty.name);
  });

  it('Should receive an onChange event when selecing a new list', async () => {
    const mockNewList = (selected: PinSelectionList): void => {
      expect(selected.id).toBe('new');
    };

    const component = (
      <TestablePinSelectionListEditor
        activeLanyard={testLanyard}
        lanyardList={storedLanyardList}
        onChange={mockNewList}
      />
    );
    const { queryByLabelText, getByRole } = render(component);
    await switchToLanyard('new', storedLanyardList, queryByLabelText, getByRole);
  });

  it('Should receive an onChange for matching lanyard', async () => {
    const mockSelectedList = (selected: PinSelectionList): void => {
      expect(selected.id).toBe(alternativeLanyard2.id);
    };

    const component = (
      <TestablePinSelectionListEditor
        activeLanyard={testLanyard}
        lanyardList={storedLanyardList}
        onChange={mockSelectedList}
      />
    );
    const { queryByLabelText, getByRole } = render(component);
    await switchToLanyard(alternativeLanyard2.id, storedLanyardList, queryByLabelText, getByRole);
  });

  it('Test that lanyard cannot be set to selected only when list is empty.', async () => {
    const component = <TestablePinSelectionListEditor activeLanyard={testLanyard} lanyardList={storedLanyardList} />;
    const { queryByLabelText, getByRole } = render(component);
    await switchToLanyard('new', storedLanyardList, queryByLabelText, getByRole);

    expect(queryByLabelText(/Switch lanyard/i)).toBeInTheDocument();

    verifySelectedOnlySwitchStatus(true);
  });

  it('Test that lanyard can only show selected when list is set not editable.', async () => {
    const mockSelectedList = (selected: PinSelectionList): void => {
      expect(selected.id).toBe(nonEditableList.id);
      expect(selected.editable).toBe(false);
      expect(selected.availableIds.length).toBe(1);
      expect(selected.wantedIds.length).toBe(1);
    };

    const component = (
      <TestablePinSelectionListEditor
        activeLanyard={testLanyard}
        onChange={mockSelectedList}
        lanyardList={storedLanyardList}
      />
    );
    const { queryByLabelText, getByRole } = render(component);

    await switchToLanyard(nonEditableList.id, storedLanyardList, queryByLabelText, getByRole);

    verifySelectedOnlySwitchStatus(true);
  });
});
