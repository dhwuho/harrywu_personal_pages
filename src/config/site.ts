import type { Locale } from '../i18n';

export interface SocialLink {
  name: string;
  url: string;
  /** Short line shown on the Links page. */
  note: Record<Locale, string>;
}

// TODO: replace the placeholder URLs with your real profiles.
export const socialLinks: SocialLink[] = [
  { name: 'GitHub', url: 'https://github.com/', note: { en: 'Code and projects', zh: '代码和项目' } },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/', note: { en: 'Work and career', zh: '工作经历' } },
  { name: 'YouTube', url: 'https://www.youtube.com/', note: { en: 'Videos', zh: '视频' } },
  { name: 'Bilibili', url: 'https://space.bilibili.com/', note: { en: 'Videos in Chinese', zh: '中文视频' } },
  { name: 'Instagram', url: 'https://www.instagram.com/', note: { en: 'Photos', zh: '照片' } },
];
