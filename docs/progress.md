# Progress Log

Tracks milestones, what's done, and decisions made.
Design: [design.md](design.md) · Setup and deployment: [setup-guide.md](setup-guide.md)

## Status by phase

| # | Phase | Status |
| --- | --- | --- |
| 0 | Planning and design doc | Done |
| 1 | Site foundation (Astro + React + MDX) | Done (visual check pending) |
| 2 | Deploy to Cloudflare Workers, RSS, sitemap, OG | Done |
| 3 | CMS login (GitHub App + auth Worker) | Done |
| 4 | CMS editor (CodeMirror, Chinese input, preview, save) | Done |
| 5 | CMS media and tags | Done |
| 6 | Polish (design, performance, search) | Done |
| 7 | Launch (custom domain, Web Analytics) | Waiting on a bought domain |

## Milestones

### Phase 1: Site foundation

Done when: an English and a Chinese sample post render with a YouTube and a Bilibili embed.

- [x] M1.1 Scaffold Astro + TypeScript (strict) with pnpm; add React and MDX integrations
- [x] M1.2 Design tokens (`src/styles/tokens.css`) and global styles: minimal, light
- [x] M1.3 ~~Bilingual site (`/zh/`, UI strings, language switch)~~ replaced by: English UI, posts in English or Chinese with `lang` marking
- [x] M1.4 Content collection: `src/content/posts/<slug>/index.md(x)`, Zod schema, draft filter in one helper
- [x] M1.5 Base layout: header (nav), footer (social links), SEO head
- [x] M1.6 Pages: home, about, links, post list with tag filter, post page, tag page
- [x] M1.7 MDX components: `YouTube`, `Bilibili` (plain Markdown images instead of `Figure`)
- [x] M1.8 Sample posts (one English, one Chinese, one draft); `pnpm build` passes
- [x] M1.9 Git init, first commit

### Phase 2: Deploy

Done when: a push to `main` updates the live `*.workers.dev` site.

- [x] M2.1 Create GitHub repo (public), push
- [x] M2.2a Wrangler config for Workers static assets (`wrangler.jsonc`, dry run passes)
- [x] M2.2b Connect Workers Builds to the repo; live at https://harrywu-personal-pages.dh-wuho.workers.dev
- [x] M2.3a RSS, sitemap, `robots.txt`, `SITE_URL` build variable
- [x] M2.3b Open Graph image: post cover (cropped 1200×630), else `public/og-default.png`

### Phase 3: CMS login

Done when: only the owner can log in to `/admin` and see the post list.

- [x] M3.1 GitHub App created and installed; client ID `Iv23liB5KQiPAssQtfQT` in `wrangler.jsonc`; secret set in Cloudflare
- [x] M3.2 Worker routes `/api/auth/login`, `/callback`, `/session` (with refresh), `/logout`; owner ID check; state check; CSRF header (tested locally)
- [x] M3.3 `/admin/` React app shell with the shared tokens; CSP headers
- [x] M3.4 GitHub API client; post list from the repo (with language and draft status)

### Phase 4: CMS editor

Done when: a post can be written in English or Chinese, previewed and published from the browser.

- [x] M4.1 CodeMirror 6 editor (Markdown; Chinese text input tested; real pinyin IME to confirm on your machine)
- [x] M4.2 Frontmatter side panel (title, description, date, tags, cover, language, draft)
- [x] M4.3 Live MDX preview with the site's components and styles
- [x] M4.4 Chinese support: language auto-detect with override, character count for Chinese, CJK fonts in editor and preview
- [x] M4.5 Save as one commit (Git Data API), SHA conflict check, localStorage autosave (commit path needs a real sign-in to confirm)
- [x] M4.6 Publish = `draft: false` + save; new post flow with slug; delete post

### Phase 5: CMS media and tags

Done when: a post with images is published without the terminal.

- [x] M5.1 Image upload: drag/drop/paste, resize to 2000 px, WebP, insert at cursor; cover picker/upload
- [x] M5.2 Tag manager: counts, rename/merge across posts in one commit
- [x] M5.3 Deploy status from the commit's GitHub check

### Phase 6: Polish

Done when: pages animate subtly (none with reduced motion), English and Chinese posts read well, Lighthouse mobile is 95+, and search finds English and Chinese posts.

- [x] M6.1 Animations (CSS only, no JS): page fade between pages (View Transitions), content settle-in, scroll fade-in for list items/images/videos, hover underline and arrow, nav accent bar; all off with reduced motion
- [x] M6.2 Typography: balanced headings, pretty wrapping, lists, tables, code (light theme), footnotes; Chinese: strict line breaks, Chinese–Latin spacing, no fake italics
- [x] M6.3 Lighthouse mobile: 100 / 100 / 100 / 100 on home, posts and search. Videos are click-to-play placeholders (player loads on click); system fonts only; images optimized by Astro
- [x] M6.4 Search page `/search/` (Pagefind): one index with Chinese word splitting; indexes posts and About; `?q=` prefill

### Phase 7: Launch

Done when: the site is served on the custom domain, old `workers.dev` links still work, and Web Analytics shows visits.
Starts only after the domain is bought. Nothing else waits on it.

- [ ] M7.1 Buy the domain (Cloudflare Registrar, or elsewhere with nameservers moved to Cloudflare)
- [ ] M7.2 Worker → Settings → Domains & Routes → add the custom domain
- [ ] M7.3 Update the `SITE_URL` build variable; rebuild; check canonical, RSS, sitemap, OG image URLs
- [ ] M7.4 GitHub App: add the new callback URL (keep the `workers.dev` one until the switch is verified)
- [ ] M7.5 Redirect `workers.dev` to the custom domain (or turn its route off) so search engines see one address
- [ ] M7.6 Web Analytics: automatic setup on the domain (no code)

