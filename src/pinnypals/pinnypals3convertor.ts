import { PAX, PAXEvent, PAXId, Pin, PinSet, PublishYear } from '../types.js';
import { Pinnypals3Event, Pinnypals3ItemDataRequest, Pinnypals3PinData, Pinnypals3PinSet } from './pinnypals3types.js';

import { stripPathFromImageLocation } from '../utils.js';

export interface PinCollectionData {
  pax: PAX[];
  events: PAXEvent[];
  pins: Pin[];
  sets: PinSet[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shortenPaxName = (name: string): string => {
  const paxNameParts: string[] = name.trim().split(' ');
  const outputName = 'PAX ' + paxNameParts[1];
  return outputName;
};

const paxSubtypeMap: Map<string, PAXId> = new Map<string, PAXId>([
  ['PAX_WEST', 1],
  ['PAX_EAST', 2],
  ['PAX_AUS', 3],
  ['PAX_DEV', 4],
  ['PAX_UNPLUGGED', 5],
  ['PAX_ONLINE', 6],
  ['PAX_SOUTH', 7],
]);

const pax: PAX[] = [
  { id: 1, name: 'PAX West', shortName: 'PAX_WEST', styleName: 'west' },
  { id: 2, name: 'PAX East', shortName: 'PAX_EAST', styleName: 'east' },
  { id: 3, name: 'PAX Aus', shortName: 'PAX_AUS', styleName: 'aus' },
  { id: 4, name: 'PAX', styleName: 'prime' },
  { id: 5, name: 'PAX Online', shortName: 'PAX_ONLINE', styleName: 'online' },
  { id: 6, name: 'PAX Limited', styleName: 'limited' },
  { id: 7, name: 'PAX Gaming', styleName: 'gaming' },
  { id: 8, name: 'PAX South', shortName: 'PAX_SOUTH', styleName: 'south' },
  { id: 9, name: 'PAX Unplugged', shortName: 'PAX_UNPLUGGED', styleName: 'unplugged' },
];

const paxIdMap: Map<PAXId, PAX> = new Map<PAXId, PAX>(pax.map((p) => [p.id, p]));

export const getPaxById = (id: PAXId): PAX|undefined => {
  return paxIdMap.get(id);
};

const convertPinnypals3EventsToPAXEvent = (events: Pinnypals3Event[]): PAXEvent[] => {
  return events.map((event: Pinnypals3Event) => {
    if (!paxSubtypeMap.has(event.subType)) {
      throw new Error('Unknown PAX event type: ' + event.subType);
    }
    const outputPax: PAXEvent = {
      colour: event.colour,
      endDate: event.endDate,
      id: event.id,
      name: event.name,
      paxId: paxSubtypeMap.get(event.subType)!,
      startDate: event.startDate,
      year: event.year,
    };
    return outputPax;
  });
};

const convertPinnypals3PinDataToPin = (pins: Pinnypals3PinData[]): Pin[] => {
  return pins.map((pin: Pinnypals3PinData) => {
    const outputPin: Pin = {
      alternate: undefined,
      id: pin.id,
      image_name: stripPathFromImageLocation(pin.imageUrl),
      name: pin.name,
      pax_id: pin.eventId,
      set_id: pin.setId ?? null,
      sub_set_id: null,
      year: pin.year,
    };
    if (pin.variantYears.filter((y) => y != pin.year).length > 1) {
      console.warn(`Pin ${pin.id} has multiple years: ${pin.variantYears.join(', ')}`);
    }
    return outputPin;
  });
};

const convertPinnypals3SetDataToSet = (sets: Pinnypals3PinSet[], pins: Pinnypals3PinData[]): PinSet[] => {
  return sets.map((set: Pinnypals3PinSet) => {
    const setYear: PublishYear|undefined = pins.find((pin) => pin.setId === set.id)?.year ?? undefined;
    const outputSet: Partial<PinSet> = {
      id: set.id,
      name: set.name,
      year: setYear,
    };

    return outputSet as PinSet;
  });
};

export const requestToDataSet = (json: Pinnypals3ItemDataRequest): PinCollectionData => {
  const events: PAXEvent[] = convertPinnypals3EventsToPAXEvent(json.events);
  const pins: Pin[] = convertPinnypals3PinDataToPin(json.pins);
  const sets: PinSet[] = convertPinnypals3SetDataToSet(json.sets, json.pins);

  const converted: PinCollectionData = {
    events: events,
    pax: pax,
    pins: pins,
    sets: sets,
  };
  return converted;
};
