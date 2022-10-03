import { app } from './app';
import serverlessExpress from '@vendia/serverless-express';

export const handler = serverlessExpress({ app });

exports.handler = handler;

// export default handler;
