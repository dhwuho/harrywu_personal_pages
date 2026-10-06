// Pure helpers shared by the site build and the CMS (no Astro imports).

export type ContentLang = 'en' | 'zh';

/** Value for the `lang` attribute, so browsers pick the right fonts and line breaking. */
export const htmlLang: Record<ContentLang, string> = { en: 'en', zh: 'zh-CN' };

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/g;
const WORD = /[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g;

/** Chinese if Chinese characters outnumber English words. */
export function detectLang(text: string): ContentLang {
  const cjk = text.match(CJK)?.length ?? 0;
  const words = text.match(WORD)?.length ?? 0;
  return cjk > words ? 'zh' : 'en';
}

/** English words + Chinese characters, the usual way each language is counted. */
export function countText(text: string): { words: number; chars: number } {
  return { words: text.match(WORD)?.length ?? 0, chars: text.match(CJK)?.length ?? 0 };
}

/** URL-safe form of a free-form tag. */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Valid post folder name: lowercase Latin letters, digits and single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Suggest a slug from a title; empty when the title has no Latin letters. */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** True when the body uses a JSX component (e.g. `<YouTube />`), so the file must be .mdx. */
export function needsMdx(body: string): boolean {
  return /<[A-Z][A-Za-z0-9]*[\s/>]/.test(body.replace(/```[\s\S]*?```|`[^`\n]*`/g, ''));
}
