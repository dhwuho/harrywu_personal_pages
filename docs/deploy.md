# Deploy to Cloudflare Workers

How the site goes live. After setup, every push to `main` rebuilds and deploys automatically.

## How it works

1. You push to `main` on GitHub, or save in the CMS at `/admin/` (each save is a commit to `main`).
2. Cloudflare **Workers Builds** sees the push, runs `pnpm build`, then `npx wrangler deploy`.
3. Wrangler uploads `dist/` as static assets, plus the small sign-in script `worker/index.ts`, to the Worker named in `wrangler.jsonc` (`harrywu-personal-pages`).
4. The site is served from Cloudflare's CDN at `https://harrywu-personal-pages.dh-wuho.workers.dev`. Only `/api/*` (CMS sign-in) runs the script; every other page is a static file.

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

6. Under domains: keep the **Production** workers.dev URL on, turn **Preview** URLs off, and leave **Access** off (it would put a login wall in front of the public site).
7. Click **Create and deploy**. The first build takes 1–2 minutes. Watch the log on the Worker's **Deployments** / **Builds** tab.

### 3. Open the site and set the site URL

1. When the build finishes, the Worker page shows the URL, e.g. `https://harrywu-personal-pages.<your-subdomain>.workers.dev`.
2. Go to the Worker → **Settings** → **Build** → **Variables and secrets** (the one under **Build**, not the runtime one) and add a variable:
   - `SITE_URL` = that URL (no trailing slash)
3. Retry the latest build (or push any commit). This makes canonical links, RSS and the sitemap use the real address.

### 4. Turn on CMS sign-in (GitHub App)

The CMS at `/admin/` signs you in with a **GitHub App**: a GitHub "robot account" that you allow to edit only this one repo. Until this step is done, `/admin/` says **"Sign-in is not configured yet"**. Takes about 10 minutes. You need to be signed in to GitHub as **dhwuho**.

Keep a text editor open. You'll copy two values: the **Client ID** (public) and the **client secret** (private).

#### 4a. Create the GitHub App

1. Open https://github.com/settings/apps/new
   (or: GitHub → your avatar, top right → **Settings** → **Developer settings**, bottom of the left menu → **GitHub Apps** → **New GitHub App**).
2. GitHub may ask for your password or 2FA code. Enter it.
3. Fill in the top of the form:

| Field | What to enter |
| --- | --- |
| **GitHub App name** | `harrywu-personal-pages-cms` (must be unique on GitHub; add `-2` if taken) |
| **Description** | optional, e.g. `CMS for my personal site` |
| **Homepage URL** | `https://harrywu-personal-pages.dh-wuho.workers.dev` |

4. **Identifying and authorizing users** section:

| Field | What to enter |
| --- | --- |
| **Callback URL** | `https://harrywu-personal-pages.dh-wuho.workers.dev/api/auth/callback` (exactly, no trailing slash) |
| **Add Callback URL** (optional) | `http://localhost:8787/api/auth/callback`, only needed to test sign-in on your computer |
| **Expire user authorization tokens** | ✅ leave **checked** |
| **Request user authorization (OAuth) during installation** | ☐ leave **unchecked** |
| **Enable Device Flow** | ☐ leave **unchecked** |

