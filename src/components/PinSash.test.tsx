import { Pin, PinSet } from '../types.js';
import { findTestPin, getPinFromTestData } from '../../test/testutils.js';

import { PinCollectionData } from '../pinnypals/pinnypals3convertor.js';
import { PinInfo } from './PinInfo.js';
import pinpanionTestData from '../../test/pinpanion-pin-data.json';
import { render } from '@testing-library/react';

describe('PinInfo.EventSash', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;
  const sets: PinSet[] = pinpanionTestData.sets as PinSet[];

  it('Should display PAX event info sash when loaded from server data', async () => {
    const testPinId = 1615;
    const pin: Pin | undefined = getPinFromTestData(pinData.pins, testPinId);
    if (!pin) {
      throw new Error(`Pin not found with id ${testPinId}`);
    }
    const { queryByLabelText } = render(
      <PinInfo
        displaySize="normal"
        pin={pin}
        paxs={pinData.pax}
        pinSets={sets}
        groups={pinData.groups}
        events={pinData.events} />
    );
    const eventLabel = queryByLabelText('PAX Aus 2024');
    console.log(eventLabel);
    // Test goes here
  });

  const failureMessage = (pin: Pin, html?: string): string => {
    return `Pin ${JSON.stringify(pin)} failed to render properly: ${html}`;
  };

  it('Should have a sash for staff set pins.', async () => {
    const securityPin: Pin = findTestPin(pinData.pins, 'PAX Space Security', 1276);
    const { container, queryByText } = render(
      <PinInfo
        displaySize="normal"
        pin={securityPin}
        paxs={pinData.pax}
        pinSets={sets}
        groups={pinData.groups}
        events={pinData.events}
      />
    );

    const element = queryByText('PAX Trade Set 2022');

    expect(element, failureMessage(securityPin, container?.innerHTML)).not.toBeNull();
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  });

  it('Should display sash for a non-show set pin', async () => {
    const squidPin: Pin = findTestPin(pinData.pins, 'Light Blue Squid', 1382);
    const { queryByText } = render(
      <PinInfo
        displaySize="normal"
        pin={squidPin}
        paxs={pinData.pax}
        pinSets={sets}
        groups={pinData.groups}
        events={pinData.events}
      />
    );
    console.log(squidPin);
    const element = queryByText('Splatoon Inkling');

    expect(element).not.toBeNull();
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  });
});

