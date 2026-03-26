export interface SyncPayload {
  version: number;
  updated_at: number;
  preferences: {
    surahNumber: number;
    visibilityMode: string;
    showKeyboard: boolean;
    theme: string;
    jumpTarget?: any;
  };
  progressStats: Record<string, any>;
  mistakeStats: Record<string, any>;
  sessionAttempts: Record<string, number>;
  sessionMistakesIndices: Record<string, number[]>;
}

// Check current user session
export async function fetchCurrentUser() {
  const res = await fetch('/api/auth');
  const data = await res.json();
  return data.authenticated ? data.user : null;
}

// Log in
export async function loginWithEmail(email: string, password: string) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

// Register
export async function registerWithEmail(email: string, password: string) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', email, password })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

// Logout
export async function logoutUser() {
  await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' })
  });
}

// Push Sync
export async function pushSyncPayload(payload: SyncPayload) {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: payload.version, payload })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

// Pull Sync
export async function pullSyncPayload(): Promise<{ empty: boolean; payload?: SyncPayload; updated_at?: number }> {
  const res = await fetch('/api/sync');
  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}
