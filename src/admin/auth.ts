// Gets a GitHub access token for the CMS.
// Production: the auth Worker (/api/auth/*) keeps tokens in httpOnly cookies and hands
// a short-lived access token to the page. Local `astro dev` has no Worker, so a personal
// access token can be pasted instead (kept in sessionStorage for this tab only).

export type SessionState =
  | { kind: 'signed-in'; source: 'github-app' | 'dev-token' | 'read-only' }
  | { kind: 'signed-out'; error?: string }
  | { kind: 'no-backend' };

const DEV_TOKEN_KEY = 'cms:dev-token';
const REFRESH_MARGIN_MS = 60_000;

let token = '';
let expiresAt = 0;
let pending: Promise<string> | null = null;

function readDevToken(): string | null {
  try {
    return sessionStorage.getItem(DEV_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function fetchSession(): Promise<Response> {
  return fetch('/api/auth/session', { method: 'POST', headers: { 'X-CMS': '1' }, credentials: 'same-origin' });
}

/** Called once on load: decides which sign-in path applies. */
export async function initSession(): Promise<SessionState> {
  const devToken = readDevToken();
  if (devToken !== null) {
    token = devToken;
    expiresAt = Infinity;
    return { kind: 'signed-in', source: devToken ? 'dev-token' : 'read-only' };
  }
  let res: Response;
  try {
    res = await fetchSession();
  } catch {
    return { kind: 'no-backend' };
  }
  if (res.status === 404 || !res.headers.get('content-type')?.includes('json')) return { kind: 'no-backend' };
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { kind: 'signed-out', error: res.status === 401 ? undefined : body.error };
  }
  const data = (await res.json()) as { token: string; expiresAt: number };
  token = data.token;
  expiresAt = data.expiresAt;
  return { kind: 'signed-in', source: 'github-app' };
}

/** Current access token, refreshed through the Worker shortly before it expires. */
export async function getToken(): Promise<string> {
  if (Date.now() < expiresAt - REFRESH_MARGIN_MS) return token;
  pending ??= (async () => {
    const res = await fetchSession();
    if (!res.ok) throw new Error('Session expired; sign in again');
    const data = (await res.json()) as { token: string; expiresAt: number };
    token = data.token;
    expiresAt = data.expiresAt;
    return token;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

export function signIn() {
  location.href = '/api/auth/login';
}

export function useDevToken(value: string) {
  sessionStorage.setItem(DEV_TOKEN_KEY, value.trim());
  location.reload();
}

export async function signOut() {
  try {
    sessionStorage.removeItem(DEV_TOKEN_KEY);
  } catch {}
  await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CMS': '1' } }).catch(() => {});
  location.reload();
}
