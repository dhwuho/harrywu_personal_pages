import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { localePath, localeStaticPaths, t, type Locale } from '../../i18n';
import { getPostViews } from '../../lib/content';

export const getStaticPaths = localeStaticPaths;

/** One feed per language: /rss.xml and /zh/rss.xml. Only posts written in that language. */
export async function GET(context: APIContext) {
  const lang = context.props.lang as Locale;
  const views = (await getPostViews(lang)).filter((v) => !v.isFallback);
  return rss({
    title: t(lang, 'site.title'),
    description: t(lang, 'site.description'),
    site: context.site!,
    items: views.map(({ slug, post }) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: localePath(lang, `/posts/${slug}`),
      categories: post.data.tags,
    })),
    customData: `<language>${lang === 'zh' ? 'zh-CN' : 'en'}</language>`,
  });
}
