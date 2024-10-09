import { PinCollectionData, requestToDataSet } from './pinnypals2convertor.js';

import { Pin } from '../types.js';
import { Pinnypals2PinsRequest } from './pinnypals2types.js';
import v2testData from '../../test/pinsv2.json';

describe('Should read Pinnypals V2 data in JSON block', () => {
  const data: PinCollectionData = requestToDataSet(v2testData as Pinnypals2PinsRequest);
  test('V2 - Parse a PAX', () => {
    expect(data.pax[2].name).toBe('PAX Aus');
    expect(data.pax[4].shortName).toBe('online');
    expect(data.pax[7].id).toBe(8);
    expect(data.pax[7].shortName).toBe('south');
    expect(data.pax[7].name).toBe('PAX South');
  });

  test('V2 - Parse a pin', () => {
    expect(data.pins[0].name).toBe('Flesh Reaper');
    expect(data.pins[0].id).toBe(1);
  });

  test('V2 - Expect n 2013 pins', () => {
    expect(data.pins.filter((p: Pin) => p.year === 2013).length).toBe(80);
  });

  test('V2 - Find all pins in the West 18 show set', () => {
    expect(data.pins.filter((p: Pin) => p.set_id === 73).length).toBe(4);
  });
});
