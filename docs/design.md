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
| Analytics | Cloudflare Web Analytics | Free, no cookies |
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
  content/posts/<slug>/en.md       # English version (optional; .mdx if it has embeds)
  content/posts/<slug>/zh.md       # Chinese version (optional; .mdx if it has embeds)
  content/posts/<slug>/*.webp      # images, shared by both versions
  i18n/en.json  i18n/zh.json       # UI strings: nav, buttons, page titles, tag names
  content.config.ts                # frontmatter schema (Zod)
  components/                      # plain React; shared by site + CMS preview
  styles/tokens.css                # colors, fonts, spacing; shared by site + CMS
  layouts/  pages/                 # Astro: thin layer only
  pages/admin/                     # CMS entry; renders the React CMS app
  admin/                           # CMS React app source
worker/                            # Worker script: GitHub App token exchange (/api/auth/*)
public/                            # favicon, fonts, static files
```

### Frontmatter

```yaml
title: "My first post"
description: "One-line summary for lists and SEO"
date: 2026-10-06
updated: 2026-10-08        # optional
tags: [react, life]
cover: ./cover.webp        # optional
draft: true
```

### Rules

- **Drafts:** `draft: true` posts are left out of production builds but shown in `astro dev`.
- **Images:** stored next to their article, resized to max 2000 px and converted to WebP in the browser before upload. Astro makes the responsive sizes at build.
- **Tags:** free-form, typed per post; no categories. Tag pages and a tag filter on the post list are generated. No separate tag file.
- **Slugs:** the folder name is the URL: `/posts/<slug>` (English) and `/zh/posts/<slug>` (Chinese). Slugs are Latin letters, digits and hyphens.
- **Format:** `.md` by default. Use `.mdx` only when a post needs a component such as `<YouTube />` or `<Bilibili />`. A folder must not hold both `en.md` and `en.mdx`; the build fails if it does.
- **Articles stay portable:** no Astro imports inside MDX; embeds are global components (`<YouTube id="..." />`).

## Languages (English + Chinese)

The whole site exists in English and Chinese. A language switch in the header changes the navigation, tab names, buttons and page titles, and keeps you on the same page.

### Site

- **URLs:** English at `/`, Chinese at `/zh/` (Astro i18n routing). Every page has both versions, so the switch always lands on the matching page.
- **UI text:** all nav labels, tab names, buttons and `<title>`s come from `src/i18n/en.json` and `zh.json`. No hard-coded UI text in components.
- **Articles:** each post folder has an English file, a Chinese file, or both (`en.md`/`zh.md`, or `.mdx` with embeds). A post with only one version still appears in both languages: the page uses the visitor's UI language and shows the article with a note ("This article is only in Chinese").
- **Tags:** free-form and shown as typed. Optional display names in the i18n files (`travel` → `旅行`) for tags used in both languages.
- **Fonts:** system CJK fonts (PingFang SC, Microsoft YaHei, Noto Sans SC). No large Chinese web fonts.
- **SEO:** `<html lang>`, `hreflang` links between versions, one RSS feed per language.
- **Remembering the choice:** the switch saves the language in localStorage; the root page offers the saved language on next visit. No automatic redirect, so search engines see both versions.

### CMS

- **Language tabs per post:** `EN | 中文` in the editor. Each version has its own title, description and draft status.
- **Translate mode:** the other language's text shown read-only beside the editor, for side-by-side translation.
- **Create translation:** copies frontmatter (tags, cover, date) and starts an empty body.
- **Outdated flag:** if one version was updated after the other, the CMS marks the other "may be outdated".
- **Chinese input:** CodeMirror 6 supports IME composition; test pinyin input early in phase 4.
- **Counts:** words for English, characters for Chinese.
- **Slugs:** suggested from the English title; typed by hand for Chinese-only posts.
- **Preview:** sets `lang` and uses the site's fonts, so line breaks and punctuation match the live page.
- **CMS UI language:** English for v1; the same i18n files make a Chinese UI easy later.

## CMS design

The CMS is a client-side React app at `/admin`. It talks to the GitHub API directly; the only server code is the login function.

### Login (GitHub App)

1. CMS sends the browser to GitHub's authorize page with the app's client ID and a random `state`.
2. GitHub redirects to `/api/auth/callback` (Cloudflare function).
3. The function checks `state`, swaps the code for a user token using the app secret, and checks the GitHub user ID matches the owner. Anyone else is rejected.
4. The access token goes to the CMS (kept in memory/sessionStorage). The refresh token stays in an httpOnly cookie.
5. Tokens expire after 8 hours; `/api/auth/refresh` gets a new one silently.

The GitHub App is installed on the content repo only, with **Contents: read and write** permission and nothing else.

### Screens

| Screen | What it does |
| --- | --- |
| Post list | All posts with title, date, tags, and Draft/Published status; filter and search |
| Editor | CodeMirror on the left, live preview on the right; frontmatter form in a side panel |
| Images | Drag, drop or paste; resized in the browser; inserted as Markdown at the cursor |
| Tags | List tags with counts; rename or merge across all posts in one commit |
| Deploy status | Shows the latest build result from the commit's GitHub check |

### Saving and publishing

- **Save** = one commit with the article and its new images, using the Git Data API (blobs, tree, commit, update ref). One save, one commit.
- **Publish** = set `draft: false` and save. The commit to `main` triggers the Cloudflare build.
- **Draft saves** also trigger a build, but drafts are not in the output. Add `[skip ci]` to draft commit messages if build minutes matter (check host support).
- **Conflicts:** each save sends the file's last known SHA. If the file changed on GitHub, the CMS shows a warning instead of overwriting.
- **Local autosave:** the open draft is kept in localStorage so a closed tab loses nothing.

### File format

- New posts are created as `.md`.
- Inserting an embed (YouTube, Bilibili) switches that language's file to `.mdx`; the save commits the rename and the edit together.
- If the last embed is removed, the CMS offers to switch back to `.md`.
- The preview compiles `.md` as Markdown and `.mdx` as MDX, matching the build.

### Preview

The preview compiles MDX in the browser with `@mdx-js/mdx` `evaluate`, using the same remark/rehype plugins and React components as the site, and the site's CSS. It updates as you type (debounced ~300 ms).

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
| Motion | Subtle: fade/slide-in on scroll, hover underlines, page transitions (Astro View Transitions); off when `prefers-reduced-motion` |
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
| Languages | English + Chinese, full UI in both | English only | Audience on both LinkedIn and Bilibili |

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Astro or React breaking changes | Pin versions; upgrade on purpose. Content is plain Markdown/MDX and components are plain React, so a move is days, not a rewrite |
| Preview differs from the live page | Share one MDX plugin config and one component map between site and CMS |
| Repo grows from images | Resize and convert to WebP before upload; move images to R2 if needed |
| Token leak | GitHub App limited to one repo, contents only; 8-hour tokens; refresh token in an httpOnly cookie; strict CSP on `/admin` |
| Someone else logs in | The function allows only the owner's GitHub user ID |
| Hydration errors in animated parts | Keep islands small; avoid `window`, dates and random values during render |
| Lost edits | localStorage autosave plus SHA conflict check on save |
| Public repo shows drafts and history | Accepted. Only finished-enough drafts get committed; use GitHub's noreply email for commits; never commit secrets |
| Chinese IME glitches in the editor | Test pinyin input in CodeMirror early in phase 4 |

## Build plan

Each phase ends with something live. Dates are open until scope is confirmed.

1. **Site foundation:** Astro + React + MDX + TypeScript; English/Chinese routing and UI strings; base layout, home, about, links page, post list, post page, tag pages.
    - Done when: two sample posts render locally in both languages with a YouTube and a Bilibili embed, and the switch changes the nav.
2. **Deploy:** connect the repo to Cloudflare (free `*.workers.dev` address), RSS, sitemap, Open Graph tags, analytics. Custom domain once bought.
    - Done when: a push to `main` updates the live site.
3. **CMS login:** GitHub App, callback and refresh function, owner check, `/admin` shell.
    - Done when: only the owner can log in and see the post list.
4. **CMS editor:** CodeMirror, language tabs and translate mode, frontmatter form, live MDX preview, save as one commit, conflict check, autosave.
    - Done when: a post can be written, previewed and published from the browser.
5. **CMS media and tags:** image upload with resize, tag rename/merge, deploy status.
    - Done when: a post with images is published without touching the terminal.
6. **Design polish:** animations, typography, performance pass (Lighthouse 95+).
7. **Later:** Pagefind search, Chinese CMS UI, comments (see Comments).

## Open questions

- [x] Cloudflare Workers static assets or Pages? **Workers** (decided 2026-10-06)
- [x] Domain name? **Later**, once bought; use the free `*.workers.dev` address until then.
- [x] Content repo public or private? **Public** (decided 2026-10-06)
- [x] Site language? **English + Chinese at launch** (decided 2026-10-06)
- [x] Categories? **None**; free-form tags only.
- [x] Comments? **Not for now**; options in Comments (later).
- [x] Visual direction? **Minimal and light**, same look for site and CMS; no reference sites.
