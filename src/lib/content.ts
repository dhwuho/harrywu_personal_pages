import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;
export type PageEntry = CollectionEntry<'pages'>;
export type ContentLang = 'en' | 'zh';

/** Value for the `lang` attribute, so browsers pick the right fonts and line breaking. */
export const htmlLang: Record<ContentLang, string> = { en: 'en', zh: 'zh-CN' };

/** "hello-world/index.mdx" → "hello-world". */
export function postSlug(post: PostEntry): string {
  return post.id.slice(0, post.id.lastIndexOf('/'));
}

/**
 * Published posts, newest first.
 * The only place drafts are filtered: drafts show in `astro dev`, never in a build.
 */
export async function getPosts(): Promise<PostEntry[]> {
  const entries = await getCollection('posts', (e) => import.meta.env.DEV || !e.data.draft);
  const seen = new Set<string>();
  for (const entry of entries) {
    const slug = postSlug(entry);
    if (seen.has(slug)) throw new Error(`Post "${slug}" has both index.md and index.mdx; keep one`);
    seen.add(slug);
  }
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** The post's language: `lang` from frontmatter, else detected from its text. */
export function contentLang(entry: PostEntry | PageEntry): ContentLang {
  return entry.data.lang ?? detectLang(`${entry.data.title}\n${entry.body ?? ''}`);
}

/** Chinese if Chinese characters outnumber English words. */
export function detectLang(text: string): ContentLang {
  const cjk = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0;
  const words = text.match(/[A-Za-z]+/g)?.length ?? 0;
  return cjk > words ? 'zh' : 'en';
}

/** Tags across posts, most used first. Tags are free-form and shown as typed. */
export function collectTags(posts: PostEntry[]): { tag: string; slug: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const item = counts.get(slug) ?? { tag, count: 0 };
      item.count += 1;
      counts.set(slug, item);
    }
  }
  return [...counts.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** URL-safe form of a free-form tag. */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/** A single page by file name, e.g. "about" for src/content/pages/about.md. */
export async function getPage(name: string): Promise<PageEntry | undefined> {
  const entries = await getCollection('pages');
  return entries.find((e) => e.id.replace(/\.mdx?$/, '') === name);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}
