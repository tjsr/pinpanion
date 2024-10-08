type uuid = string;
export type UserId = uuid;
export type PAXId = number;
export type PAXEventId = number;
export type PublishYear = number;
export type PinSetId = number;
export type HexColourCode = string;
export type ISO8601Date = string;
type PinId = number;

export interface YearAndIdComparable {
  id: number;
  year: PublishYear | undefined;
}

export interface Pin extends YearAndIdComparable {
  id: PinId;
  name: string;
  set_id: PinSetId | null;
  sub_set_id: number | null;
  year: PublishYear;
  pax_id: PAXId;
  alternate?: string | null | undefined;
  image_name: string;
}

export type Collection = {
  wanted: PinRequest[];
};

export type PinRequest = {
  pin: Pin;
  points: number;
  quantity: number;
};

export type PinnypalsPinsRequest = {
  success: boolean;
  pins: Pin[];
};

export type PinSelectionList = {
  name: string;
  id: string;
  availableIds: PinId[];
  wantedIds: PinId[];
  revision: number;
  ownerId: UserId;
  availableSetIds: PinSetId[];
  wantedSetIds: PinSetId[];
};

export type PinListFilter = {
  startYear?: PublishYear;
  endYear?: PublishYear;
  setPinsOnly?: boolean;
  selectedPinsOnly?: boolean;
  paxId?: PAXId;
  pinSetId?: PinSetId;
  filterText?: string;
};

export type PAX = {
  id: PAXId;
  name: string;
  shortName?: string;
  styleName?: string;
};

export type PAXEvent = {
  id: PAXEventId;
  name: string;
  paxId: PAXId;
  colour: HexColourCode;
  year: PublishYear;
  startDate: ISO8601Date;
  endDate: ISO8601Date;
}

type PinSetVariant = [PinSetId, PublishYear];

export interface PinSet extends YearAndIdComparable {
  id: PinSetId;
  isReprint: boolean,
  name: string;
  year: PublishYear | undefined;
  isPackagedSet: boolean;
  sub_set_id?: PinSetId;
  image_name: string;
  variants: PinSetVariant[]
}

export type VariantType = 'text' | 'outlined' | 'contained' | undefined;

export type SizesType = 'tiny' | 'sm' | 'normal' | 'large';

export interface ConfigType {
  pinnypals1?: string;
  pinnypals2?: string;
  pinnypals3: string;
  proxy: string;
  pinnypals1ImagePrefix?: string;
  pinnypals2ImagePrefix?: string;
  pinnypals3ImagePrefix: string;
  pinpanionImagePrefix: string;
  imagePrefix: string;
  imageCacheDir: string;
  minYear: number;
  maxYear: number;
  reverseYears: boolean;
}
