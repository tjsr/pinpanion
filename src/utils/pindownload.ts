import { ALL_PINS_URL3, PINNYPALS3_IMAGE_PREFIX } from '../defaults.ts';
import type { ConfigType, Pin, PinnypalsPinsRequest } from '../types.ts';
import { InvalidPathError, validateOutputPath } from './pathUtils.ts';
import fetch, { Response } from 'node-fetch';

import type { PinCollectionData } from '../pinnypals/pinnypals3convertor.ts';
import type { Pinnypals2PinsRequest } from '../pinnypals/pinnypals2types.ts';
import type { Pinnypals3ItemDataRequest } from '../pinnypals/pinnypals3types.ts';
import type { PinCollectionData as V2PinCollectionData } from '../pinnypals/pinnypals2convertor.ts';
import fs from 'fs';
import path from 'path';
import { requestToDataSet as pp2requestToDataSet } from '../pinnypals/pinnypals2convertor.ts';
import { requestToDataSet as pp3requestToDataSet } from '../pinnypals/pinnypals3convertor.ts';
import { stripPathFromImageLocation } from '../utils.ts';

const DOWNLOAD_ALL = true;
// import configJson from '../config.json';
const TEST_MODE = process.env.TEST_MODE == 'true' || process.env.NODE_ENV === 'test';
const DEFAULT_IMAGE_LIMIT = TEST_MODE ? 10 : -1;
const LIMIT_IMAGE_DOWNLOADS = TEST_MODE && !DOWNLOAD_ALL ? DEFAULT_IMAGE_LIMIT : -1;
const skipImages = process.env.SKIP_ALL_IMAGES === 'true';

const printSkipMessages = process.env.PRINT_SKIPPED_IMAGES == 'true';
// const LIMIT_PINNYPALS_DOWNLOADS = 10;

const configFile = 'src/config.json';
if (!fs.existsSync(configFile)) {
  throw Error(`Config file does not exist at ${configFile}`);
}
const config: ConfigType = JSON.parse(fs.readFileSync(configFile).toString());

const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  const dirName: string = path.dirname(outputPath);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName);
    console.debug(`Created directory ${dirName}`);
  }

  const res: Response = await fetch(url);
  if (res.status >= 400) {
    console.debug(`Failed to download ${url} - status ${res.status}`);
    return Promise.reject(new Error(`Failed to download ${url} - status ${res.status}`));
  } else {
    const fileStream = fs.createWriteStream(outputPath);
    return new Promise((resolve, reject) => {
      res.body?.pipe(fileStream);
      res.body?.on('error', reject);
      fileStream.on('finish', resolve);
    });
  }
};

let globalDestinationPath: string = config.imageCacheDir;
if (process.argv && process.argv.length > 1 && process.argv[2] !== undefined) {
  globalDestinationPath = process.argv[2];
}

globalDestinationPath = path.resolve(globalDestinationPath);
const PINNYPALS_VERSION = process.env.PINNYPALS_VERSION ? parseInt(process.env.PINNYPALS_VERSION) : 3;

const versionFields = [
  {
    imagePrefix: 'pinnypals1ImagePrefix',
    requestUrl: 'pinnypals1',
    version: 1,
  },
  {
    imagePrefix: 'pinnypals2ImagePrefix',
    requestUrl: 'pinnypals2',
    version: 2,
  },
  {
    imagePrefix: 'pinnypals3ImagePrefix',
    requestUrl: 'pinnypals3',
    version: 3,
  },
];

const versionFieldsToUse = versionFields.filter((p) => p.version === PINNYPALS_VERSION)[0];
const pinnypalsPinRequestUrl: string = (config as any)[versionFieldsToUse.requestUrl] || ALL_PINS_URL3;
const pinpanionImagePrefix: string = config.pinpanionImagePrefix;
const pinnypalsImagePrefix: string = (config as any)[versionFieldsToUse.imagePrefix] || PINNYPALS3_IMAGE_PREFIX;
console.log(`Pinnypals version ${PINNYPALS_VERSION} request URL:`, pinnypalsPinRequestUrl);

