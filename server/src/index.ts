import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { configurePassport } from './auth.js';
import { configureSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);

// Trust Railway/Heroku/etc reverse proxy so req.secure is correct
// and session cookies with secure:true are set properly over HTTPS
app.set('trust proxy', 1);

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const port = parseInt(process.env.PORT ?? '3000', 10);
const sessionSecret = process.env.SESSION_SECRET ?? 'change-me';

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());

const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

app.use(sessionMiddleware);

// Store user in session after passport auth
app.use((req, _res, next) => {
  if (req.session && (req.session as Record<string, unknown>).passport) {
    const passportData = (req.session as Record<string, unknown>).passport as { user?: unknown };
    if (passportData.user) {
      (req.session as Record<string, unknown>).user = passportData.user;
    }
  }
  next();
});

configurePassport(app);

const io = new Server(httpServer, {
  cors: {
    origin: frontendUrl,
    credentials: true,
  },
});

// Share session with Socket.io — io.engine.use passes real req/res objects
// so express-session's on-finished listener works correctly
io.engine.use(sessionMiddleware);

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
