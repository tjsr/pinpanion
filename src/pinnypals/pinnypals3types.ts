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
  id: PinId;
  name: string;
  year: number;
  setId?: SetId;
  eventId?: PaxEventId;
  variantYears: Year[];
  categoryIds: CategoryId[];
  imageUrl: ImageLocation;
}

export interface Pinnypals3PinSet {
  id: SetId;
  name: string;
  imageUrl: ImageLocation;
}

export interface Pinnypals3Category {
  id: CategoryId;
  name: string;
  colour: HexColourCode;
}

export interface Pinnypals3Event {
  id: PaxEventId;
  name: string;
  type: string;
  subType: string;
  colour: HexColourCode;
  year: Year;
  startDate: ISO8601Date;
  endDate: ISO8601Date;
}

export interface Pinnypals3Group {
  id: GroupId;
  name: string;
  type: string;
}

export interface Pinnypals3ItemDataRequestOld {
  pins: Pinnypals3PinData[];
  sets: Pinnypals3PinSet[];
  categories: Pinnypals3Category[];
  events: Pinnypals3Event[]
  groups: Pinnypals3Group[];
}

import { paths } from './pp3schema';

export type Pinnypals3ItemDataRequest = paths['/item-data']['get']['responses'][200]['content']['application/json'];
export type Pinnypals3SetCollectionRequest = paths['/sets']['get']['responses'][200]['content']['application/json'];
export type Pinnypals3ItemDataEvent = Pinnypals3ItemDataRequest['events'][0];
export type Pinnypals3ItemDataPin = Pinnypals3ItemDataRequest['pins'][0];
export type Pinnypals3ItemDataSet = Pinnypals3ItemDataRequest['sets'][0];
export type Pinnypals3ItemDataGroup = Pinnypals3ItemDataRequest['groups'][0];

export type Pinnypals3Set = paths['/sets']['get']['responses'][200]['content']['application/json'][0];
