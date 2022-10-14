import { createLanyardFromPinnypalsUserResult, queryPinnypalsUser } from '../../../../../src/pinnypals/queryUser';

import Express from 'serverless-express/express';
import { PinSelectionList } from '../../../../../src/types';
import { PinnypalsUserCollectionQuery } from '../../../../../src/pinnypals/types';
import bodyParser from 'body-parser';

// import { eventContext } from 'aws-serverless-express/middleware';

// declare a new express app
// eslint-disable-next-line new-cap
export const app = Express();
app.use(bodyParser.json());
// app.use(eventContext());

// Enable CORS for all methods
app.use(function(req, res, next) {
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
    const ppUser: PinnypalsUserCollectionQuery = await queryPinnypalsUser(username);
    const ppLanyard: PinSelectionList = createLanyardFromPinnypalsUserResult(ppUser);
    res.send(ppLanyard);
    res.status(200);
  } catch (err) {
    res.status(500);
  }
});
