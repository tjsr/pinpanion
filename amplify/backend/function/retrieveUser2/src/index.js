// const awsServerlessExpress = require('aws-serverless-express');
// const app = require('./app');

/**
 * @type {import('http').Server}
 */
// const server = awsServerlessExpress.createServer(app);
const queryUser = require('./queryUser');
const createLanyardFromPinnypalsUserResult = queryUser.createLanyardFromPinnypalsUserResult;
const queryPinnypalsUser = queryUser.queryPinnypalsUser;
const PINNYPALS_QUERY_USER = 'https://pinnypals.com/scripts/queryUserCollection.php';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event, context) => {
  try {
    let username = event.username;
    if (event.pathParameters !== undefined && event.pathParameters.username !== undefined) {
      username = event.pathParameters.username;
    }
    if (username === undefined) {
      const body = event.body != undefined ? event.body : JSON.parse(event.body);
      username = body.username;
    }
    const ppUser = await queryPinnypalsUser(PINNYPALS_QUERY_USER, username);
    const ppLanyard = createLanyardFromPinnypalsUserResult(ppUser);

    console.log('Successfully got lanyard: ', ppLanyard);
    const response = {
      body: JSON.stringify(ppLanyard),
      headers: {
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      isBase64Encoded: false,
      statusCode: 200,
    };
    return response;
  } catch (err) {
    console.log('Failed getting lanyard: ', err);
    console.error(JSON.stringify(event));
    console.error(JSON.stringify(context));
  }

  // event.body.username()
  // console.log(`EVENT: ${JSON.stringify(event)}`);
  // return awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;
};
