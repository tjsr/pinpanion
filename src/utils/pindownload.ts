import { ALL_PINS_URL1, PINNYPALS1_IMAGE_PREFIX } from '../defaults';
import { ConfigType, Pin, PinnypalsPinsRequest } from '../types';
import { PinCollectionData, requestToDataSet } from '../pinnypals/pinnypals2convertor';
import fetch, { Response } from 'node-fetch';

import { Pinnypals2PinsRequest } from '../pinnypals/pinnypals2types';
import fs from 'fs';
import path from 'path';

// import configJson from '../config.json';
const TEST_MODE = process.env.TEST_MODE == 'true';
const DEFAULT_IMAGE_LIMIT = TEST_MODE ? 10 : -1;
const LIMIT_IMAGE_DOWNLOADS = TEST_MODE ? DEFAULT_IMAGE_LIMIT : -1;

const configFile = 'src/config.json';
if (!fs.existsSync(configFile)) {
  throw Error(`Config file does not exist at ${configFile}`);
}
const config: ConfigType = JSON.parse(fs.readFileSync(configFile).toString());

const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  const dirName: string = path.dirname(outputPath);
  if (!fs.existsSync(dirName)) {
    console.debug(`Created directory ${dirName}`);
    fs.mkdirSync(dirName);
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

let destinationPath: string = config.imageCacheDir;
if (process.argv && process.argv.length > 1 && process.argv[2] !== undefined) {
  destinationPath = process.argv[2];
}

destinationPath = path.resolve(destinationPath);
const PINNYPALS_VERSION = process.env.PINNYPALS_VERSION ? parseInt(process.env.PINNYPALS_VERSION) : 2;

const pinnypalsPinRequestUrl: string = PINNYPALS_VERSION === 1 ? config.pinnypals1 || ALL_PINS_URL1 : config.pinnypals2;
const pinpanionImagePrefix: string = config.pinpanionImagePrefix;
const pinnypalsImagePrefix: string =
  PINNYPALS_VERSION === 1 ? config.pinnypals1ImagePrefix || PINNYPALS1_IMAGE_PREFIX : config.pinnypals2ImagePrefix;
console.log('Pinnypals:', pinnypalsPinRequestUrl);

const PINNYPALS_PINS_CACHE_FILE = 'public/pinnypalpins.json';
const PINPANION_PINS_CACHE_FILE = 'public/pins.json';

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
  } else {
    const pp2d: PinCollectionData = requestToDataSet(data as Pinnypals2PinsRequest);
    if (LIMIT_IMAGE_DOWNLOADS > -1) {
      pins = pp2d.pins.filter((p) => p.id < LIMIT_IMAGE_DOWNLOADS);
      console.warn(`Pin image downloads limited to first ${LIMIT_IMAGE_DOWNLOADS} pins - ${pp2d.pins.length} total`);
    } else {
      console.log(
        `Pin data contained ${pp2d.pins.length} pins, ${pp2d.sets.length} sets and ${pp2d.pax.length} PAX events`
      );
      pins = pp2d.pins;
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
  console.log(`Wrote ${pinnypalPinData.length} bytes of updated JSON to ${PINNYPALS_PINS_CACHE_FILE}`);

  const pp2d: PinCollectionData = requestToDataSet(data as Pinnypals2PinsRequest);
  const pinpanionData: string = JSON.stringify(pp2d);
  fs.writeFileSync(PINPANION_PINS_CACHE_FILE, pinpanionData, 'utf-8');
  console.log(`Wrote ${pinpanionData.length} bytes of updated JSON to ${PINPANION_PINS_CACHE_FILE}`);
  return pins;
};

const downloadImageForPin = async (pin: Pin): Promise<boolean> => {
  const pinpanionUrl: string = pinpanionImagePrefix + '/'+ pin.image_name;
  const pinnypalsUrl: string = pinnypalsImagePrefix + '/' + pin.image_name;
  const outputFilePath: string = path.resolve(path.join(destinationPath, pin.image_name.split('?')[0]));
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputFilePath)) {
      console.debug(`Downloading ${pinpanionUrl} to ${outputFilePath}`);
      downloadFile(pinpanionUrl, outputFilePath)
        .then(() => {
          console.log(`Downloaded ${pinpanionUrl} to ${outputFilePath}`);
          resolve(true);
        })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .catch((_pinpanionErr) => {
          console.warn(`Didn't find pin image at pinpanion prod host ${pinpanionUrl}, trying pinnypals...`);
          downloadFile(pinnypalsUrl, outputFilePath)
            .then(() => {
              console.log(`Downloaded ${pinnypalsUrl} to ${outputFilePath}`);
              resolve(true);
            })
            .catch((err) => {
              console.error(`Error downloading ${pinnypalsUrl} to ${outputFilePath}: ${err}`);
              reject(err);
            });
        });
    } else {
      console.log(`Skipped downloading ${pinpanionUrl} because ${outputFilePath} exists.`);
      resolve(true);
    }
  });
};

const cachePinImages = async (pinsToDownload: Pin[]): Promise<void> => {
  console.debug(`Caching ${pinsToDownload.length} pin images to ${destinationPath}...`);

  if (!fs.existsSync(destinationPath)) {
    console.log(`Creating directory ${destinationPath}`);
    fs.mkdirSync(destinationPath);
  }
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(destinationPath)) {
      return reject(Error(`Failed creating destination directory ${destinationPath}`));
    }
    const promises: Promise<boolean>[] = pinsToDownload.map((p) => downloadImageForPin(p));
    Promise.allSettled(promises).then((results: PromiseSettledResult<boolean>[]) => {
      const hadErrors = results.filter((pr) => pr.status === 'rejected').length > 0;
      if (hadErrors) {
        console.error('Errors occurred while downloading');
        reject(Error('Errors occurred while downloading'));
      }
      resolve();
    });
  });
};

const useLocal = false;
const pins: Pin[] = useLocal ? useLocalCachedData() : await fetchAndCachePinnypalData();

await cachePinImages(pins);