const PINNYPALS_PINS_CACHE_FILE = process.env.PINNYPALS_PINS_CACHE_FILE || 'public/pinnypalpins.json';
const PINPANION_PINS_CACHE_FILE = process.env.PINPANION_PINS_CACHE_FILE || 'public/pins.json';

const parsePinnypalData = (data: unknown): Pin[] => {
  if (LIMIT_IMAGE_DOWNLOADS > -1) {
    console.warn(`Pin images limited to id < ${LIMIT_IMAGE_DOWNLOADS}`);
  }
  let pins: Pin[] = [];
  if (PINNYPALS_VERSION === 1) {
    const ppd: PinnypalsPinsRequest = data as PinnypalsPinsRequest;
    if (LIMIT_IMAGE_DOWNLOADS > -1) {
      pins = ppd.pins.filter((p) => p.id < LIMIT_IMAGE_DOWNLOADS);
    }
  } else if (PINNYPALS_VERSION === 2) {
    const pp2d: V2PinCollectionData = pp2requestToDataSet(data as Pinnypals2PinsRequest);
    if (LIMIT_IMAGE_DOWNLOADS > -1) {
      pins = pp2d.pins.filter((p) => p.id < LIMIT_IMAGE_DOWNLOADS);
      console.warn(
        'Pinnypals V2',
        `Pin image downloads limited to first ${LIMIT_IMAGE_DOWNLOADS} pins - ${pp2d.pins.length} total`
      );
    } else {
      console.log(
        'Pinnypals V2',
        `Pin data contained ${pp2d.pins.length} pins, ${pp2d.sets.length} sets and ${pp2d.pax.length} PAX events`
      );
      pins = pp2d.pins;
    }
  } else {
    const pp3d: PinCollectionData = pp3requestToDataSet(data as Pinnypals3ItemDataRequest);
    if (LIMIT_IMAGE_DOWNLOADS > -1) {
      pins = pp3d.pins.filter((p) => p.id < LIMIT_IMAGE_DOWNLOADS);
      console.warn(
        'Pinnypals V3',
        `Pin image downloads limited to first ${LIMIT_IMAGE_DOWNLOADS} pins - ${pp3d.pins.length} total`
      );
    } else {
      console.log(
        'Pinnypals V3',
        `Pin data contained ${pp3d.pins.length} pins, ${pp3d.sets.length} sets and ${pp3d.pax.length} PAX events`
      );
      pins = pp3d.pins;
    }
  }
  return pins;
};

const useLocalCachedData = (): Pin[] => {
  const dataString = fs.readFileSync(PINNYPALS_PINS_CACHE_FILE, 'utf-8');
  const data = JSON.parse(dataString);
  const pins: Pin[] = parsePinnypalData(data);
  return pins;
};

const fetchAndCachePinnypalData = async (): Promise<Pin[]> => {
  const response = await fetch(pinnypalsPinRequestUrl);
  const data = await response.json();

  const pins: Pin[] = parsePinnypalData(data);

  const pinnypalPinData: string = JSON.stringify(data);
  fs.writeFileSync(PINNYPALS_PINS_CACHE_FILE, pinnypalPinData, 'utf-8');
  console.log(
    'Pinnypals cache data',
    `Wrote ${pinnypalPinData.length} bytes of updated JSON to ${PINNYPALS_PINS_CACHE_FILE}`
  );

  const pp3d: PinCollectionData = pp3requestToDataSet(data as Pinnypals3ItemDataRequest);
  const pinpanionData: string = JSON.stringify(pp3d);
  fs.writeFileSync(PINPANION_PINS_CACHE_FILE, pinpanionData, 'utf-8');
  console.log(
    'Pinpanion cache data',
    `Wrote ${pinpanionData.length} bytes of updated JSON to ${PINPANION_PINS_CACHE_FILE}`
  );
  return pins;
};

