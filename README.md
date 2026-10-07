# Harry Wu · personal site

Source for https://harrywu-personal-pages.dh-wuho.workers.dev: a static personal website with a built-in, single-user CMS.

- **Site:** Astro (static HTML, no JavaScript on content pages), Markdown/MDX posts in English or Chinese, tags, RSS, sitemap, search (Pagefind).
- **CMS:** React app at `/admin/`: sign in with GitHub (owner only), write with a live preview, upload images, publish. Each save is a commit to this repo.
- **Hosting:** Cloudflare Workers (static assets + a small sign-in script). Every push to `main` deploys.

## Docs

| File | What's in it |
| --- | --- |
| [docs/design.md](docs/design.md) | Design: stack, architecture, content model, CMS, decisions |
| [docs/progress.md](docs/progress.md) | Status, milestones, next steps and a dated log |
| [docs/setup-guide.md](docs/setup-guide.md) | Cloudflare deployment, CMS sign-in setup, local development, troubleshooting |

## Commands

```sh
pnpm install
pnpm dev                              # site at http://localhost:4321 (CMS: /admin/, token or read-only mode)
pnpm build                            # static build to dist/ + search index
pnpm check                            # type-check site and Worker
pnpm build && pnpm wrangler dev       # site + sign-in Worker at http://localhost:8787
```

## Writing

Posts live in `src/content/posts/<slug>/index.md` (`.mdx` when they embed a video), with their images in the same folder. Use the CMS at `/admin/`, or edit the files and push.
