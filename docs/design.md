# Personal Website + CMS — Technical Design

As of 2026-10-06 · Online copy: https://claude.ai/code/artifact/ab06c153-46ed-434d-bfc5-cf3352eda85c

## Overview

We will build a personal website with **Astro** and a **self-built React CMS** at `/admin`. Content lives in GitHub, and Cloudflare hosts the site.

**Goal:** a beautiful personal site for articles, profile and social links, plus a small CMS to write and publish from the browser.

**Principles**

- **Static first:** every public page is HTML generated at build time.
- **No database:** GitHub is the only store for code, articles and images.
- **Minimal backend:** one small Cloudflare function, only for GitHub login.
- **Low lock-in:** articles are plain Markdown (MDX only when needed), components are plain React, and Astro stays a thin layer.
- **Single user:** only the owner can log in to the CMS.

## Requirements

### P0: Website

1. Publish articles written in Markdown/MDX.
2. About page with a personal profile.
3. Links to GitHub, LinkedIn, YouTube, Bilibili, Instagram and other platforms.
4. Embed or link external videos and photos.
5. Static pages for speed and SEO.
6. Responsive, modern UI with custom animations.

### P0: CMS

1. Single user, no collaboration.
2. Log in with GitHub.
3. Markdown/MDX editor in the browser.
4. Save drafts and publish.
5. Preview an article before publishing.
6. Manage tags (free-form; used to filter posts).
7. Upload images.
8. Store articles and images in GitHub.
9. Publishing triggers a rebuild and deploy.

### Added (small, but expected)

- RSS feed and sitemap
- Open Graph tags and images for link previews
- Analytics (Cloudflare Web Analytics)
- Site search (Pagefind), can follow after launch

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript | Type safety across site, CMS and function |
| Site framework | Astro (built on Vite) | Static HTML, MDX, routing and sitemap/RSS built in; ships JS only for interactive parts |
| UI components | React | Interactive and animated parts on the site, and the whole CMS |
| Content format | Markdown (`.md`) by default; MDX (`.mdx`) only for posts with embeds | Plain Markdown is simpler and portable; MDX adds components like `<YouTube />` |
| Content schema | Astro content collections (Zod) | Build fails on bad frontmatter |
| MDX pipeline | unified (remark/rehype) + @mdx-js | One pipeline for the site build and the CMS preview |
| CMS editor | CodeMirror 6 | Solid Markdown source editing, easy to customize |
| CMS preview | @mdx-js `evaluate` in the browser | Same components as the live site |
| Auth | GitHub App (user access token) | Access to one repo only, fine-grained permissions |
| Backend | One Cloudflare function | Swaps the login code for a token; holds the app secret |
| Storage | GitHub repo | Code, articles and images; no database |
| Hosting | Cloudflare Workers (static assets + Workers Builds) | Free: unlimited static requests, 100k function calls/day, 3,000 build min/month; Cloudflare's path forward over Pages |
| Domain | Cloudflare Registrar | At-cost pricing, same dashboard |
| Media | YouTube, Bilibili iframes; Instagram links | Instagram's embed API needs a Meta token |
| Analytics | Cloudflare Web Analytics (phase 6 launch, with the domain) | Free, no cookies |
| Search | Pagefind (static index built after `astro build`) | No server; Chinese word splitting; ~zero cost |
| Video embeds | Click-to-play placeholders (`srcdoc` iframe) | Player JS (~1 MB) loads only on click |
| Package manager | pnpm | Fast; already installed |

## Architecture

GitHub is the only store; every save is a commit that rebuilds the site.

```text
┌──────────────┐  edits   ┌──────────────┐   save   ┌──────────────┐
│ You (owner)  │ ───────▶ │ CMS /admin   │ ───────▶ │ GitHub repo  │
│ browser      │          │ CodeMirror + │          │ MDX + images │
└──────────────┘          │ MDX preview  │          └──────┬───────┘
                          └──────┬───────┘                 │ push to main
                    login,       ▲▼                        ▼
                    refresh ┌──────────────┐        ┌──────────────┐
                            │ Auth function│        │ Cloudflare   │
                            │ (Cloudflare) │        │ build (Astro)│
                            │ owner ID only│        │ drafts out   │
                            └──────────────┘        └──────┬───────┘
                                                           │ deploy
┌──────────────┐          static HTML               ┌──────▼───────┐
│ Visitors     │ ◀───────────────────────────────── │ Cloudflare   │
│ fast, SEO    │                                    │ CDN + domain │
└──────────────┘                                    └──────────────┘
```

The owner writes in the CMS, each save is a commit to GitHub, and a push to `main` makes Cloudflare rebuild and serve the static site. The auth function is the only server code.

## Repo layout and content model

One repo holds the site, the CMS, the function and all content.

