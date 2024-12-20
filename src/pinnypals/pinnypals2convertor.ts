import { PAX, PAXId, Pin, PinSet, PinSetId } from '../types.js';
import {
  Pinnypals2EventsArray,
  Pinnypals2PaxIdentifier,
  Pinnypals2PinIdentifier,
  Pinnypals2PinsArray,
  Pinnypals2PinsRequest,
  Pinnypals2SetIdentifier,
  Pinnypals2SetsArray
} from './pinnypals2types.js';

export interface PinCollectionData {
  pax: PAX[];
  pins: Pin[];
  sets: PinSet[];
}

const extractPAXs = (paxArray: Pinnypals2EventsArray): PAX[] =>
  paxArray.map((pax: Pinnypals2PaxIdentifier) => {
    const outputPax: PAX = {
      id: pax[0],
      name: pax[2],
      shortName: pax[1],
    };
    return outputPax;
  });

// [
//   1,
//   "Flesh Reaper",
//   "pins/2013-pax-core-flesh-reaper.webp",
//   2013,
//   0,
//   [
//       [
//           65,
//           2012
//       ]
//   ],
//   4,
//   1,
//   0
// ]

interface Pinnypals2PinData {
  pax_id: PAXId;
  sub_set_id: PinSetId|null;
}

const extractPins = (pinArray: Pinnypals2PinsArray): Pin[] =>
  pinArray.map((pin: Pinnypals2PinIdentifier) => {
    const outputPin: Pin & Pinnypals2PinData = {
      alternate: '',
      categoryIds: [],
      id: pin[0],
      image_name: pin[2],
      name: pin[1],
      pax_id: pin[6],
      setId: pin[7],
      sub_set_id: null,
      year: pin[3],
    };
    return outputPin as Pin;
  });

const extractPinSets = (pinSetArray: Pinnypals2SetsArray): PinSet[] =>
  pinSetArray.map((pinSet: Pinnypals2SetIdentifier) => {
    const outputSet: PinSet = {
      id: pinSet[0],
      image_name: pinSet[6],
      isPackagedSet: pinSet[5] == 1,
      isReprint: pinSet[3] > 0,
      name: pinSet[1],
      subSetId: pinSet[7],
      variants: pinSet[4],
      year: pinSet[2],
    };
    return outputSet;
  });

export const requestToDataSet = (json: Pinnypals2PinsRequest): PinCollectionData => {
  const paxes: PAX[] = extractPAXs(json[0]);
  const pins: Pin[] = extractPins(json[1]);
  const sets: PinSet[] = extractPinSets(json[2]);
  const converted: PinCollectionData = {
    pax: paxes,
    pins: pins,
    sets: sets,
  };
  return converted;
};
