import { PAXEvent, Pin, PinId } from '../types.js';
import { PaxEventSash, PinCategorySash, PinSash } from './PinSash.js';
import { queryByText, queryHelpers, render } from '@testing-library/react';

import { PinCollectionData } from '../pinnypals/pinnypals3convertor.js';
import { PinInfo } from './PinInfo.js';
import { findTestPin } from '../../test/testutils.js';
import pinpanionTestData from '../../test/pinpanion-pin-data.json';

const failureMessage = (pin: Pin, html?: string): string => {
  return `Pin ${JSON.stringify(pin)} failed to render properly: ${html}`;
};

const queryByPinSetId = queryHelpers.queryByAttribute.bind(null, 'data-pin-set-id');

const assertPinInfoSash = (
  pinData: PinCollectionData, pinId: PinId, pinName: string, expectedSash: string
): HTMLElement => {
  const pin: Pin = findTestPin(pinData.pins, pinName, pinId);
  if (!pin) {
    throw new Error(`Pin not found with id ${pinId}`);
  }

  expect(pin.name).toEqual(pinName);

  const { container, queryByText } = render(
    <PinInfo
      categories={pinData.categories}
      displaySize="normal"
      pin={pin}
      paxs={pinData.pax}
      pinSets={pinData.sets}
      groups={pinData.groups}
      events={pinData.events}
    />
  );
  const element = queryByText(expectedSash);

  expect(element, failureMessage(pin, container?.innerHTML)).not.toBeNull();
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
  return container.children[0] as HTMLElement;
};

const assertPinSash = (
  pinData: PinCollectionData, pinId: PinId, pinName: string, expectedSash: string
): HTMLElement => {
  const pin: Pin = findTestPin(pinData.pins, pinName, pinId);
  if (!pin) {
    throw new Error(`Pin not found with id ${pinId}`);
  }

  expect(pin.name).toEqual(pinName);

  const { container, queryByText } = render(
    <PinSash
      pin={pin}
      paxs={pinData.pax}
      sets={pinData.sets}
      groups={pinData.groups}
      events={pinData.events}
      categories={pinData.categories}
    />
  );
  const element = queryByText(expectedSash);

  expect(element, failureMessage(pin, container?.innerHTML)).not.toBeNull();
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
  return container.children[0] as HTMLElement;
};

describe('PinSash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should get sash for set name', async () => {
    assertPinSash(pinData, 1382, 'Light Blue Squid', 'Splatoon Inkling');
  });

  it('Should get sash for specific event year', async () => {
    const unpluggedContainer = assertPinSash(pinData, 829, 'Kill Doctor Lucky', 'PAX Unplugged 2018');
    console.log(unpluggedContainer.innerHTML);
    expect(unpluggedContainer).toHaveAttribute('data-pin-event-id', '40');
    expect(unpluggedContainer).toHaveClass('event paxUnplugged');
  });

  it('Should get a show set pin sash', async () => {
    const southContainer = assertPinSash(pinData, 199, 'Hotstepper Gabe', 'South Core');
    const foundPinSet = queryByPinSetId(southContainer, '28');
    expect(foundPinSet?.innerHTML).toEqual('South Core');
    const setId = southContainer.attributes.getNamedItem('data-pin-set-id');
    console.log(setId);
    expect(southContainer).toHaveAttribute('data-pin-set-id', '28');
    expect(southContainer).toHaveClass('set paxSouth');
    // expect(southContainer.getAttribute('data-pin-set-id')).toEqual('28');
    // expect(southContainer.getAttribute('class')).toEqual('set paxSouth');

    const ausContainer = assertPinSash(pinData, 184, 'Dropbear', 'Aus 2014 Core');
    expect(ausContainer).toHaveAttribute('data-pin-set-id', '24');
    expect(ausContainer).toHaveClass('set paxAus');
    // expect(ausContainer.getAttribute('data-pin-set-id')).toEqual('24');
    // expect(ausContainer.getAttribute('class')).toEqual('set paxAus');
  });

  it('Should get a limited edition sash', async () => {
    const leContainer = assertPinSash(pinData, 1508, 'New Year 2024', 'Limited');
    expect(leContainer).toHaveAttribute('data-pin-category-id', '6');
    expect(leContainer).toHaveClass('category categoryLimited');
  });
});

describe('PaxEventSash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;
  it('Should display PAX event info sash when loaded from server data', async () => {
    const events = pinData.events;
    const event: PAXEvent|undefined = events.find((e) => e.id === 40);
    expect(event).not.toBeUndefined();

    const { queryByText } = render(<PaxEventSash event={event} events={events} />);
    const element = queryByText('PAX Unplugged 2018');
    expect(element).not.toBeNull();
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  });
});

describe('PinInfo.EventSash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should display PAX event info sash when loaded from server data', async () => {
    assertPinInfoSash(pinData, 1615, 'E-Goop', 'PAX Aus 2024');
  });

  it('Should have a PAX event info pane with sash for staff set pins.', async () => {
    assertPinInfoSash(pinData, 1276, 'PAX Space Security', 'PAX Trade Set 2022');
  });

  it('Should display PAX event info pane with sash for a non-show set pin', async () => {
    assertPinInfoSash(pinData, 1382, 'Light Blue Squid', 'Splatoon Inkling');
  });
});

describe('PinInfo.CategorySash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should display limited edition pin info category sash', async () => {
    const nyPin = assertPinInfoSash(pinData, 1508, 'New Year 2024', 'Limited');
    const nyPinSash = queryByText(nyPin, 'Limited');
    expect(nyPinSash, nyPinSash?.innerHTML).toHaveAttribute('data-pin-category-id', '6');
    expect(nyPinSash, nyPinSash?.innerHTML).toHaveClass('category categoryLimited');
    const aiPin = assertPinInfoSash(pinData, 1549, 'Acquisitions Incorporate Series 2 Kickstarter', 'Limited');
    const aiPinSash = queryByText(aiPin, 'Limited');
    expect(aiPinSash, aiPinSash?.innerHTML).toHaveAttribute('data-pin-category-id', '6');
    expect(aiPinSash, aiPinSash?.innerHTML).toHaveClass('category categoryLimited');
  });
});


describe('PinSash.PinCategorySash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should display a limited edition cateogry sash', async () => {
    const nySash = assertPinSash(pinData, 1508, 'New Year 2024', 'Limited');
    expect(nySash, nySash?.innerHTML).toHaveAttribute('data-pin-category-id', '6');
    expect(nySash, nySash?.innerHTML).toHaveClass('category categoryLimited');
  });
});

describe('PinCategorySash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should display a limited edition cateogry sash', async () => {
    const { container } = render(
      <PinCategorySash categoryIds={[6]} pinCategories={pinData.categories} />
    );
    expect(container).not.toBeNull();
  });
});
