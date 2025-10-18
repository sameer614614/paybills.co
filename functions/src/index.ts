import * as functions from 'firebase-functions';
import { createApp } from '@billspay/backend/dist/app.js';

const app = createApp();

export const api = functions.region('us-central1').https.onRequest(app);
