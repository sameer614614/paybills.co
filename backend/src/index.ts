import { createServer } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = createServer(app);

const port = Number(env.PORT) || 4000;

server.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
