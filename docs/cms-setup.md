# CMS setup: GitHub App sign-in

The CMS at `/admin/` signs in with a **GitHub App** that can only touch this one repo.
One-time setup, about 10 minutes (steps in `docs/deploy.md` → step 4). Until it's done, `/admin/` shows "Sign-in is not configured yet".

## How sign-in works

1. `/admin/` → **Sign in with GitHub** → the Worker (`worker/index.ts`) sends you to GitHub.
2. You approve → GitHub sends you back to `/api/auth/callback`.
3. The Worker swaps the code for tokens (using the app secret), checks your GitHub user ID is `OWNER_ID` (5953718 = dhwuho), and stores the tokens in httpOnly cookies.
4. The CMS page asks `/api/auth/session` for a short-lived access token and calls the GitHub API directly. Tokens last 8 hours and refresh silently.

Anyone else who tries gets "Not allowed". The token can only reach this repo, and only its contents.

## Setup steps

Step-by-step instructions (create the GitHub App, install it, add the secret, send the Client ID, test): **`docs/deploy.md` → step 4, "Turn on CMS sign-in"**.

Summary of what the app needs:

| Setting | Value |
| --- | --- |
| Callback URL | `https://harrywu-personal-pages.dh-wuho.workers.dev/api/auth/callback` (+ `http://localhost:8787/api/auth/callback` for local testing) |
| Expire user authorization tokens | on |
| Webhook | off |
| Repository permissions | Contents: Read and write · Metadata: Read · Checks: Read · Commit statuses: Read |
| Installed on | only `harrywu_personal_pages` |
| Cloudflare | runtime **Secret** `GITHUB_CLIENT_SECRET`; `GITHUB_CLIENT_ID` and `OWNER_ID` in `wrangler.jsonc` |

## Troubleshooting

| Message | Fix |
| --- | --- |
| "Sign-in is not configured yet" | Client ID not in `wrangler.jsonc`, or the secret isn't set (`deploy.md` step 4d) |
| GitHub: "redirect_uri is not associated with this application" | Callback URL on the app (`deploy.md` 4a) doesn't match the site address exactly |
| "Not allowed" | Signed in with a GitHub account other than dhwuho |
| "Sign-in failed … expired" | Took over 10 minutes, or cookies blocked; try again |
| Saving says 404 or "Resource not accessible" | App not installed on the repo (`deploy.md` 4c), or Contents isn't Read and write |
| No "Live" status after saving | Checks / Commit statuses permission missing; saving still works |

## Local development

- `pnpm dev` → http://localhost:4321/admin/ has no Worker, so the CMS offers:
  - **Use token**: paste a fine-grained personal access token (GitHub → Settings → Developer settings → Fine-grained tokens; repo `harrywu_personal_pages`; Contents read and write). Kept in this tab only.
  - **Continue read-only**: browse and edit without saving.
- Full sign-in locally: `pnpm build && pnpm wrangler dev` → http://localhost:8787/admin/, with the localhost callback URL added to the app and a `.dev.vars` file (git-ignored) containing `GITHUB_CLIENT_SECRET=...`.

## When the custom domain arrives (phase 7, launch)

Add `https://<domain>/api/auth/callback` as another callback URL in the app. Nothing else changes: the Worker builds the callback from whatever address you're on.
