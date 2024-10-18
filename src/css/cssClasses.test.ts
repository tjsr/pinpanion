import { getCssNameForEventId, getPaxDisplayForPaxId } from './cssClasses.js';

import { PinCollectionData } from '../pinnypals/pinnypals3convertor.js';
import pinpanionTestData from '../../test/pinpanion-pin-data.json';

describe('Event lookup', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should return unplugged for search event', () => {
    const paxForEvent = getCssNameForEventId(40, pinData.events);
    expect(paxForEvent).toEqual('paxUnplugged');
  });
});

describe('getPaxDisplayForPaxId', () => {
  it('Should return Pax CSS display name for an id', () => {
    const paxId = 5;
    const lookupName = getPaxDisplayForPaxId(paxId);
    expect(lookupName).toEqual('Aus');
  });
});
