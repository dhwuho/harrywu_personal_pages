import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One folder per post: src/content/posts/<slug>/{en,zh}.mdx → id "<slug>/<lang>".
const posts = defineCollection({
  loader: glob({ pattern: '*/{en,zh}.{md,mdx}', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

// Editable single pages, e.g. src/content/pages/about/{en,zh}.mdx.
const pages = defineCollection({
  loader: glob({ pattern: '*/{en,zh}.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, pages };
