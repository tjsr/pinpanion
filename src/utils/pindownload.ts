import { PinnypalsPinsRequest } from '../types';
import config from '../config.json';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const IMG_DIR = 'public/imgs';

const downloadFile = async (url: string, outputPath: string): Promise<void> => {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(outputPath);
  return new Promise((resolve, reject) => {
    res.body?.pipe(fileStream);
    res.body?.on('error', reject);
    fileStream.on('finish', resolve);
  });
};

fetch(config.pinnypals)
  .then((response) => response.json())
  .then((data: unknown) => {
    const ppd: PinnypalsPinsRequest = data as PinnypalsPinsRequest;
    if (!fs.existsSync(IMG_DIR)) {
      fs.mkdirSync(IMG_DIR);
    }
    let hadErrors = false;
    ppd.pins.forEach((p) => {
      const url: string = config.pinnypalsImagePrefix + '/' + p.image_name;
      const outputFilePath: string = path.join(IMG_DIR, p.image_name.split('?')[0]);
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
  })
  .catch((err) => {
    console.log(err);
  });