```text
src/
  content/posts/<slug>/index.md    # the post, English or Chinese (.mdx if it has embeds)
  content/posts/<slug>/*.webp      # the post's images
  content.config.ts                # frontmatter schema (Zod)
  components/                      # plain React; shared by site + CMS preview
  styles/tokens.css                # colors, fonts, spacing; shared by site + CMS
  layouts/  pages/                 # Astro: thin layer only
  pages/admin/                     # CMS entry; renders the React CMS app
  admin/                           # CMS React app (App, GitHub client, editor, preview)
  lib/lang.ts                      # language detection, slugs; shared by site + CMS
worker/                            # Worker script: GitHub App token exchange (/api/auth/*)
public/                            # favicon, og-default.png, _headers (CMS security headers)
docs/                              # design, progress, deploy and CMS setup guides
```

### Frontmatter

```yaml
title: "My first post"
description: "One-line summary for lists and SEO"
date: 2026-10-06
updated: 2026-10-08        # optional
tags: [react, life]
cover: ./cover.webp        # optional; link-preview image (else og-default.png)
lang: zh                   # optional; en or zh, detected from the text if left out
draft: true
```

### Rules

- **Drafts:** `draft: true` posts are left out of production builds but shown in `astro dev`.
- **Cover / link preview:** `cover` becomes the share image (cropped to 1200×630). No cover → `public/og-default.png`.
- **Images:** stored next to their article, resized to max 2000 px and converted to WebP in the browser before upload. Astro makes the responsive sizes at build.
- **Tags:** free-form, typed per post; no categories. Tag pages and a tag filter on the post list are generated. No separate tag file.
- **Slugs:** the folder name is the URL: `/posts/<slug>/`. Slugs are Latin letters, digits and hyphens.
- **Format:** `.md` by default. Use `.mdx` only when a post needs a component such as `<YouTube />` or `<Bilibili />`. A folder must not hold both `index.md` and `index.mdx`; the build fails if it does.
- **Articles stay portable:** no Astro imports inside MDX; embeds are global components (`<YouTube id="..." />`).

## Languages

The site's interface is **English only**: one set of pages, no `/zh/` URLs, no language switch. **Posts and the About page can be written in English or Chinese**, and both render and edit well.

### Site

- **One language per post.** A post is written in English or Chinese; there are no translation pairs.
- **Language marking:** each post's `lang` is set in frontmatter or detected from its text (Chinese if Chinese characters outnumber English words). The article gets `lang="zh-CN"` or `lang="en"`, so browsers pick the right fonts, line breaking and punctuation.
- **Chinese typography:** line height 1.8 for Chinese text; system CJK fonts (PingFang SC, Microsoft YaHei, Noto Sans SC); no large Chinese web fonts.
- **Mixed text:** a Chinese post can quote English and the reverse; the font stack covers both.
- **Tags:** free-form, shown as typed (Chinese tags are fine).
- **UI text:** written in English directly in the components and `src/config/site.ts`.

### CMS

- **Chinese input:** CodeMirror 6 supports IME composition; test pinyin input early in phase 4.
- **Language field:** auto-filled from the text; can be overridden in the frontmatter panel.
- **Counts:** words for English, characters for Chinese.
- **Slugs:** suggested from an English title; typed by hand (Latin letters) for Chinese titles.
- **Preview:** sets `lang` and uses the site's fonts, so line breaks and punctuation match the live page.
- **CMS UI language:** English.

## CMS design

The CMS is a client-side React app at `/admin/` (`src/admin/`, loaded with `client:only`). It talks to the GitHub API directly; the only server code is the sign-in Worker (`worker/index.ts`). Setup steps: `docs/cms-setup.md`.

### Sign-in (GitHub App)

1. `/api/auth/login` sends the browser to GitHub's authorize page with the app's client ID and a random `state` (cookie, 10 min).
2. GitHub redirects to `/api/auth/callback`. The Worker checks `state`, swaps the code for tokens with the app secret, and checks the GitHub user ID equals `OWNER_ID`. Anyone else gets "Not allowed".
3. Access and refresh tokens are stored in httpOnly, Secure, SameSite=Strict, host-only cookies scoped to `/api/auth`.
4. The page calls `POST /api/auth/session` (with an `X-CMS` header as a CSRF guard) to get a short-lived access token; it refreshes silently before the 8-hour expiry.
5. The callback URL comes from the request's origin, so `workers.dev`, `localhost:8787` and a future domain all work.

The GitHub App is installed on this repo only: Contents read/write, Checks and Commit statuses read-only.

### Screens (hash routes, so `/admin/` is one static page)

