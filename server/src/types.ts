import type { IncomingMessage } from 'http';
import type { Session } from 'express-session';

interface SessionUser {
  id: string;
  displayName: string;
  provider: string;
  avatar?: string;
}

export interface AppSession extends Session {
  user: SessionUser;
}

export interface SessionRequest extends IncomingMessage {
  session: AppSession;
}
