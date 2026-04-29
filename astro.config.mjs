import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Update `site` and `base` if you publish under a project page
// (e.g. https://<user>.github.io/explainer). For a custom domain
// or a user/organization page, set `base` back to '/'.
export default defineConfig({
  site: 'https://gigagiova.github.io',
  base: '/explainer',
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
});
