export type Pin = {
  id: number;
  name: string;
  set_id: number | null;
  sub_set_id: number | null;
  year: number;
  pax_id: number;
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
  availableIds: number[];
  wantedIds: number[];
  revision: number;
  editable: boolean;
};

export type PinListFilter = {
  startYear?: number;
  endYear?: number;
  setPinsOnly?: boolean;
  selectedPinsOnly?: boolean;
  paxId?: number;
  pinSetId?: number;
  filterText?: string;
};

export type PAX = {
  id: number;
  name: string;
};

export type PinSet = {
  id: number;
  name: string;
  year: number;
};

export type VariantType = 'text' | 'outlined' | 'contained' | undefined;

export type SizesType = 'tiny' | 'sm' | 'normal' | 'large';

export interface ConfigType {
  pinnypals: string,
  proxy: string,
  pinnypalsImagePrefix: string,
  imagePrefix: string,
  imageCacheDir: string,
  minYear: number,
  maxYear: number,
  reverseYears: boolean
}
