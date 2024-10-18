import { PinCollectionData } from '../pinnypals/pinnypals3convertor.js';
import pinpanionTestData from '../../test/pinpanion-pin-data.json';

describe('PinInfo.General', () => {
  const pinData: PinCollectionData = pinpanionTestData as PinCollectionData;
  it.skip('Should not error.', async () => {
    expect(pinData).toBeDefined();
  });

  it('Should flag that we want to add some properties later', { fails: true }, async () => {
    expect(pinData.sets.every((s) => s.isPackagedSet !== undefined)).toBeTruthy();
    expect(pinData.sets.every((s) => s.isReprint !== undefined)).toBeTruthy();
  });
});
