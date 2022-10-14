import { app } from './app';
import { handler } from 'serverless-express/handler';

export const api = handler(app);