### When you want it (not scheduled)

- Comments: giscus first (options in design.md → Comments).
- Restyle the CMS and the editor (current look is functional; to be redesigned later).

### No-domain rule (phases 1–6)

So the domain never blocks other work:
- The site address comes only from the `SITE_URL` build variable. No domain is written in code.
- CMS login builds its callback URL from the current request's origin, so it works on `workers.dev`, `localhost` and the future domain.
- Auth cookies are host-only (no `Domain=` attribute), so they work on any host.

## Next up

- [ ] Look over the site in the browser (`pnpm dev`) and give design feedback
- [ ] Fill in real social URLs (`src/config/site.ts`) and the About page (`src/content/pages/about/`) (when ready)
- [ ] Buy a domain (whenever; phase 7)

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
- Wrote `docs/deploy.md` (now `docs/setup-guide.md`): step-by-step Cloudflare setup.
- **Site is live:** https://harrywu-personal-pages.dh-wuho.workers.dev. Workers Builds deploys every push to `main` (~1 min).
  - Cloudflare settings: production URL on, preview URLs off, Cloudflare Access off.
  - `SITE_URL` build variable set; canonical, RSS and sitemap use the live URL.
- Added `robots.txt` (points to the sitemap, disallows `/admin`).
- Internal links now end in `/` (`trailingSlash: 'always'`); before, each nav click cost a 307 redirect.
- Decided: **no analytics script for now**. Web Analytics will use Cloudflare's automatic setup once a custom domain is on Cloudflare (automatic setup doesn't work on `workers.dev`). Worker Metrics tab covers basic request counts meanwhile.
- Added link-preview (Open Graph) images: a post's `cover` is cropped to 1200×630; a cover on either language version is used for both; pages without one use `public/og-default.png` (made by `scripts/make-og-default.mjs`). Also `og:type`, `og:site_name`, `twitter:card`.
- Moved everything that needs a domain (custom domain, Web Analytics, GitHub App callback update, `workers.dev` redirect) into a separate **last phase (8)**. Added a no-domain rule so phases 1–7 never wait on it.
- **Changed: site UI is English only.** Removed `/zh/` pages, the language switch, `src/i18n/` and translation pairs. Posts and the About page can still be written in Chinese: each post's `lang` comes from frontmatter or is detected from the text, and the article is marked `lang="zh-CN"` for Chinese fonts and 1.8 line height. Content is now `src/content/posts/<slug>/index.md(x)` and `src/content/pages/about.md`. One RSS feed. CMS drops language tabs/translate mode; keeps Chinese input, language field and character counts.
- **CMS built (phases 3–5).** `/admin/` React app (`src/admin/`) + sign-in Worker (`worker/index.ts`).
  - Sign-in: GitHub App flow, owner ID check (5953718), tokens in httpOnly cookies, silent refresh, CSRF header. Tested locally with `wrangler dev`: redirects, state check, 401/403 paths, session token.
  - Editor: CodeMirror, live MDX/Markdown preview with the site's components, metadata panel, embeds from pasted links, image resize to 2000 px WebP, cover picker, autosave + restore, Ctrl/Cmd+S, delete post. Auto `.md` ↔ `.mdx`.
  - Tags page: rename/merge in one commit. Deploy status banner after each save.
  - Browser walkthrough (headless Chromium) passed in read-only mode, on `astro dev` and through the Worker with CSP on.
  - CMS-written files (Chinese post with cover, `.mdx`→`.md` switch, tag rename) build on the site.
  - Not yet tested: real commits to GitHub (needs your GitHub App). Commit code uses the standard Git Data API.
  - Added `docs/cms-setup.md` (now part of `docs/setup-guide.md`), `public/_headers` (CSP for `/admin/*`), `src/lib/lang.ts` (shared helpers).
- GitHub App client ID set and deployed. Live check: `/api/auth/login` redirects to GitHub with the right callback; `/api/auth/session` answers "Not signed in" (so the secret is set). Waiting on the first real sign-in (`setup-guide.md` 4f).
- **CMS works end to end.** First real sign-in and save from the live site: commit `ffffa04` "Publish: A draft post" (CMS commits use the noreply email). Phases 3–5 done.
- **Fixed: delete/save failing with "Update is not a fast forward".** GitHub API responses carry `max-age=60`, so the browser served a cached branch head for up to a minute after any commit; the next commit was built on a stale parent. All CMS GitHub requests now use `cache: 'no-store'` (verified in a browser: the second read now reaches GitHub). File contents keep their own cache, keyed by blob SHA.
- Merged phases 6 and 7 into **Phase 6: design polish, performance and search**. Comments moved to "When you want it", with a CMS/editor restyle. The domain phase is now **phase 7**.
- **Phase 6 done.** CSS-only motion and typography pass; light code theme (`github-light`); click-to-play video placeholders (`srcdoc`, no page JS); Pagefind search at `/search/` (build runs `astro build && pagefind`; `pagefind.yml` forces one `zh`-segmented index so English pages find Chinese posts; no English stemming). Lighthouse mobile 100 in all categories on `/`, both posts and `/search/`. CMS preview re-tested with the new embeds under CSP.
- Combined phases 6 and 7 into **Phase 6: Polish and launch**: polish (M6.1–M6.4, done) and launch (custom domain and Web Analytics, M6.5–M6.10, waiting on the domain).
- Split again: **Phase 6: Polish** (done) and **Phase 7: Launch** (custom domain and Web Analytics, M7.1–M7.6).
- Merged `docs/deploy.md` and `docs/cms-setup.md` into **`docs/setup-guide.md`** (deployment, CMS sign-in, local development, troubleshooting, custom domain).
