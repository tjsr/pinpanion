// import * as express from 'express';
const express = require('express');

const queryUser = require('./pinnypals/queryUser');
const createLanyardFromPinnypalsUserResult = queryUser.createLanyardFromPinnypalsUserResult;
const queryPinnypalsUser = queryUser.queryPinnypalsUser;

// import { createLanyardFromPinnypalsUserResult, queryPinnypalsUser } from './pinnypals/queryUser';

// import bodyParser from 'body-parser';
const bodyParser = require('body-parser');

// const queryUser = require('./pinnypals/queryUser');

// import { eventContext } from 'aws-serverless-express/middleware';
const PINNYPALS_QUERY_USER = 'https://pinnypals.com/scripts/queryUserCollection.php';

// declare a new express app
// eslint-disable-next-line new-cap
// serverlessExpress();
const app = express();
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
  const username = req.params.username;
  try {
    const ppUser = await queryPinnypalsUser(PINNYPALS_QUERY_USER, username);
    const ppLanyard = createLanyardFromPinnypalsUserResult(ppUser);
    res.send(ppLanyard);
    res.status(200);
  } catch (err) {
    res.status(500);
  }
});

exports.app = app;