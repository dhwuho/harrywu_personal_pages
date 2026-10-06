export const site = {
  title: 'Harry Wu',
  description: 'Notes on software, life and things I make.',
  intro: "Hi, I'm Harry. I write about software, life and the things I make.",
};

export interface SocialLink {
  name: string;
  url: string;
  /** Short line shown on the Links page. */
  note: string;
}

// TODO: replace the placeholder URLs with your real profiles.
export const socialLinks: SocialLink[] = [
  { name: 'GitHub', url: 'https://github.com/', note: 'Code and projects' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/', note: 'Work and career' },
  { name: 'YouTube', url: 'https://www.youtube.com/', note: 'Videos' },
  { name: 'Bilibili', url: 'https://space.bilibili.com/', note: 'Videos in Chinese' },
  { name: 'Instagram', url: 'https://www.instagram.com/', note: 'Photos' },
];
