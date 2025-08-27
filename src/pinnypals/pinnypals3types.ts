type SetId = number;
type PaxEventId = number;
type PinId = number;
type CategoryId = number;
type Year = number;
type ImageLocation = string;
type GroupId = number;
type HexColourCode = string;
type ISO8601Date = string;

export interface Pinnypals3PinData {
  categoryIds: CategoryId[];
  eventId?: PaxEventId;
  id: PinId;
  imageUrl: ImageLocation;
  name: string;
  setId?: SetId;
  variantYears: Year[];
  year: number;
}

export interface Pinnypals3PinSet {
  id: SetId;
  imageUrl: ImageLocation;
  name: string;
}

// export interface Pinnypals3Category {
//   colour: HexColourCode;
//   id: CategoryId;
//   name: string;
//   slug: string;
//   type: Pinnypals3CategoryType;
// }

export interface Pinnypals3Event {
  colour: HexColourCode;
  endDate: ISO8601Date;
  id: PaxEventId;
  name: string;
  startDate: ISO8601Date;
  subType: Pinnypals3EventSubtypes;
  type: Pinnypals3EventTypes;
  year: Year;
}

export interface Pinnypals3Group {
  id: GroupId;
  name: string;
  type: string;
}

export interface Pinnypals3ItemDataRequestOld {
  categories: Pinnypals3PinCategory[];
  events: Pinnypals3Event[];
  groups: Pinnypals3Group[];
  pins: Pinnypals3PinData[];
  sets: Pinnypals3PinSet[];
}

import type { components, paths } from './pp3schema.d.ts';

export type Pinnypals3ItemDataRequest = paths['/item-data']['get']['responses'][200]['content']['application/json'];
export type Pinnypals3SetCollectionRequest = paths['/sets']['get']['responses'][200]['content']['application/json'];
export type Pinnypals3ItemDataEvent = Pinnypals3ItemDataRequest['events'][0];
export type Pinnypals3ItemDataPin = Pinnypals3ItemDataRequest['pins'][0];
export type Pinnypals3ItemDataSet = Pinnypals3ItemDataRequest['sets'][0];
export type Pinnypals3ItemDataGroup = Pinnypals3ItemDataRequest['groups'][0];

export type Pinnypals3Set = paths['/sets']['get']['responses'][200]['content']['application/json'][0];

export type Pinnypals3EventDTO = components['schemas']['EventDto'];
export type Pinnypals3EventTypes = Pinnypals3EventDTO['type'];
export type Pinnypals3EventSubtypes = Pinnypals3EventDTO['subType'];
export type Pinnypals3PinCategory = components['schemas']['CategoryDto'];
export type Pinnypals3CategoryType = Pinnypals3PinCategory['type'];
