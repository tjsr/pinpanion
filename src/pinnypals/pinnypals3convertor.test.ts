import { PinCollectionData, getPaxById, requestToDataSet } from './pinnypals3convertor.js';

import { Pin } from '../types.js';
import { Pinnypals3ItemDataRequest } from './pinnypals3types.js';
import v3testData from '../../test/pinsv3.json';

describe('Should read Pinnypals V3 data in JSON block', () => {
  const data: PinCollectionData = requestToDataSet(v3testData as Pinnypals3ItemDataRequest);
  test('V3 - Parse a PAX Event', () => {
    expect(data.events[2].name).toBe('PAX Prime 2015');
    expect(data.events[15].id).toBe(16);
    expect(data.events[15].name).toBe('PAX East 2018');
  });

  test('V3 - Lookup details for a linked PAX for a PAX Event', () => {
    expect(getPaxById(data.events[4].paxId)?.shortName).toBe('PAX_WEST');
    expect(getPaxById(data.events[15].paxId)?.shortName).toBe('PAX_EAST');
  });

  test('V3 - Parse a pin', () => {
    expect(data.pins[0].name).toBe('Pinny Arcade Logo');
    expect(data.pins[0].id).toBe(5);
  });

  test('V3 - Expect n 2013 pins', () => {
    expect(data.pins.filter((p: Pin) => p.year === 2013).length).toBe(80);
  });

  test('V3 - Find all pins in the West 18 show set', () => {
    expect(data.pins.filter((p: Pin) => p.set_id === 73).length).toBe(4);
  });
});
