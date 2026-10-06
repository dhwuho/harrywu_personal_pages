# Deploy to Cloudflare Workers

How the site goes live. After setup, every push to `main` rebuilds and deploys automatically.

## How it works

1. You push to `main` on GitHub (or save in the CMS later).
2. Cloudflare **Workers Builds** sees the push, runs `pnpm build`, then `npx wrangler deploy`.
3. Wrangler uploads `dist/` as static assets to the Worker named in `wrangler.jsonc` (`harrywu-personal-pages`).
4. The site is served from Cloudflare's CDN at `https://harrywu-personal-pages.<your-subdomain>.workers.dev`.

Already in the repo: `wrangler.jsonc`, `.node-version` (Node 24), `packageManager` in `package.json` (pnpm).

## One-time setup (about 10 minutes)

Dashboard menu names can shift a little; look for the closest match.

### 1. Create a Cloudflare account

- Sign up at https://dash.cloudflare.com/sign-up (free plan).
- Verify your email.

### 2. Create the Worker from the GitHub repo

1. In the dashboard, open **Workers & Pages** (under Compute in the left menu).
2. Click **Create** → **Import a repository** (Workers tab, not Pages).
3. **Connect GitHub.** GitHub asks you to install the Cloudflare app. Choose **Only select repositories** → `harrywu_personal_pages`. This limits Cloudflare to this one repo.
4. Pick the repo `dhwuho/harrywu_personal_pages`.
5. Fill in the settings:

| Field | Value |
| --- | --- |
| Project / Worker name | `harrywu-personal-pages` (must match `name` in `wrangler.jsonc`, or the build fails) |
| Production branch | `main` |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` (the default) |
| Root directory | `/` (leave empty) |

6. Click **Create and deploy**. The first build takes 1–2 minutes. Watch the log on the Worker's **Deployments** / **Builds** tab.

### 3. Open the site and set the site URL

1. When the build finishes, the Worker page shows the URL, e.g. `https://harrywu-personal-pages.<your-subdomain>.workers.dev`.
2. Go to the Worker → **Settings** → **Build** → **Variables and secrets** and add a build variable:
   - `SITE_URL` = that URL (no trailing slash)
3. Retry the latest build (or push any commit). This makes canonical links, RSS and the sitemap use the real address.

### 4. (Optional) Web Analytics

- Dashboard → **Analytics & Logs** → **Web Analytics** → add the site. Free and cookie-free. Tell Claude the token if a script snippet is needed.

## Day to day

- **Publish:** push to `main` (later: save in the CMS). Live in ~1–2 minutes.
- **Check a build:** Worker → Deployments / Builds tab, or the commit's check on GitHub.
- **Roll back:** Worker → Deployments → pick an older version → **Rollback**.
- **Deploy from your machine (rarely needed):** `pnpm dlx wrangler login` once, then `pnpm deploy`.

## Limits on the free plan

| What | Free limit |
| --- | --- |
| Visitors loading pages (static assets) | Unlimited |
| Worker script calls (CMS login, later) | 100,000 / day |
| Build minutes | 3,000 / month, 1 build at a time |
| Files per deploy | 20,000, max 25 MiB each |

## Custom domain (later)

When you buy a domain (Cloudflare Registrar is simplest): Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**. Then update the `SITE_URL` build variable.
