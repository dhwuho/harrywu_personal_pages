import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Ids keep the file extension ("hello-world/en.mdx") so an en.md + en.mdx pair
// fails the build in src/lib/content.ts instead of one silently replacing the other.
const keepPath = ({ entry }: { entry: string }) => entry;

// One folder per post: src/content/posts/<slug>/{en,zh}.{md,mdx}.
// Use .md by default; .mdx only when the post needs components (embeds).
const posts = defineCollection({
  loader: glob({ pattern: '*/{en,zh}.{md,mdx}', base: './src/content/posts', generateId: keepPath }),
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

// Editable single pages, e.g. src/content/pages/about/{en,zh}.md.
const pages = defineCollection({
  loader: glob({ pattern: '*/{en,zh}.{md,mdx}', base: './src/content/pages', generateId: keepPath }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, pages };
