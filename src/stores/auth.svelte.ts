import type { User } from '@/types/index';

let user = $state<User | null>(null);
let loading = $state(true);

export async function fetchUser(): Promise<void> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      user = await res.json();
    } else {
      user = null;
    }
  } catch {
    user = null;
  } finally {
    loading = false;
  }
}

export function getUser(): User | null {
  return user;
}

export function isLoading(): boolean {
  return loading;
}
