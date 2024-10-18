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
  type: Pinnypals3EventTypes;
  subType: Pinnypals3EventSubtypes;
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

import { components, paths } from './pp3schema';

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
export type Pinnypald3PinCategory = components['schemas']['CategorySummaryDto'];

export class PinnypalsDataError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class PinnypalsPinDataError extends PinnypalsDataError {
  _inputPin: Pinnypals3ItemDataPin;
  constructor(message: string, inputPin: Pinnypals3ItemDataPin) {
    super(message);
    this._inputPin = inputPin;
  }
}

export class PinnypalsEventSubtypeError extends PinnypalsDataError {
  _inputEvent: Pinnypals3ItemDataEvent;
  _subtype: string;
  constructor(subtype: string, inputEvent: Pinnypals3ItemDataEvent) {
    super('Invalid event subtype: ' + subtype);
    this._inputEvent = inputEvent;
    this._subtype = subtype;
  }
}

export const checkEventSubtype = (inputEvent: Pinnypals3ItemDataEvent): void => {
  if (inputEvent.subType === undefined ||
    !['PAX_WEST', 'PAX_EAST', 'PAX_AUS', 'PAX_SOUTH', 'PAX_UNPLUGGED', 'PAX_ONLINE'].includes(inputEvent.subType)) {
    throw new PinnypalsEventSubtypeError(inputEvent.subType, inputEvent);
  }
};
