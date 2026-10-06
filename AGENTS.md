## Project

Personal website (Astro, static) + self-built React CMS at `/admin` (later phases).
Design: `docs/design.md`. Milestones and log: `docs/progress.md` — update it after each work session.

## Conventions

- Site UI is English only. Posts and the About page may be English or Chinese: mark containers with `lang={htmlLang[contentLang(entry)]}`.
- Posts: `src/content/posts/<slug>/index.md`; use `.mdx` only when a post needs embeds. Read posts only through `src/lib/content.ts` (it filters drafts and rejects an `index.md` + `index.mdx` pair).
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
