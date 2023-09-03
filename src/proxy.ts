import { ALL_PINS_URL1, ALL_PINS_URL2 } from './defaults';

import Express from 'express';
import { PinnypalsPinsRequest } from './types';
import fetch from 'node-fetch';

// eslint-disable-next-line new-cap
const app = Express();

const pinUrl: string = process.env.PINNYPALS_VERSION === '1' ? ALL_PINS_URL1 : ALL_PINS_URL2;

let ALL_PINS: PinnypalsPinsRequest | undefined = undefined;

app.get('/', (req, res) => {
  res.send('Welcome to CORS server 😁');
});
app.get('/pins', (req, res): void => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  if (ALL_PINS === undefined) {
    fetch(pinUrl)
      .then((response) => response.json())
      .then((data: unknown) => {
        const ppd: PinnypalsPinsRequest = data as PinnypalsPinsRequest;
        ALL_PINS = ppd;
        console.log(`Got pins: ${ALL_PINS}`);
        res.send(ALL_PINS);
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    res.send(ALL_PINS);
  }
});
app.get('/cors', (req, res) => {
  res.send('This has CORS enabled 🎈');
});
app.listen(8080, () => {
  console.log('listening on port 8080');
});
