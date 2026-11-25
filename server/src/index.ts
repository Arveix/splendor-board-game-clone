import http from 'http';
import express from 'express';
import mainRouter from './routes/routes.js';
import { initWebSocketServer } from './websocket.js';

// Load .env automatically if running in Node.js 20.12+ / 21+ / 22+ / 24+
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional or already injected via container/environment
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

app.use(express.json());

// CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!CLIENT_ORIGIN || CLIENT_ORIGIN === '*') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    const allowed = CLIENT_ORIGIN.split(',').map((o) => o.trim());
    if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', origin || allowed[0]);
    }
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id');
  res.header('Access-Control-Max-Age', '86400');

  // Respond immediately with 200 OK to preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Mount main routing logic for the entire website
app.use('/api', mainRouter);

const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
