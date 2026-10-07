// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Set by the SITE_URL build variable on Cloudflare (see docs/setup-guide.md).
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  // Cloudflare serves pages as /path/; links must match to avoid a redirect.
  trailingSlash: 'always',
  // Light code blocks to match the site (Astro's default theme is dark).
  markdown: { shikiConfig: { theme: 'github-light' } },
  integrations: [mdx(), react(), sitemap({ filter: (page) => !page.includes('/admin/') })],
});
