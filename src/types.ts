type uuid = string;
export type UserId = uuid;
type PAXId = number;
type PublishYear = number;
type PinSetId = number;
type PinId = number;

export type Pin = {
  id: PinId;
  name: string;
  set_id: PinSetId | null;
  sub_set_id: number | null;
  year: PublishYear;
  pax_id: PAXId;
  alternate: string;
  image_name: string;
};

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
};
type PinSetVariant = [PinSetId, PublishYear];

export type PinSet = {
  id: PinSetId;
  isReprint: boolean,
  name: string;
  year: PublishYear;
  isPackagedSet: boolean;
  sub_set_id?: PinSetId;
  image_name: string;
  variants: PinSetVariant[]
};

export type VariantType = 'text' | 'outlined' | 'contained' | undefined;

export type SizesType = 'tiny' | 'sm' | 'normal' | 'large';

export interface ConfigType {
  pinnypals1?: string;
  pinnypals2: string;
  proxy: string;
  pinnypals1ImagePrefix?: string;
  pinnypals2ImagePrefix: string;
  pinpanionImagePrefix: string;
  imagePrefix: string;
  imageCacheDir: string;
  minYear: number;
  maxYear: number;
  reverseYears: boolean;
}
