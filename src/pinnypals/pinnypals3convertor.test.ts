import { GroupTypes, Pin } from '../types.js';
import {
  PinCollectionData,
  convertPinnypals3ItemDataEventToPAXEvent,
  convertPinnypals3ItemDataEventsToPAXEvent,
  convertPinnypals3ItemDataGroupToPinGroup,
  convertPinnypals3ItemDataPinsDataToPins,
  getPaxById,
  requestToDataSet
} from './pinnypals3convertor.js';
import {
  Pinnypals3Event,
  Pinnypals3ItemDataEvent,
  Pinnypals3ItemDataGroup,
  Pinnypals3ItemDataRequest
} from './pinnypals3types.js';

import { findTestPin } from '../../test/testutils.js';
import pinsv3json from '../../test/pinsv3.json';

const v3testData: Pinnypals3ItemDataRequest = pinsv3json as Pinnypals3ItemDataRequest;

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

describe('convertPinnypals3PinDataToPin', () => {
  test('V3 - Should accept pin if it has no Pax ID', () => {
    const eventData = convertPinnypals3ItemDataEventsToPAXEvent(v3testData.events as Pinnypals3ItemDataEvent[]);
    expect(() => convertPinnypals3ItemDataPinsDataToPins(v3testData.pins, eventData, v3testData.groups)).not.toThrow();
  });

  test('Should have a collection for staff pins', () => {
    const eventData = convertPinnypals3ItemDataEventsToPAXEvent(v3testData.events as Pinnypals3ItemDataEvent[]);
    const pinData = convertPinnypals3ItemDataPinsDataToPins(v3testData.pins, eventData, v3testData.groups);
    const securityPin: Pin = findTestPin(pinData, 'PAX Space Security', 1276);

    expect(securityPin.group_id).toEqual(136);
  });
});

describe(convertPinnypals3ItemDataGroupToPinGroup, () => {
  it('Should convert a group to a pin group', () => {
    const testGroup: Pinnypals3ItemDataGroup = {
      id: 1,
      imageUrl: 'http://example.com',
      name: 'Test Group',
      notes: 'Test notes',
      type: 'STAFF',
    };
    const group = convertPinnypals3ItemDataGroupToPinGroup(testGroup);
    expect(group.id).toBe(1);
    expect(group.imageUrl).toBe('http://example.com');
    expect(group.name).toBe('Test Group');
    expect(group.notes).toBe('Test notes');
    expect(group.type).toBe(GroupTypes.STAFF);
  });
});

describe('convertPinnypals3EventToPAXEvent', () => {
  const sampleTestEvent: Pinnypals3Event = {
    colour: 'red',
    endDate: '2023-01-03',
    id: 99,
    name: 'Bad Event',
    startDate: '2023-01-01',
    subType: 'PAX_BAD',
    year: 2023,
  } as Pinnypals3Event;

  test('V3 - Should reject unknown PAX event type', () => {
    const badEvent = {
      colour: 'red',
      endDate: '2023-01-03',
      id: 99,
      name: 'Bad Event',
      startDate: '2023-01-01',
      subType: 'PAX_BAD',
      type: 'PAX',
      year: 2023,
    };
    expect(
      () => convertPinnypals3ItemDataEventToPAXEvent(badEvent as Pinnypals3ItemDataEvent))
      .toThrow('Unknown PAX event type: PAX_BAD');
  });

  test('V3 - Should convert PAX event type to PAX ID', () => {
    const paxEvent = {
      colour: 'blue',
      endDate: '2023-01-03',
      id: 1,
      name: 'PAX West',
      startDate: '2023-01-01',
      subType: 'PAX_WEST',
      type: 'PAX',
      year: 2023,
    };
    const paxEvents = convertPinnypals3ItemDataEventToPAXEvent(paxEvent as Pinnypals3ItemDataEvent);
    expect(paxEvents.paxId).toBe(1);
  });

  test('Should reject an event with no type', () => {
    const badEvent = { ...sampleTestEvent,
      subType: 'PAX_SOUTH',
    } as Pinnypals3Event;
    delete (badEvent as any).type;

    expect(() => convertPinnypals3ItemDataEventToPAXEvent(badEvent as Pinnypals3ItemDataEvent))
      .toThrow('Missing PAX type property on Pinnypals3Event element');
  });
});

describe('convertPinnypals3SetDataToSet', () => {
  it('Should specify whether a set is a packaged set or a loose set', () => {
    // const testSet: Pinnypals3PinSet = {
    //   id: 0,
    //   name: '',
    //   imageUrl: ''
    // }
    // expect(convertPinnypals3SetDataToSet();
  });

  it('Should specify whether a set is a reprint', () => {

    // convertPinnypals3SetDataToSet();
  });
});
