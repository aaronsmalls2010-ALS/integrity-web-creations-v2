// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.integritywebcreations.com',
  // maxDuration: 60s — PDF route needs extra time for serverless Chromium cold start
  adapter: vercel({ maxDuration: 60 }),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
