import { GroupTypes, PAX, PAXEvent, PAXId, Pin, PinGroup, PinSet, PublishYear } from '../types.js';
import {
  Pinnypals3ItemDataEvent,
  Pinnypals3ItemDataGroup,
  Pinnypals3ItemDataPin,
  Pinnypals3ItemDataRequest,
  Pinnypals3ItemDataSet,
  Pinnypals3PinSet
} from './pinnypals3types.js';

import { stripPathFromImageLocation } from '../utils.js';

export interface PinCollectionData {
  pax: PAX[];
  events: PAXEvent[];
  pins: Pin[];
  sets: PinSet[]; // Optional<PinSet, 'isPackagedSet' | 'isReprint' | 'image_name' | 'variants'>[];
  groups: PinGroup[];
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

class MalformedPinnypalsData extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedPinnypalsData';
  }
}

export const convertPinnypals3ItemDataEventToPAXEvent = (event: Pinnypals3ItemDataEvent): PAXEvent => {
  if (!paxSubtypeMap.has(event.subType)) {
    throw new Error('Unknown PAX event type: ' + event.subType);
  }
  if (event.type === undefined) {
    throw new MalformedPinnypalsData('Missing PAX type property on Pinnypals3Event element');
  }

  const outputPax: PAXEvent = {
    colour: event.colour || '#000000',
    endDate: event.endDate,
    id: event.id,
    name: event.name,
    paxId: paxSubtypeMap.get(event.subType)!,
    startDate: event.startDate,
    year: event.year,
  };
  return outputPax;
};

export const convertPinnypals3ItemDataEventsToPAXEvent = (events: Pinnypals3ItemDataEvent[]): PAXEvent[] => {
  return events.map(convertPinnypals3ItemDataEventToPAXEvent);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPinnypals3SetById = (sets: Pinnypals3PinSet[], setId: number): Pinnypals3PinSet => {
  const set: Pinnypals3PinSet|undefined = sets.find((s) => s.id === setId);
  if (set === undefined) {
    throw new Error(`Set ${setId} not found`);
  }
  return set;
};

const paxIdFromEventId = (eventId: PAXId|undefined, events: PAXEvent[]): PAXId|undefined => {
  if (eventId === undefined) {
    return undefined;
  }
  const event: PAXEvent|undefined = events.find((e) => e.id === eventId);
  if (event === undefined) {
    throw new Error(`Event ${eventId} not found`);
  }
  return event.paxId;
};

const stringToEnum = <T extends { [s: string]: unknown; } | ArrayLike<unknown>>(
  enumObj: T, value: string): T[keyof T] | undefined => {
  return (Object.values(enumObj) as unknown as string[]).includes(value) ? value as T[keyof T] : undefined;
};

const groupTypeStringToGroupType = (value: string): GroupTypes | undefined => {
  return stringToEnum(GroupTypes, value);
};

export const convertPinnypals3ItemDataGroupToPinGroup = (group: Pinnypals3ItemDataGroup): PinGroup => (
  {
    id: group.id,
    imageUrl: group.imageUrl,
    name: group.name,
    notes: group.notes,
    type: groupTypeStringToGroupType(group.type),
  }
);

export const convertPinnypals3ItemDataPinsDataToPins = (
  pins: Pinnypals3ItemDataPin[],
  events: PAXEvent[],
  groups: Pinnypals3ItemDataGroup[]
): Pin[] => {
  return pins.map((pin: Pinnypals3ItemDataPin) => {
    groups.find((g) => g.id === pin.groupId);
    const outputPin: Pin = {
      alternate: undefined,
      group_id: pin.groupId,
      id: pin.id,
      image_name: pin.imageUrl ? stripPathFromImageLocation(pin.imageUrl) : null,
      name: pin.name,
      pax_event_id: pin.eventId,
      pax_id: paxIdFromEventId(pin.eventId, events),
      set_id: pin.setId ?? null,
      sub_set_id: null,
      year: pin.year,
    };
    if (pin.eventId === undefined) {
      console.warn(`Pin ${pin.id} (${pin.name}) has no EventID`);
    }
    if (pin.variantYears.filter((y) => y != pin.year).length > 1) {
      console.warn(`Pin ${pin.id} has multiple years: ${pin.variantYears.join(', ')}`);
    }
    return outputPin;
  });
};

export const convertPinnypals3ItemDataSetsDataToSets = (
  sets: Pinnypals3ItemDataSet[], pins: Pinnypals3ItemDataPin[]
): PinSet[] => {
  return sets.map((set: Pinnypals3ItemDataSet) => {
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
  const events: PAXEvent[] = convertPinnypals3ItemDataEventsToPAXEvent(json.events);
  const pins: Pin[] = convertPinnypals3ItemDataPinsDataToPins(json.pins, events, json.groups);
  const sets: PinSet[] = convertPinnypals3ItemDataSetsDataToSets(json.sets, json.pins);
  const groups: PinGroup[] = json.groups.map(convertPinnypals3ItemDataGroupToPinGroup);

  const converted: PinCollectionData = {
    events: events,
    groups: groups,
    pax: pax,
    pins: pins,
    sets: sets,
  };
  return converted;
};
