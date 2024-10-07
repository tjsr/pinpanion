type PaxId = number;
type SetId = number;
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
  eventId: PaxId;
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
  id: PaxId;
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

export interface Pinnypals3ItemDataRequest {
  pins: Pinnypals3PinData[];
  sets: Pinnypals3PinSet[];
  categories: Pinnypals3Category[];
  events: Pinnypals3Event[]
  groups: Pinnypals3Group[];
}

