import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import type { Express } from 'express';

interface SessionUser {
  id: string;
  displayName: string;
  provider: string;
  avatar?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends SessionUser {}
  }
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: SessionUser, done) => {
  done(null, user);
});

export function configurePassport(app: Express): void {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const serverUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(':5173', ':3000');

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: `${serverUrl}/auth/google/callback`,
        },
        (_accessToken, _refreshToken, profile, done) => {
          const user: SessionUser = {
            id: profile.id,
            displayName: profile.displayName,
            provider: 'google',
            avatar: profile.photos?.[0]?.value,
          };
          done(null, user);
        },
      ),
    );
  }

  if (githubClientId && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: `${serverUrl}/auth/github/callback`,
        },
        (_accessToken: string, _refreshToken: string, profile: { id: string; displayName: string; photos?: { value: string }[] }, done: (err: null, user: SessionUser) => void) => {
          const user: SessionUser = {
            id: String(profile.id),
            displayName: profile.displayName || 'GitHub User',
            provider: 'github',
            avatar: profile.photos?.[0]?.value,
          };
          done(null, user);
        },
      ),
    );
  }

  app.use(passport.initialize());
  app.use(passport.session());

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

  // Google OAuth routes — only registered when credentials are configured
  if (googleClientId && googleClientSecret) {
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    app.get(
      '/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/' }),
      (_req, res) => {
        res.redirect(frontendUrl);
      },
    );
  } else {
    app.get('/auth/google', (_req, res) => res.status(501).json({ error: 'Google OAuth not configured' }));
  }

  // GitHub OAuth routes — only registered when credentials are configured
  if (githubClientId && githubClientSecret) {
    app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
    app.get(
      '/auth/github/callback',
      passport.authenticate('github', { failureRedirect: '/' }),
      (_req, res) => {
        res.redirect(frontendUrl);
      },
    );
  } else {
    app.get('/auth/github', (_req, res) => res.status(501).json({ error: 'GitHub OAuth not configured' }));
  }

  // API routes
  app.get('/api/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.get('/api/auth/logout', (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect(frontendUrl);
      });
    });
  });
}
