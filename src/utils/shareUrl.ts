import { PinSelectionList } from '../types';
import { encodePinSelectionHash } from './encodePinSelectionList';

const devIp = '127.0.0.1';

export const createShareUrl = (psl: PinSelectionList, offlineMode?: boolean): string => {
  const collectionShareParams: string = encodePinSelectionHash(psl, offlineMode);

  if (window.location.hostname === 'localhost') {
    // We need to use 127 as android QR code scanners block 'localhost' as a string in the host.
    if (window.location.protocol === 'https:' && window.location.port !== '443') {
      return `https://${devIp}:${window.location.port}/#${collectionShareParams}`;
    }
    if (window.location.protocol === 'http:' && window.location.port !== '80') {
      return `http://${devIp}:${window.location.port}/#${collectionShareParams}`;
    }
    return `${window.location.protocol}//${devIp}/#${collectionShareParams}`;
  }
  return `${window.location.protocol}//${window.location.host}/#${collectionShareParams}`;
};
