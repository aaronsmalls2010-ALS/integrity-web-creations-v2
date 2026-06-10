// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://www.integritywebcreations.com',
  // maxDuration: 60s — PDF route needs extra time for serverless Chromium cold start
  adapter: vercel({ maxDuration: 60 }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});