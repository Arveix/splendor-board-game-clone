import http from 'http';
import express from 'express';
import mainRouter from './routes/routes.js';
import { initWebSocketServer } from './websocket.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS Middleware
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id');
  next();
});

// Mount main routing logic for the entire website
app.use('/api', mainRouter);

const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
