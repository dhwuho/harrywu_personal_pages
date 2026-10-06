## Project

Personal website (Astro, static) + self-built React CMS at `/admin` (later phases).
Design: `docs/design.md`. Milestones and log: `docs/progress.md` — update it after each work session.

## Conventions

- English at `/`, Chinese at `/zh/`. Every page lives once under `src/pages/[...locale]/` and uses `localeStaticPaths()`.
- No hard-coded UI text: add keys to `src/i18n/en.json` and `zh.json` (same keys; type-checked) and use `t()`.
- Posts: `src/content/posts/<slug>/{en,zh}.md`; use `.mdx` only when a post needs embeds. Read posts only through `src/lib/content.ts` (it filters drafts and rejects an `en.md` + `en.mdx` pair).
- MDX embeds are plain React in `src/components/mdx/`, passed via `mdxComponents`; articles never import anything.
- Styles: tokens in `src/styles/tokens.css`; minimal, light theme only.
- TypeScript stays on v6 until `astro check` supports v7.

## Commands

- `pnpm build` — static build to `dist/`
- `pnpm check` — type-check
- `pnpm astro dev --background` / `pnpm astro dev stop` — dev server

## Documentation

Full documentation: https://docs.astro.build

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Internationalization](https://docs.astro.build/en/guides/internationalization/)
