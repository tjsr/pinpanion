import { ConfigType, PinnypalsPinsRequest } from '../types';

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// import configJson from '../config.json';
const TEST_MODE = process.env.TEST_MODE == 'true';

const configFile = 'src/config.json';
if (!fs.existsSync(configFile)) {
  throw Error(`Config file does not exist at ${configFile}`);
}
const config: ConfigType = JSON.parse(fs.readFileSync(configFile).toString());

const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(outputPath);
  return new Promise((resolve, reject) => {
    res.body?.pipe(fileStream);
    res.body?.on('error', reject);
    fileStream.on('finish', resolve);
  });
};

let destinationPath: string = config.imageCacheDir;
if (process.argv && process.argv.length > 1 && process.argv[2] !== undefined) {
  destinationPath = process.argv[2];
} else if (process.env.IMAGES_CACHE_DIR !== undefined) {
  destinationPath = process.env.IMAGES_CACHE_DIR;
}

destinationPath = path.resolve(destinationPath);

let hadErrors = false;
console.log('Pinnypals:', config.pinnypals);
fetch(config.pinnypals)
  .then((response) => response.json())
  .then((data: unknown) => {
    const ppd: PinnypalsPinsRequest = data as PinnypalsPinsRequest;
    if (!fs.existsSync(destinationPath)) {
      hadErrors = true;
      fs.mkdirSync(destinationPath);
    }
    if (TEST_MODE) {
      ppd.pins = [ppd.pins[0]];
    }
    ppd.pins.forEach((p) => {
      const url: string = config.pinnypalsImagePrefix + '/' + p.image_name;
      const outputFilePath: string = path.resolve(path.join(destinationPath, p.image_name.split('?')[0]));
      if (!fs.existsSync(outputFilePath)) {
        downloadFile(url, outputFilePath).then(() => {
          console.log(`Downloaded ${url} to ${outputFilePath}`);
        }).catch((err) => {
          hadErrors = true;
          console.error(`Error downloading ${url} to ${outputFilePath}: ${err}`);
        });
      } else {
        console.log(`Skipped downloading ${url} because ${outputFilePath} exists.`);
      }
    });
    if (hadErrors) {
      throw Error('Errors occurred while downloading');
    }
  });
