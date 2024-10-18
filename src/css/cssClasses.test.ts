import { getCategoryCssClass, getCssNameForEventId } from './cssClasses.js';

import { PinCollectionData } from '../pinnypals/pinnypals3convertor.js';
import pinpanionTestData from '../../test/pinpanion-pin-data.json';

describe('Event lookup', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;

  it('Should return unplugged for search event', () => {
    const paxForEvent = getCssNameForEventId(40, pinData.events);
    expect(paxForEvent).toEqual('paxUnplugged');
  });
});

describe('getCategoryCssClass', () => {
  it('Should return correct class for Limited Edition category', () => {
    const category = {
      colour: '#000000',
      id: 6,
      name: 'Limited',
    };
    const categoryCssClass = getCategoryCssClass(category);
    expect(categoryCssClass).toEqual('categoryLimited');
  });
});
