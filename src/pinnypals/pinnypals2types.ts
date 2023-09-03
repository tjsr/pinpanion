type PaxId = number;
type SetId = number;
type PinId = number;
type Year = number;
type ImageLocation = string;
export type Pinnpypals2SetAlternative = [SetId, Year];
export type Pinnypals2PaxIdentifier = [PaxId, string, string];
export type Pinnypals2PinIdentifier = [
  PinId,
  string,
  ImageLocation,
  Year,
  number,
  Pinnpypals2SetAlternative[],
  PaxId,
  SetId,
  number
];

// [
//   108,
//   "Aus Core 2020",
//   2020,
//   0,
//   [],
//   1,
//   "sets/2020-aus-core_410.webp",
//   0
// ],
export type Pinnypals2SetIdentifier = [
  SetId,
  string,
  Year,
  number,
  Pinnpypals2SetAlternative[],
  number,
  ImageLocation,
  number
];

export type Pinnypals2EventsArray = Pinnypals2PaxIdentifier[];
export type Pinnypals2PinsArray = Pinnypals2PinIdentifier[];
export type Pinnypals2SetsArray = Pinnypals2SetIdentifier[];

export type Pinnypals2PinsRequest = [Pinnypals2EventsArray, Pinnypals2PinsArray, Pinnypals2SetsArray];
