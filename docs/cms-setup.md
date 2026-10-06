# CMS setup: GitHub App sign-in

The CMS at `/admin/` signs in with a **GitHub App** that can only touch this one repo.
One-time setup, about 10 minutes. Until it's done, `/admin/` shows "Sign-in is not configured yet".

## How sign-in works

1. `/admin/` → **Sign in with GitHub** → the Worker (`worker/index.ts`) sends you to GitHub.
2. You approve → GitHub sends you back to `/api/auth/callback`.
3. The Worker swaps the code for tokens (using the app secret), checks your GitHub user ID is `OWNER_ID` (5953718 = dhwuho), and stores the tokens in httpOnly cookies.
4. The CMS page asks `/api/auth/session` for a short-lived access token and calls the GitHub API directly. Tokens last 8 hours and refresh silently.

Anyone else who tries gets "Not allowed". The token can only reach this repo, and only its contents.

## 1. Create the GitHub App

GitHub → your avatar → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**.
(Direct link: https://github.com/settings/apps/new)

| Field | Value |
| --- | --- |
| GitHub App name | `harrywu-personal-pages-cms` (any unique name) |
| Homepage URL | `https://harrywu-personal-pages.dh-wuho.workers.dev` |
| Callback URL | `https://harrywu-personal-pages.dh-wuho.workers.dev/api/auth/callback` |
| Callback URL (click **Add Callback URL**, optional, for local testing) | `http://localhost:8787/api/auth/callback` |
| Expire user authorization tokens | ✅ checked (default) |
| Request user authorization (OAuth) during installation | ☐ unchecked |
| Enable Device Flow | ☐ unchecked |
| Webhook → Active | ☐ **unchecked** (no webhook needed) |

**Repository permissions** (leave everything else "No access"):

| Permission | Access | Why |
| --- | --- | --- |
| Contents | **Read and write** | Read and save posts and images |
| Metadata | Read-only | Required by GitHub (set automatically) |
| Checks | Read-only | Show "Building… / Live" after saving |
| Commit statuses | Read-only | Same, for builds that report as statuses |

**Where can this GitHub App be installed?** → **Only on this account**.

Click **Create GitHub App**.

## 2. Get the client ID and secret

On the app's page (**General**):

1. Copy the **Client ID** (looks like `Iv23li...`). It's public; send it to Claude, who puts it in `wrangler.jsonc`.
2. Click **Generate a new client secret**. Copy it now; GitHub shows it once. **Don't share it in chat.**

## 3. Install the app on the repo

App page → **Install App** (left menu) → your account → **Only select repositories** → `harrywu_personal_pages` → **Install**.

## 4. Add the secret to Cloudflare

Cloudflare dashboard → **Workers & Pages** → `harrywu-personal-pages` → **Settings** → **Variables and secrets** (the runtime one, **not** under Build) → **Add**:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `GITHUB_CLIENT_SECRET` | the client secret from step 2 |

Save. (Secrets are kept across deploys. The public `GITHUB_CLIENT_ID` and `OWNER_ID` live in `wrangler.jsonc`.)

## 5. Try it

Once the client ID is committed and deployed: open `https://harrywu-personal-pages.dh-wuho.workers.dev/admin/` → **Sign in with GitHub** → approve → you see your posts.

## Troubleshooting

| Message | Fix |
| --- | --- |
| "Sign-in is not configured yet" | Client ID not in `wrangler.jsonc`, or the secret isn't set (step 4) |
| GitHub: "redirect_uri is not associated with this application" | Callback URL in step 1 doesn't match the site address exactly |
| "Not allowed" | Signed in with a GitHub account other than dhwuho |
| "Sign-in failed … expired" | Took over 10 minutes, or cookies blocked; try again |
| Saving says 404 or "Resource not accessible" | App not installed on the repo (step 3), or Contents isn't Read and write |
| No "Live" status after saving | Checks / Commit statuses permission missing; saving still works |

## Local development

- `pnpm dev` → http://localhost:4321/admin/ has no Worker, so the CMS offers:
  - **Use token**: paste a fine-grained personal access token (GitHub → Settings → Developer settings → Fine-grained tokens; repo `harrywu_personal_pages`; Contents read and write). Kept in this tab only.
  - **Continue read-only**: browse and edit without saving.
- Full sign-in locally: `pnpm build && pnpm wrangler dev` → http://localhost:8787/admin/, with the localhost callback URL added in step 1 and a `.dev.vars` file (git-ignored) containing `GITHUB_CLIENT_SECRET=...`.

## When the custom domain arrives (phase 8)

Add `https://<domain>/api/auth/callback` as another callback URL in the app. Nothing else changes: the Worker builds the callback from whatever address you're on.
