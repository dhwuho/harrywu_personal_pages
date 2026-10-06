import { Document, isSeq, parse } from 'yaml';

/** Frontmatter fields the CMS edits. Unknown fields are kept as they are. */
export interface PostMeta {
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  updated?: string;
  tags: string[];
  cover?: string;
  lang?: 'en' | 'zh';
  draft: boolean;
  [key: string]: unknown;
}

const FIELD_ORDER = ['title', 'description', 'date', 'updated', 'tags', 'cover', 'lang', 'draft'];
/** Required by the site's schema, so written even when empty. */
const REQUIRED = new Set(['title', 'description', 'date']);
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyMeta(): PostMeta {
  return { title: '', description: '', date: today(), tags: [], draft: true };
}

/** Split a Markdown file into frontmatter and body. */
export function parsePost(source: string): { meta: PostMeta; body: string } {
  const match = source.match(FRONTMATTER);
  const raw = (match ? parse(match[1]) : {}) ?? {};
  const body = match ? source.slice(match[0].length) : source;
  const asDate = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? undefined : String(v));
  const meta: PostMeta = {
    ...raw,
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    date: asDate(raw.date) ?? today(),
    updated: asDate(raw.updated),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    cover: raw.cover ? String(raw.cover) : undefined,
    lang: raw.lang === 'en' || raw.lang === 'zh' ? raw.lang : undefined,
    draft: raw.draft === true,
  };
  return { meta, body: body.replace(/^\r?\n/, '') };
}

/** Join frontmatter and body back into a file. Known fields first, empty optional fields dropped. */
export function serializePost(meta: PostMeta, body: string): string {
  const ordered: Record<string, unknown> = {};
  const keys = [...FIELD_ORDER, ...Object.keys(meta).filter((k) => !FIELD_ORDER.includes(k))];
  for (const key of keys) {
    const value = meta[key];
    if (!REQUIRED.has(key) && (value === undefined || value === '' || value === null)) continue;
    if (key === 'tags' && Array.isArray(value) && value.length === 0) continue;
    ordered[key] = value;
  }
  ordered.draft = meta.draft;
  const doc = new Document(ordered);
  const tags = doc.get('tags', true);
  if (isSeq(tags)) tags.flow = true;
  const yaml = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.replace(/^\n+/, '').trimEnd()}\n`;
}
