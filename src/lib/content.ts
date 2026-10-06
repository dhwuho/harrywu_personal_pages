import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, isLocale, locales, tagSlug, type Locale } from '../i18n';

export type PostEntry = CollectionEntry<'posts'>;
export type PageEntry = CollectionEntry<'pages'>;

/** All language versions of one post. */
export interface PostGroup {
  slug: string;
  versions: Partial<Record<Locale, PostEntry>>;
}

/** The version to show for a UI language, and whether it is a fallback. */
export interface PostView {
  slug: string;
  post: PostEntry;
  postLang: Locale;
  isFallback: boolean;
}

/** Split an entry id like "hello-world/zh" into its slug and language. */
export function parseEntryId(id: string): { slug: string; lang: Locale } {
  const cut = id.lastIndexOf('/');
  const slug = id.slice(0, cut);
  const lang = id.slice(cut + 1);
  if (!isLocale(lang)) throw new Error(`Content file "${id}" must be named en.mdx or zh.mdx`);
  return { slug, lang };
}

/**
 * Every post, grouped by slug, newest first.
 * The only place drafts are filtered: drafts show in `astro dev`, never in a build.
 */
export async function getPostGroups(): Promise<PostGroup[]> {
  const entries = await getCollection('posts', (e) => import.meta.env.DEV || !e.data.draft);
  const groups = new Map<string, PostGroup>();
  for (const entry of entries) {
    const { slug, lang } = parseEntryId(entry.id);
    const group = groups.get(slug) ?? { slug, versions: {} };
    group.versions[lang] = entry;
    groups.set(slug, group);
  }
  return [...groups.values()].sort((a, b) => latestDate(b) - latestDate(a));
}

function latestDate(group: PostGroup): number {
  return Math.max(...Object.values(group.versions).map((p) => p!.data.date.getTime()));
}

/** Pick the version for `lang`, falling back to the other language. */
export function viewFor(group: PostGroup, lang: Locale): PostView {
  const order = [lang, ...locales.filter((l) => l !== lang)];
  const postLang = order.find((l) => group.versions[l])!;
  return { slug: group.slug, post: group.versions[postLang]!, postLang, isFallback: postLang !== lang };
}

export async function getPostViews(lang: Locale): Promise<PostView[]> {
  return (await getPostGroups()).map((g) => viewFor(g, lang));
}

/** Tags used by the posts shown in `lang`, most used first. */
export function collectTags(views: PostView[]): { tag: string; slug: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const { post } of views) {
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

/** A single page (e.g. "about") in `lang`, falling back to the default language. */
export async function getPage(name: string, lang: Locale): Promise<PageEntry | undefined> {
  const entries = await getCollection('pages');
  const find = (l: Locale) => entries.find((e) => e.id === `${name}/${l}`);
  return find(lang) ?? find(defaultLocale);
}
