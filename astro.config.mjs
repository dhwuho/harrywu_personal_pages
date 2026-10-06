// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Set by the SITE_URL build variable on Cloudflare (see docs/deploy.md).
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  // Cloudflare serves pages as /path/; links must match to avoid a redirect.
  trailingSlash: 'always',
  integrations: [mdx(), react(), sitemap()],
});
