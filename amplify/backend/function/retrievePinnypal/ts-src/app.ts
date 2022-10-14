import * as express from 'express';

import { createLanyardFromPinnypalsUserResult, queryPinnypalsUser } from './pinnypals/queryUser';

import { PinSelectionList } from './types';
import { PinnypalsUserCollectionQuery } from './pinnypals/types';
import bodyParser from 'body-parser';

// import { eventContext } from 'aws-serverless-express/middleware';
const PINNYPALS_QUERY_USER = 'https://pinnypals.com/scripts/queryUserCollection.php';

// declare a new express app
// eslint-disable-next-line new-cap
// serverlessExpress();
export const app = express();
app.use(bodyParser.json());
// app.use(eventContext());

// Enable CORS for all methods
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.get('/:username', async (req, res) => {
  if (!req.params.username) {
    res.status(400);
  }
  const username: string = req.params.username;
  try {
    const ppUser: PinnypalsUserCollectionQuery = await queryPinnypalsUser(PINNYPALS_QUERY_USER, username);
    const ppLanyard: PinSelectionList = createLanyardFromPinnypalsUserResult(ppUser);
    res.send(ppLanyard);
    res.status(200);
  } catch (err) {
    res.status(500);
  }
});
