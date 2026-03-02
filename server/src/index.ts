import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { configureSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const port = parseInt(process.env.PORT ?? '3000', 10);

app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: frontendUrl, credentials: true },
});

configureSocket(io);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const distPath = join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
