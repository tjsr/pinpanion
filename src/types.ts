import type {
  Pinnypals3EventSubtypes,
  Pinnypals3EventTypes,
  Pinnypals3PinCategory,
} from './pinnypals/pinnypals3types.ts';

type uuid = string;
export type UserId = uuid;
export type PAXId = number;
export type PAXEventId = number;
export type PublishYear = number;
export type PinSetId = number;
export type PinGroupId = number;
export type PinCategoryId = number;
export type HexColourCode = string;
export type ISO8601Date = string;
export type PinId = number;

export interface YearAndIdComparable {
  id: number;
  year: PublishYear | undefined;
}

export type GroupTypes = 'STAFF' | 'SHOW' | 'BLINDBOX' | 'OTHER';

export interface PinGroup {
  id: PinGroupId;
  imageUrl?: string;
  name: string;
  notes?: string;
  type?: GroupTypes;
}

export interface Pin extends YearAndIdComparable {
  alternate?: string | null | undefined;
  categoryIds: PinCategoryId[];
  groupId?: PinGroupId;
  id: PinId;
  image_name: string | null;
  name: string;
  // paxId: PAXId|null;
  paxEventId?: PAXEventId;
  setId: PinSetId | null;
  year: PublishYear;
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
  pins: Pin[];
  success: boolean;
};

export type PinSelectionList = {
  availableIds: PinId[];
  availableSetIds: PinSetId[];
  id: string;
  name: string;
  ownerId: UserId;
  revision: number;
  wantedIds: PinId[];
  wantedSetIds: PinSetId[];
};

export type PaxType = Pinnypals3EventSubtypes;

export interface PinListFilter {
  endYear?: PublishYear;
  filterText?: string;
  paxEventId?: PAXEventId;
  paxType?: PaxType;
  pinSetId?: PinSetId;
  selectedPinsOnly?: boolean;
  setPinsOnly?: boolean;
  startYear?: PublishYear;
}

export type PAX = {
  id: PAXId;
  name: string;
  shortName?: string;
  styleName?: string;
};

export type PAXEventDisplayTypes = {
  cssClass: string;
  description: string;
  id: PAXId;
};

export type PAXEvent = {
  colour: HexColourCode;
  endDate: ISO8601Date;
  id: PAXEventId;
  name: string;
  startDate: ISO8601Date;
  subType: PaxType;
  type: Pinnypals3EventTypes;
  year: PublishYear;
};

type PinSetVariant = [PinSetId, PublishYear];

export interface PinSet extends YearAndIdComparable {
  id: PinSetId;
  image_name: string;
  isPackagedSet: boolean;
  isReprint: boolean;
  name: string;
  subSetId?: PinSetId;
  variants: PinSetVariant[];
  year: PublishYear | undefined;
}

export type PinCategory = Pinnypals3PinCategory;

export type VariantType = 'text' | 'outlined' | 'contained' | undefined;

export type SizesType = 'tiny' | 'sm' | 'normal' | 'large';

export interface ConfigType {
  imageCacheDir: string;
  imagePrefix: string;
  maxYear: number;
  minYear: number;
  pinnypals1?: string;
  pinnypals1ImagePrefix?: string;
  pinnypals2?: string;
  pinnypals2ImagePrefix?: string;
  pinnypals3: string;
  pinnypals3ImagePrefix: string;
  pinpanionImagePrefix: string;
  proxy: string;
  reverseYears: boolean;
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
