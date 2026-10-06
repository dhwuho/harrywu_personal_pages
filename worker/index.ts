// Cloudflare Worker: serves the static site and handles CMS sign-in with a GitHub App.
// Only /api/* reaches this code (see run_worker_first in wrangler.jsonc); everything
// else is served straight from the static assets.

interface Env {
  ASSETS: Fetcher;
  /** GitHub App client ID (public; set in wrangler.jsonc). */
  GITHUB_CLIENT_ID: string;
  /** GitHub App client secret (secret; set in the Cloudflare dashboard). */
  GITHUB_CLIENT_SECRET: string;
  /** Numeric GitHub user ID allowed to sign in. */
  OWNER_ID: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
}

const COOKIE_PATH = '/api/auth';
const STATE_COOKIE = 'cms_state';
const ACCESS_COOKIE = 'cms_at';
const REFRESH_COOKIE = 'cms_rt';
/** Used when GitHub doesn't say how long a token lives (token expiry turned off). */
const DEFAULT_ACCESS_TTL = 8 * 60 * 60;
const USER_AGENT = 'harrywu-personal-pages-cms';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/auth/')) {
      try {
        return await handleAuth(request, env, url);
      } catch (err) {
        console.error('auth error', err);
        return json({ error: 'Sign-in service error' }, 500);
      }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleAuth(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.OWNER_ID) {
    return json({ error: 'Sign-in is not configured yet (GitHub App client ID, secret or owner ID missing).' }, 503);
  }
  const route = url.pathname.slice('/api/auth/'.length).replace(/\/$/, '');
  const method = request.method;

  if (route === 'login' && method === 'GET') return login(env, url);
  if (route === 'callback' && method === 'GET') return callback(request, env, url);

  // JSON endpoints called by the CMS page. The custom header can't be sent cross-site
  // without a CORS preflight (which we never allow), so it blocks CSRF.
  if (request.headers.get('X-CMS') !== '1') return json({ error: 'Forbidden' }, 403);
  if (route === 'session' && method === 'POST') return session(request, env);
  if (route === 'logout' && method === 'POST') return new Response(null, { status: 204, headers: clearAuthCookies() });
  return json({ error: 'Not found' }, 404);
}

/** Step 1: send the browser to GitHub's consent page. */
function login(env: Env, url: URL): Response {
  const state = randomHex(16);
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback`);
  authorize.searchParams.set('state', state);
  const headers = new Headers({ Location: authorize.toString() });
  // Lax: the cookie must come back on the top-level redirect from github.com.
  headers.append('Set-Cookie', cookie(STATE_COOKIE, state, 600, 'Lax'));
  return new Response(null, { status: 302, headers });
}

/** Step 2: GitHub redirects back with a code; swap it for tokens and check the user. */
async function callback(request: Request, env: Env, url: URL): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(request, STATE_COOKIE);
  if (!code || !state || !expected || !timingSafeEqual(state, expected)) {
    return page('Sign-in failed', 'The sign-in link expired or was tampered with. Go back and try again.', 400);
  }

  const tokens = await exchange(env, {
    code,
    redirect_uri: `${url.origin}/api/auth/callback`,
  });
  if (!tokens.access_token) {
    return page('Sign-in failed', tokens.error_description ?? tokens.error ?? 'GitHub did not return a token.', 400);
  }

  const user = await githubUser(tokens.access_token);
  if (!user || String(user.id) !== env.OWNER_ID.trim()) {
    return page('Not allowed', 'This CMS only accepts the site owner’s GitHub account.', 403);
  }

  const headers = authCookies(tokens);
  headers.append('Set-Cookie', cookie(STATE_COOKIE, '', 0, 'Lax'));
  headers.set('Location', '/admin/');
  return new Response(null, { status: 302, headers });
}

/** Give the CMS page a current access token, refreshing it with the refresh token if needed. */
async function session(request: Request, env: Env): Promise<Response> {
  const stored = readCookie(request, ACCESS_COOKIE);
  if (stored) {
    const [expiresAt, token] = splitOnce(stored, ':');
    if (token && Number(expiresAt) - Date.now() > 2 * 60_000) {
      return json({ token, expiresAt: Number(expiresAt) });
    }
  }

  const refreshToken = readCookie(request, REFRESH_COOKIE);
  if (!refreshToken) return json({ error: 'Not signed in' }, 401, clearAuthCookies());

  const tokens = await exchange(env, { grant_type: 'refresh_token', refresh_token: refreshToken });
  if (!tokens.access_token) return json({ error: 'Session expired' }, 401, clearAuthCookies());

  // Refresh tokens could outlive an ownership change; check the user again.
  const user = await githubUser(tokens.access_token);
  if (!user || String(user.id) !== env.OWNER_ID.trim()) return json({ error: 'Not allowed' }, 403, clearAuthCookies());

  const headers = authCookies(tokens);
  const expiresAt = Date.now() + (tokens.expires_in ?? DEFAULT_ACCESS_TTL) * 1000;
  return json({ token: tokens.access_token, expiresAt }, 200, headers);
}

async function exchange(env: Env, params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, ...params }),
  });
  return res.ok ? res.json() : { error: `GitHub token endpoint returned ${res.status}` };
}

async function githubUser(token: string): Promise<{ id: number; login: string } | null> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': USER_AGENT },
  });
  return res.ok ? res.json() : null;
}

function authCookies(tokens: TokenResponse): Headers {
  const ttl = tokens.expires_in ?? DEFAULT_ACCESS_TTL;
  const headers = new Headers();
  headers.append('Set-Cookie', cookie(ACCESS_COOKIE, `${Date.now() + ttl * 1000}:${tokens.access_token}`, ttl));
  if (tokens.refresh_token) {
    headers.append('Set-Cookie', cookie(REFRESH_COOKIE, tokens.refresh_token, tokens.refresh_token_expires_in ?? 180 * 24 * 3600));
  }
  return headers;
}

function clearAuthCookies(): Headers {
  const headers = new Headers();
  headers.append('Set-Cookie', cookie(ACCESS_COOKIE, '', 0));
  headers.append('Set-Cookie', cookie(REFRESH_COOKIE, '', 0));
  return headers;
}

/** Host-only cookie (no Domain attribute), so it works on workers.dev, localhost and a custom domain. */
function cookie(name: string, value: string, maxAge: number, sameSite: 'Strict' | 'Lax' = 'Strict'): string {
  return `${name}=${value}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}`;
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [key, value] = splitOnce(part.trim(), '=');
    if (key === name) return value || null;
  }
  return null;
}

function splitOnce(text: string, sep: string): [string, string] {
  const i = text.indexOf(sep);
  return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
}

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(data: unknown, status = 200, headers = new Headers()): Response {
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers });
}

function page(title: string, message: string, status: number): Response {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title>
<body style="font:16px/1.6 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#1c1c1c">
<h1 style="font-size:1.4rem">${esc(title)}</h1><p>${esc(message)}</p><p><a href="/admin/">Back to the CMS</a></p></body>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
