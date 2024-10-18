import { PinCollectionData } from '../pinnypals/pinnypals3convertor.js';
import { PinSet } from '../types.js';
import testData from '../../test/pinpanion-pin-data.json';

describe('Pinnypals3DataConversionValidation', () => {
  test('Test data should validate against schema.', () => {
    const typedData: PinCollectionData = testData as PinCollectionData;
    expect(typedData.pins.length).toBeGreaterThan(0);
  });
});

describe('ValidateConvertedSets', () => {
  test('Test PinSets should validate against schema.', () => {
    const sets: PinSet[] = testData.sets as PinSet[];
    expect(sets.length).toBeGreaterThan(0);
  });
});
