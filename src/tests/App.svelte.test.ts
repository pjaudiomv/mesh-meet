import { describe, test, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';

import App from '@/App.svelte';

// Mock fetch so /api/auth/me returns 401 (unauthenticated)
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Not authenticated' })
    })
  );
});

describe('App', () => {
  test('shows login screen when unauthenticated', async () => {
    render(App);
    // After fetchUser resolves with 401, Login component renders
    await vi.waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  test('shows MeshMeet branding on login screen', async () => {
    render(App);
    await vi.waitFor(() => {
      expect(screen.getByText('MeshMeet')).toBeInTheDocument();
    });
  });
});