| Route | Screen | What it does |
| --- | --- | --- |
| `#/` | Post list | All posts (drafts included) with status, language, tags and date; search, tag and status filters |
| `#/new`, `#/edit/<slug>` | Editor | CodeMirror + live preview + metadata panel; Write / Split / Preview views |
| `#/tags` | Tags | Tags with counts; rename or merge across all posts in one commit |
| (banner) | Deploy status | After each save: Building… → Live / Failed, from the commit's GitHub checks |

### Editor

- **Toolbar:** Image (also drag/drop/paste), YouTube and Bilibili (paste a link; the CMS writes the embed code). Blocks are inserted with blank lines around them.
- **Metadata panel:** title, slug (suggested from an English title; fixed after the first save), description, date, updated (+ "Mark updated today"), tags (with suggestions), language (Auto shows the detected one), cover image (pick from the post's images or upload).
- **Buttons:** drafts show **Save draft** + **Publish**; published posts show **Unpublish** + **Save**. Ctrl/Cmd+S saves.
- **Counts:** words for English, characters for Chinese.
- **Delete post:** removes the folder (article and images) in one commit, after a confirm.

### Saving and publishing

- **Save** = one commit with the article and its new images, using the Git Data API (blobs, tree, commit, update ref). One save, one commit. Uploaded images the post no longer references are not committed.
- **Publish** = set `draft: false` and save. The commit to `main` triggers the Cloudflare build.
- **Draft saves** also trigger a build, but drafts are not in the output.
- **Conflicts:** each save sends the file's last known SHA. If the file changed on GitHub, the save stops and says so; the text stays in this browser's autosave.
- **Local autosave:** unsaved work is kept in localStorage; reopening the post offers Restore / Discard. Leaving with unsaved changes asks first.

### File format

- New posts are created as `.md`.
- A post that uses a component (`<YouTube />`, `<Bilibili />`) is saved as `.mdx`; when the last component is removed it is saved as `.md` again. The rename and the edit are one commit.
- The preview compiles `.md` as Markdown and `.mdx` as MDX (with GFM), matching the build, so syntax errors show before saving.

### Preview

Compiled in the browser with `@mdx-js/mdx` `evaluate`, using the site's embed components and CSS. Relative images resolve to images added this session or to the public raw GitHub URL. Updates ~300 ms after typing stops. The editor bundle (CodeMirror + MDX compiler, ~300 KB gzipped) loads only when a post is opened.

### Security

- `/admin/*` sends a Content Security Policy: scripts only from the site; network calls only to the site and `api.github.com`; images only from the site, `blob:`/`data:`, raw GitHub and YouTube thumbnails; frames only YouTube and Bilibili; no framing of the CMS. `unsafe-eval` is allowed because the live preview compiles MDX.
- `/admin/` is `noindex`, disallowed in `robots.txt` and left out of the sitemap. The page itself holds no secrets.

### Local development

- `pnpm dev`: no Worker, so the CMS offers a pasted fine-grained token (this tab only) or read-only mode.
- `pnpm build && pnpm wrangler dev`: full sign-in at `localhost:8787` with a `.dev.vars` secret.

## Visual design

Minimal and light, for both the site and the CMS. Content first, lots of white space, one accent color.

| Element | Choice |
| --- | --- |
| Theme | Light only for v1; dark mode can come later |
| Background | White `#FFFFFF`, soft surface `#FAFAF9` for cards and the CMS sidebar |
| Text | Primary `#1C1C1C`, secondary `#6B6B6B` |
| Borders | `#E7E5E4`, 1 px; small radius (6–8 px); no heavy shadows |
| Accent | One muted blue (`#2F6FEB`) for links, focus and active tabs |
| Fonts | System sans with CJK fallbacks (PingFang SC, Microsoft YaHei, Noto Sans SC); monospace for code and the editor |
| Reading width | ~680 px for articles |
| Body text | 17 px, line height 1.75 (1.8 for Chinese) |
| Motion | CSS only (no JS): cross-page fade (View Transitions), content settle-in, scroll fade-in, hover underlines; off when `prefers-reduced-motion` |
| CMS | Same tokens; quiet, distraction-free editor; preview uses the site's exact styles |

Colors, fonts and spacing live as CSS variables in one file (`src/styles/tokens.css`), shared by the site and the CMS.

## Comments (later)

Not in v1. Options, for when it's needed:

| Option | Where comments live | Reader needs | Backend | Notes |
| --- | --- | --- | --- | --- |
| **giscus** | GitHub Discussions in the public repo | GitHub account | None | Best fit: free, no ads, no DB. GitHub can be slow from mainland China |
| utterances | GitHub Issues | GitHub account | None | Older, less active; prefer giscus |
| Waline | Its own DB (LeanCloud, MySQL, PostgreSQL, etc.) | Nothing (anonymous OK) | Small server | Popular on Chinese blogs; breaks "no database" |
| Twikoo | MongoDB or Tencent CloudBase | Nothing | Small server | Common on Chinese blogs; China-friendly hosting |
| Cusdis | Hosted free tier, or self-host | Nothing | Hosted | Lightweight, privacy-friendly, few features |
| Disqus | Hosted | Optional | None | Ads on free plan, tracking, heavy; avoid |
| Self-built | Cloudflare D1 + Worker + Turnstile | Nothing | Our Worker | Full control, same stack; we build moderation and spam handling |

**Recommendation:** start with giscus. If many Chinese readers lack GitHub accounts, switch to Waline or a self-built D1 version.

## Key decisions

| Decision | Chosen | Rejected | Reason |
| --- | --- | --- | --- |
| Static site generation | Astro | Custom SSG on Vite | Hydration, per-page bundles, image handling and SEO extras are already solved; time goes to design and CMS instead |
| CMS | Self-built React app | Decap, Sveltia, Keystatic, TinaCMS | Need a fully custom write page and MDX preview that matches the site. Decap: old UI, weak MDX, OAuth App only. Tina: needs a database |
| GitHub auth | GitHub App | GitHub OAuth App | OAuth App's `repo` scope reaches every repo; a GitHub App reaches only the content repo |
| Editor | CodeMirror 6 (source + preview) | WYSIWYG (Milkdown, TipTap) | MDX components round-trip cleanly as source; WYSIWYG can be added later |
| Image storage | In the repo, resized | Cloudflare R2 | Simplest; move to R2 only if the repo grows past ~1 GB |
| Drafts | `draft: true` frontmatter | Drafts branch | One branch, no merges, easy preview in dev |
| Categories | None; free-form tags | Fixed categories | Tags alone are enough to filter; less to manage |
| Repo visibility | Public | Private | Published articles are public anyway; drafts and history being visible is accepted |
| Languages | English UI; posts in English or Chinese | Full bilingual site (`/zh/`, translations) | Less to build and maintain; Chinese posts still render and edit well |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Astro or React breaking changes | Pin versions; upgrade on purpose. Content is plain Markdown/MDX and components are plain React, so a move is days, not a rewrite |
| Preview differs from the live page | Share one MDX plugin config and one component map between site and CMS |
| Repo grows from images | Resize and convert to WebP before upload; move images to R2 if needed |
| Token leak | GitHub App limited to one repo, contents only; 8-hour tokens; tokens in httpOnly cookies; CSP on `/admin/` limits where the page can send data |
| Someone else logs in | The function allows only the owner's GitHub user ID |
| Hydration errors in animated parts | Keep islands small; avoid `window`, dates and random values during render |
| Lost edits | localStorage autosave plus SHA conflict check on save |
| Public repo shows drafts and history | Accepted. Only finished-enough drafts get committed; use GitHub's noreply email for commits; never commit secrets |
| Chinese IME glitches in the editor | Test pinyin input in CodeMirror early in phase 4 |

## Build plan

Each phase ends with something live. Dates are open until scope is confirmed.

1. **Site foundation:** Astro + React + MDX + TypeScript; base layout, home, about, links page, post list, post page, tag pages.
    - Done when: an English and a Chinese sample post render with a YouTube and a Bilibili embed.
2. **Deploy:** connect the repo to Cloudflare (free `*.workers.dev` address), RSS, sitemap, Open Graph tags.
    - Done when: a push to `main` updates the live site.
3. **CMS login:** GitHub App, callback and refresh function, owner check, `/admin` shell.
    - Done when: only the owner can log in and see the post list.
4. **CMS editor:** CodeMirror (Chinese IME tested), frontmatter form with language field, live MDX preview, save as one commit, conflict check, autosave.
    - Done when: a post can be written, previewed and published from the browser.
5. **CMS media and tags:** image upload with resize, tag rename/merge, deploy status.
    - Done when: a post with images is published without touching the terminal.
6. **Polish and launch:** animations, typography, performance pass (Lighthouse 95+), Pagefind search; then, once a domain is bought, add it to the Worker, update `SITE_URL` and the GitHub App callback, redirect `workers.dev`, turn on automatic Web Analytics.
    - Nothing except the launch steps depends on a domain: the address comes only from `SITE_URL`, login callbacks use the request's origin, and cookies are host-only.

Not scheduled, done when wanted: comments (see Comments), a restyle of the CMS and editor.

## Open questions

- [x] Cloudflare Workers static assets or Pages? **Workers** (decided 2026-10-06)
- [x] Domain name? **Later**, once bought; use the free `*.workers.dev` address until then.
- [x] Content repo public or private? **Public** (decided 2026-10-06)
- [x] Site language? **English UI; posts in English or Chinese** (changed 2026-10-06 from a full bilingual site)
- [x] Categories? **None**; free-form tags only.
- [x] Comments? **Not for now**; options in Comments (later).
- [x] Visual direction? **Minimal and light**, same look for site and CMS; no reference sites.
