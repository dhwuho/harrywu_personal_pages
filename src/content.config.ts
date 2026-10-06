import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Ids keep the file extension ("hello-world/index.mdx") so an index.md + index.mdx pair
// fails the build in src/lib/content.ts instead of one silently replacing the other.
const keepPath = ({ entry }: { entry: string }) => entry;

// One folder per post: src/content/posts/<slug>/index.md, plus its images.
// Use .md by default; .mdx only when the post needs components (embeds).
const posts = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: './src/content/posts', generateId: keepPath }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      /** Language the post is written in. Detected from the text when left out. */
      lang: z.enum(['en', 'zh']).optional(),
      draft: z.boolean().default(false),
    }),
});

// Single editable pages, e.g. src/content/pages/about.md.
const pages = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/pages', generateId: keepPath }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    lang: z.enum(['en', 'zh']).optional(),
  }),
});

export const collections = { posts, pages };
