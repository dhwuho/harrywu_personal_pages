# Progress Log

Tracks milestones, what's done, and decisions made.
Design: [design.md](design.md)

## Status by phase

| # | Phase | Status |
| --- | --- | --- |
| 0 | Planning and design doc | Done |
| 1 | Site foundation (Astro + React + MDX + i18n) | Done (visual check pending) |
| 2 | Deploy to Cloudflare Workers, RSS, sitemap, OG | Live; OG image left (analytics waits for domain) |
| 3 | CMS login (GitHub App + auth Worker) | Not started |
| 4 | CMS editor (CodeMirror, language tabs, preview, save) | Not started |
| 5 | CMS media and tags | Not started |
| 6 | Design polish and performance | Not started |
| 7 | Later: search, Chinese CMS UI, comments, custom domain | Not started |

## Milestones

### Phase 1: Site foundation

Done when: two sample posts render in both languages with a YouTube and a Bilibili embed, and the language switch changes the nav.

- [x] M1.1 Scaffold Astro + TypeScript (strict) with pnpm; add React and MDX integrations
- [x] M1.2 Design tokens (`src/styles/tokens.css`) and global styles: minimal, light
- [x] M1.3 i18n: Astro routing (`/` English, `/zh/` Chinese), `src/i18n/{en,zh}.json`, `t()` helper, language switch
- [x] M1.4 Content collection: `src/content/posts/<slug>/{en,zh}.mdx`, Zod schema, draft filter in one helper
- [x] M1.5 Base layout: header (nav + language switch), footer (social links), SEO head (`lang`, `hreflang`)
- [x] M1.6 Pages: home, about, links, post list with tag filter, post page, tag page (both languages)
- [x] M1.7 MDX components: `YouTube`, `Bilibili` (plain Markdown images instead of `Figure`); "only in X" note for untranslated posts
- [x] M1.8 Two sample posts (one bilingual, one Chinese-only); `pnpm build` passes
- [x] M1.9 Git init, first commit

### Phase 2: Deploy

Done when: a push to `main` updates the live `*.workers.dev` site.

- [x] M2.1 Create GitHub repo (public), push
- [x] M2.2a Wrangler config for Workers static assets (`wrangler.jsonc`, dry run passes)
- [x] M2.2b Connect Workers Builds to the repo; live at https://harrywu-personal-pages.dh-wuho.workers.dev
- [x] M2.3a RSS per language, sitemap, `robots.txt`, `SITE_URL` build variable
- [ ] M2.3b Open Graph image
- [ ] M2.4 Cloudflare Web Analytics: deferred; turn on automatic setup (no code) once the custom domain is on Cloudflare
- [ ] M2.5 Custom domain (when bought)

### Phase 3: CMS login

Done when: only the owner can log in to `/admin` and see the post list.

- [ ] M3.1 Create the GitHub App (repo-only, Contents read/write)
- [ ] M3.2 Worker routes `/api/auth/login`, `/callback`, `/refresh`, `/logout`; owner ID check; state check
- [ ] M3.3 `/admin` React app shell with the shared tokens
- [ ] M3.4 GitHub API client; post list from the repo (both languages, draft status)

### Phase 4: CMS editor

Done when: a post can be written, previewed and published from the browser in either language.

- [ ] M4.1 CodeMirror 6 editor (Markdown, IME tested with pinyin)
- [ ] M4.2 Frontmatter side panel (title, description, date, tags, draft)
- [ ] M4.3 Live MDX preview with the site's components and styles
- [ ] M4.4 Language tabs, translate mode, "create translation", outdated flag
- [ ] M4.5 Save as one commit (Git Data API), SHA conflict check, localStorage autosave
- [ ] M4.6 Publish = `draft: false` + save; new post flow with slug

### Phase 5: CMS media and tags

Done when: a post with images is published without the terminal.

- [ ] M5.1 Image upload: drag/drop/paste, resize to 2000 px, WebP, insert at cursor
- [ ] M5.2 Tag manager: counts, rename/merge across posts in one commit
- [ ] M5.3 Deploy status from the commit's GitHub check

### Phase 6: Design polish

