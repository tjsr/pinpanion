import {
  GroupTypes,
  PAX,
  PAXEvent,
  PAXId,
  Pin,
  PinCategory,
  PinCategoryId,
  PinGroup,
  PinSet,
  PublishYear
} from '../types.js';
import {
  Pinnypals3ItemDataEvent,
  Pinnypals3ItemDataGroup,
  Pinnypals3ItemDataPin,
  Pinnypals3ItemDataRequest,
  Pinnypals3ItemDataSet,
  PinnypalsDataError,
  PinnypalsPinDataError,
  checkEventSubtype
} from './pinnypals3types.js';

import { stripPathFromImageLocation } from '../utils.js';

export interface PinCollectionData {
  categories: PinCategory[];
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

// const paxSubtypeMap: Map<string, PAXId> = new Map<string, PAXId>([
//   ['PAX_WEST', 1],
//   ['PAX_EAST', 2],
//   ['PAX_AUS', 3],
//   ['PAX_DEV', 4],
//   ['PAX_UNPLUGGED', 5],
//   ['PAX_ONLINE', 6],
//   ['PAX_SOUTH', 7],
// ]);

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
  if (event.type === undefined) {
    throw new MalformedPinnypalsData('Missing PAX type property on Pinnypals3Event element');
  }
  checkEventSubtype(event);

  const outputPax: PAXEvent = {
    colour: event.colour || '#000000',
    endDate: event.endDate,
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    subType: event.subType,
    type: event.type,
    year: event.year,
  };
  return outputPax;
};

export const convertPinnypals3ItemDataEventsToPAXEvent = (events: Pinnypals3ItemDataEvent[]): PAXEvent[] => {
  return events.map(convertPinnypals3ItemDataEventToPAXEvent);
};

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const getPinnypals3SetById = (sets: Pinnypals3PinSet[], setId: number): Pinnypals3PinSet => {
//   const set: Pinnypals3PinSet|undefined = sets.find((s) => s.id === setId);
//   if (set === undefined) {
//     throw new Error(`Set ${setId} not found`);
//   }
//   return set;
// };

// const paxIdFromEventId = (eventId: PAXEventId|undefined, events: PAXEvent[]): PAXId|null => {
//   if (eventId === undefined) {
//     return null;
//   }
//   const event: PAXEvent|undefined = events.find((e) => e.id === eventId);
//   if (event === undefined) {
//     throw new Error(`Event ${eventId} not found`);
//   }
//   return event.paxId;
// };

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

const applyKnownFixes = (pin: Pin): boolean => {
  if (pin.id == 1648) {
    pin.paxEventId = 0;
    console.warn(`Pin ${pin.id} has missing category/event, so applying to 0.`);
    return true;
  }
  return false;
};

export const convertPinnypals3ItemDataPinsDataToPins = (
  pins: Pinnypals3ItemDataPin[],
  groups: Pinnypals3ItemDataGroup[]
): Pin[] => {
  return pins.map((pin: Pinnypals3ItemDataPin) => {
    groups.find((g) => g.id === pin.groupId);
    const outputPin: Pin = {
      alternate: undefined,
      categoryIds: [...pin.categoryIds],
      groupId: pin.groupId,
      id: pin.id,
      image_name: pin.imageUrl ? stripPathFromImageLocation(pin.imageUrl) : null,
      name: pin.name,
      paxEventId: pin.eventId,
      // paxId: paxIdFromEventId(pin.eventId, events),
      setId: pin.setId ?? null,
      year: pin.year,
    };
    if (!pin.categoryIds || pin.categoryIds.length === 0) {
      if (!pin.eventId && !pin.groupId && !pin.setId) {
        if (applyKnownFixes(outputPin)) {
          console.log(`Pin ${pin.id} had a pre-identified fix applied.`);
        } else {
          throw new PinnypalsPinDataError('Pin has no EventID, GroupID, SetID or CategoryID', pin);
        }
      }
      // if (outputPin.paxId) {
      //   if (!outputPin.categoryIds.includes(paxCategoryId)) {
      //     outputPin.categoryIds.push(paxCategoryId);
      //   }
      // } else
      // if (!pin.groupId) {
      //   throw new PinnypalsPinDataError(`Pin ${pin.id} must have at least one cateogryId`, pin);
      // }
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
  const paxCategoryId: PinCategoryId|undefined = json.categories.find((c) => c.name === 'PAX')?.id;
  if (!paxCategoryId) {
    throw new PinnypalsDataError('Pinnypals input data must include a category for PAX events');
  }
  const events: PAXEvent[] = convertPinnypals3ItemDataEventsToPAXEvent(json.events);
  const pins: Pin[] = convertPinnypals3ItemDataPinsDataToPins(json.pins, json.groups);
  const sets: PinSet[] = convertPinnypals3ItemDataSetsDataToSets(json.sets, json.pins);
  const groups: PinGroup[] = json.groups.map(convertPinnypals3ItemDataGroupToPinGroup);
  const categories: PinCategory[] = json.categories;

  const converted: PinCollectionData = {
    categories: categories,
    events: events,
    groups: groups,
    pax: pax,
    pins: pins,
    sets: sets,
  };
  return converted;
};