5. **Post installation** section: leave **Setup URL** empty and **Redirect on update** unchecked.
6. **Webhook** section: **uncheck Active**. The Webhook URL field then disappears. (The CMS doesn't need webhooks.)
7. **Permissions** → click **Repository permissions** to expand it. Change only these four; leave everything else **No access**:

| Permission | Set to | Why |
| --- | --- | --- |
| **Contents** | **Read and write** | Read and save posts and images |
| **Metadata** | Read-only | GitHub sets this automatically; it can't be turned off |
| **Checks** | Read-only | Shows "Building… → Live" after you save |
| **Commit statuses** | Read-only | Same, for builds that report as statuses |

   Leave **Organization permissions** and **Account permissions** all at **No access**.
8. **Subscribe to events**: leave everything unchecked.
9. **Where can this GitHub App be installed?** → select **Only on this account**.
10. Click **Create GitHub App** at the bottom.

#### 4b. Copy the Client ID and create the client secret

You land on the app's **General** settings page.

1. Find **Client ID** near the top (looks like `Iv23liAbC123...`). Copy it into your text editor.
   (Ignore **App ID**, a plain number. The CMS needs the **Client ID**.)
2. Scroll to **Client secrets** → click **Generate a new client secret**.
3. Copy the secret right away (a long string). **GitHub shows it only once.** If you lose it, generate a new one and delete the old one.
4. **Don't paste the secret in chat, a commit or a file in the repo.** It goes only into Cloudflare (step 4d).
5. Skip **Private keys**. The CMS doesn't use them.

#### 4c. Install the app on the repo

1. On the app's settings page, click **Install App** in the left menu.
2. Next to your account (**dhwuho**), click **Install**.
3. Choose **Only select repositories** → open the dropdown → pick **harrywu_personal_pages**.
4. Check that the permissions listed are: read access to checks, commit statuses and metadata; read and write access to code (contents).
5. Click **Install**. GitHub shows the installation page; you can close it.

#### 4d. Add the client secret to Cloudflare

1. Open https://dash.cloudflare.com → **Workers & Pages** → click **harrywu-personal-pages**.
2. Go to **Settings** → **Variables and secrets**.
   Use the **runtime** "Variables and secrets" section, **not** the one under **Build** (where `SITE_URL` lives).
3. Click **+ Add**.
4. Fill in:

| Field | Value |
| --- | --- |
| **Type** | **Secret** (not Text). Secrets are encrypted and hidden after saving. |
| **Variable name** | `GITHUB_CLIENT_SECRET` (exactly) |
| **Value** | paste the client secret from 4b |

5. Click **Deploy** (or **Save**). Cloudflare redeploys the Worker with the secret; this takes a few seconds.

You don't add `GITHUB_CLIENT_ID` or `OWNER_ID` here: they're public and live in `wrangler.jsonc`. Variables set in the dashboard would be overwritten on the next deploy, but secrets are kept.

#### 4e. Send Claude the Client ID

Paste the **Client ID** from 4b into the chat. It's public, so this is safe. Claude puts it in `wrangler.jsonc` (`vars.GITHUB_CLIENT_ID`), commits and pushes; Cloudflare redeploys in about a minute.

(To do it yourself instead: set `"GITHUB_CLIENT_ID": "Iv23li..."` in `wrangler.jsonc`, commit and push to `main`.)

#### 4f. Sign in and test

1. Open https://harrywu-personal-pages.dh-wuho.workers.dev/admin/ (use a private window if you were on the page before).
2. Click **Sign in with GitHub**.
3. GitHub shows "Authorize harrywu-personal-pages-cms". Click **Authorize**. (Only the first time.)
4. You land back on `/admin/` and see your posts. Your username shows top right.
5. Test the full flow:
   1. **New post** → title `Test post`, slug `test-post`, a line of text → **Save draft**.
   2. Check GitHub: a new commit "Draft: Test post" on `main`, adding `src/content/posts/test-post/index.md`.
   3. Try typing Chinese with your pinyin input method in the editor.
   4. Paste or drag in an image → **Publish**. The banner shows "Building…" then "Live on the site" after about a minute.
   5. Open https://harrywu-personal-pages.dh-wuho.workers.dev/posts/test-post/ and check the post and image.
   6. Back in the CMS, open the post → **Delete post** to clean up.

If anything fails, copy the error text (or take a screenshot) and send it to Claude. Common problems are in `docs/cms-setup.md` → Troubleshooting.

#### Later changes to the GitHub App

- **New client secret:** generate it on the app page (4b), replace `GITHUB_CLIENT_SECRET` in Cloudflare (4d), then delete the old secret on GitHub.
- **Custom domain (phase 6, launch):** app page → **General** → **Add Callback URL** → `https://<your-domain>/api/auth/callback`. Keep the workers.dev one until the domain works.
- **Remove access completely:** GitHub → Settings → Applications → Installed GitHub Apps → the app → **Uninstall**.

### 5. (Optional) Web Analytics

- On `workers.dev`, Web Analytics needs a script in the site's code (send Claude the token from the snippet). Automatic setup only works for a domain in your Cloudflare account.
- Plan: turn on automatic Web Analytics after the custom domain is added. Direct link: https://dash.cloudflare.com/?to=/:account/web-analytics
- Ad blockers hide visits from Web Analytics; the Worker **Metrics** tab counts raw requests (including bots).

## Day to day

- **Publish:** write in the CMS at `/admin/` and click **Publish** (or push to `main`). Live in ~1–2 minutes; the CMS banner shows when.
- **Check a build:** Worker → Deployments / Builds tab, or the commit's check on GitHub.
- **Roll back:** Worker → Deployments → pick an older version → **Rollback**.
- **Deploy from your machine (rarely needed):** `pnpm dlx wrangler login` once, then `pnpm deploy`.

## Limits on the free plan

| What | Free limit |
| --- | --- |
| Visitors loading pages (static assets) | Unlimited |
| Worker script calls (CMS sign-in only) | 100,000 / day |
| Build minutes | 3,000 / month, 1 build at a time |
| Files per deploy | 20,000, max 25 MiB each |

## Custom domain (phase 6, launch)

When you buy a domain (Cloudflare Registrar is simplest): Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**. Then update the `SITE_URL` build variable, add the new callback URL to the GitHub App, and turn on automatic Web Analytics. Full checklist: phase 6 → Launch (M6.5–M6.10) in `progress.md`.