const downloadPinImageFromPinpanion = (pinpanionUrl: string, outputFilePath: string): Promise<boolean> => {
  console.debug('Pinpanion data', `Downloading ${pinpanionUrl} to ${outputFilePath}`);

  return downloadFile(pinpanionUrl, outputFilePath).then(() => {
    console.log('Pinpanion data', `Downloaded ${pinpanionUrl} to ${outputFilePath}`);
    return true;
  });
};

const downloadPinImageFromPinnypals = (pinnypalsUrl: string, outputFilePath: string): Promise<boolean> => {
  return downloadFile(pinnypalsUrl, outputFilePath)
    .then(() => {
      console.log(`Pinnypals data - Downloaded ${pinnypalsUrl} to ${outputFilePath}`);
      return true;
    })
    .catch((err) => {
      console.error(`Pinnypals data - Error downloading ${pinnypalsUrl} to ${outputFilePath}: ${err}`);
      throw err;
    });
};

type DownloadSource = 'cache' | 'pinpanion' | 'pinnypals' | undefined;

const downloadImageForPin = async (
  pinpanionImageLocationPrefix: string,
  pinnypalsImageLocationPrefix: string,
  destinationPath: string,
  pin: Pin
): Promise<DownloadSource> => {
  if (!pin.image_name) {
    throw new Error(`Can't download image for Pin ${pin.id} (${pin.name}) which has no image value.`);
  }
  const pinImageFilename: string = stripPathFromImageLocation(pin.image_name);

  const outputFilePath: string = path.resolve(path.join(destinationPath, pinImageFilename));
  try {
    validateOutputPath(outputFilePath);
  } catch (err) {
    if (err instanceof InvalidPathError) {
      console.error(`Invalid path for ${outputFilePath}: ${err}`);
    }
    throw err;
  }

  if (fs.existsSync(outputFilePath)) {
    if (printSkipMessages) {
      console.log(`Skipped downloading ${pinImageFilename} because ${outputFilePath} exists.`);
    }
    return Promise.resolve('cache');
  }

  const pinpanionUrl: string = pinpanionImageLocationPrefix + '/' + pinImageFilename;
  return downloadPinImageFromPinpanion(pinpanionUrl, outputFilePath)
    .then((success) => (success ? 'pinpanion' : undefined))
    .catch((downloadError) => {
      const pinnypalsUrl: string = pinnypalsImageLocationPrefix + '/' + pinImageFilename;

      console.warn(`Didn't find pin image at pinpanion prod host ${pinpanionUrl}, trying pinnypals...`, downloadError.message);
      return downloadPinImageFromPinnypals(pinnypalsUrl, outputFilePath).then((success) =>
        success ? 'pinnypals' : undefined
      );
    });
};

const cachePinImages = async (destinationPath: string, pinsToDownload: Pin[]): Promise<void> => {
  console.debug(`Caching ${pinsToDownload.length} pin images to ${globalDestinationPath}...`);

  if (!fs.existsSync(globalDestinationPath)) {
    console.log(`Creating directory ${globalDestinationPath}`);
    fs.mkdirSync(globalDestinationPath);
  }

  if (!fs.existsSync(globalDestinationPath)) {
    throw new Error(`Failed creating destination directory ${globalDestinationPath}`);
  }

  const promises: Promise<DownloadSource>[] = pinsToDownload
    .filter((pin) => pin.image_name)
    .map((p) => downloadImageForPin(pinpanionImagePrefix, pinnypalsImagePrefix, destinationPath, p));

  return Promise.allSettled(promises)
    .then((results: PromiseSettledResult<DownloadSource>[]) => {
      const hadErrors = results.filter((pr) => pr.status === 'rejected').length > 0;

      if (hadErrors) {
        console.error('Errors occurred while downloading');
        throw new Error('Errors occurred while downloading');
      }
      console.log(`Finished downloading ${results.length} images`);
    })
    .catch((err) => {
      console.error('Error downloading images:', err);
      throw err;
    });
};

const useLocal = false;
const pins: Pin[] = useLocal ? useLocalCachedData() : await fetchAndCachePinnypalData();

if (!skipImages) {
  await cachePinImages(globalDestinationPath, pins);
}