- [ ] M6.1 Animations: scroll fade-in, hover states, View Transitions; reduced-motion respected
- [ ] M6.2 Typography pass for English and Chinese
- [ ] M6.3 Lighthouse 95+ on mobile; image and font audit

## Next up

- [ ] Look over the site in the browser (`pnpm dev`) and give design feedback
- [ ] Fill in real social URLs (`src/config/site.ts`) and the About page (`src/content/pages/about/`) (when ready)
- [ ] Buy a domain (later)

## Log

### 2026-10-06

- Reviewed the original stack proposal.
- Decided: **Astro** for the site instead of a custom static site generator.
- Decided: **self-built React CMS** at `/admin`, not Decap, Sveltia, Keystatic or TinaCMS.
- Decided: **GitHub App** instead of an OAuth App for CMS login.
- Decided: CodeMirror 6 editor + in-browser MDX preview; drafts via `draft: true`; images in the repo, resized before upload.
- Wrote the design doc: `docs/design.md` (online copy: https://claude.ai/code/artifact/ab06c153-46ed-434d-bfc5-cf3352eda85c).
- Environment: Node 24.2, pnpm 10.32.
- Decided: host on **Cloudflare Workers** (static assets + Workers Builds), not Pages. Free plan: static requests unlimited, 100k Worker calls/day, 3,000 build min/month.
- Decided: content repo is **public** (drafts and history visible; accepted).
- Decided: site in **English + Chinese** at launch. English at `/`, Chinese at `/zh/`; UI strings in `src/i18n/*.json`; posts as `en.mdx` / `zh.mdx` per folder. CMS gets language tabs and a translate mode.
- Decided: **no categories**; free-form tags only, used to filter posts.
- Decided: **domain later**; use the free `*.workers.dev` address until bought.
- Decided: **no comments in v1**; options documented in design.md (giscus recommended when needed).
- Decided: **minimal, light** visual design for site and CMS; light theme only in v1; shared tokens in `src/styles/tokens.css`.
- Decided: start from Astro's **minimal** template, not the Blog starter or a community theme, because i18n, folder layout and styling all differ from those.
- Set up milestones for phases 1–6.
- **Phase 1 built.** Astro 7.3 + React 19 + MDX; 19 static pages; zero JS shipped to visitors.
  - Pages under `src/pages/[...locale]/`: home, posts, post, tags, about, links, RSS; plus 404.
  - Untranslated posts show in both languages with an "only in X" note.
  - Drafts show in `pnpm dev`, not in `pnpm build` (verified).
  - `pnpm build` and `pnpm check` pass (0 errors).
  - TypeScript pinned to v6: `astro check` doesn't support v7 yet.
- Decided: posts are **`.md` by default**, `.mdx` only when they need embeds. The build fails if a folder has both `en.md` and `en.mdx`. About page and the draft sample are now `.md`. The CMS will switch a file to `.mdx` when an embed is inserted.
- Rewrote local commits to use the GitHub noreply email (`5953718+dhwuho@users.noreply.github.com`, set in repo git config). Name stays `HarryW`.
- Pushed to https://github.com/dhwuho/harrywu_personal_pages (`main`).
- Added `wrangler.jsonc` (Worker `harrywu-personal-pages`, static assets from `dist/`, 404 page), `.node-version` (24), `packageManager` pnpm 10.32.1, `pnpm deploy` script. `wrangler deploy --dry-run` passes.
- Wrote `docs/deploy.md`: step-by-step Cloudflare setup.
- **Site is live:** https://harrywu-personal-pages.dh-wuho.workers.dev. Workers Builds deploys every push to `main` (~1 min).
  - Cloudflare settings: production URL on, preview URLs off, Cloudflare Access off.
  - `SITE_URL` build variable set; canonical, RSS and sitemap use the live URL.
- Added `robots.txt` (points to the sitemap, disallows `/admin`).
- Internal links now end in `/` (`trailingSlash: 'always'`); before, each nav click cost a 307 redirect.
- Decided: **no analytics script for now**. Web Analytics will use Cloudflare's automatic setup once a custom domain is on Cloudflare (automatic setup doesn't work on `workers.dev`). Worker Metrics tab covers basic request counts meanwhile.
