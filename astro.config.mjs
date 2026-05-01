import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Site is served at root. If you later publish under a project
// page (e.g. https://<user>.github.io/explainer), set `base` to
// the project name and adjust `site` accordingly.
export default defineConfig({
  site: 'https://gigagiova.github.io',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
    react(),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { strict: false }]],
    shikiConfig: { theme: 'github-light' },
  },
  devToolbar: { enabled: false },
});
