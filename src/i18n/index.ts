import en from './en.json';
import zh from './zh.json';
import tagNames from './tags.json';

export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** Value for the `lang` / `hreflang` attributes. */
export const htmlLang: Record<Locale, string> = { en: 'en', zh: 'zh-CN' };

export type UiKey = keyof typeof en;
// Fails type-checking if zh.json is missing a key from en.json.
const dicts: Record<Locale, Record<UiKey, string>> = { en, zh };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** Translate a UI string; `{name}` placeholders are filled from `vars`. */
export function t(lang: Locale, key: UiKey, vars: Record<string, string> = {}): string {
  const text = dicts[lang][key] ?? dicts[defaultLocale][key];
  return text.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? `{${name}}`);
}

/**
 * Prefix a site path with the locale and add the trailing slash pages are served with:
 * `/posts` → `/posts/` (English), `/zh/posts/` (Chinese). File paths like `/rss.xml` keep no slash.
 */
export function localePath(lang: Locale, path = '/'): string {
  let clean = path.startsWith('/') ? path : `/${path}`;
  if (!clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) clean += '/';
  return lang === defaultLocale ? clean : `/${lang}${clean}`;
}

/** Split `/zh/posts/x` into `{ lang: 'zh', path: '/posts/x' }`. */
export function splitLocale(pathname: string): { lang: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/');
  if (isLocale(first) && first !== defaultLocale) {
    return { lang: first, path: `/${rest.join('/')}` };
  }
  return { lang: defaultLocale, path: pathname };
}

/** `getStaticPaths` entries for pages under `src/pages/[...locale]/`. */
export function localeStaticPaths() {
  return locales.map((lang) => ({
    params: { locale: lang === defaultLocale ? undefined : lang },
    props: { lang },
  }));
}

/** Display name for a free-form tag; falls back to the tag as typed. */
export function tagLabel(lang: Locale, tag: string): string {
  const names: Record<string, string> = tagNames[lang];
  return names[tag] ?? tag;
}

/** URL-safe form of a free-form tag. */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

export function formatDate(lang: Locale, date: Date): string {
  return new Intl.DateTimeFormat(htmlLang[lang], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
