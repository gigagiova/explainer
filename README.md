# Explainer

Interactive, intuition-first derivations of mathematical and statistical
ideas. Built with Astro + MDX + React islands; deployed to GitHub Pages.

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:4321/explainer
pnpm build    # outputs ./dist
pnpm preview
```

## Add a new piece

1. **Sections** are folders of related explainers. Add one by dropping a
   markdown file into `src/content/sections/<id>.md` with frontmatter:

   ```yaml
   ---
   title: Your section title
   blurb: One-line description.
   order: 2
   ---
   ```

2. **Pages** live in `src/content/pages/<slug>.mdx` and reference a
   section by id:

   ```yaml
   ---
   title: "Your piece title"
   subtitle: "Optional standfirst."
   section: genetics
   summary: "One-paragraph summary used in listings + meta."
   order: 1
   ---
   ```

   Use Markdown + LaTeX (`$...$` and `$$...$$`) freely. Import any React
   widget from `src/components/` and drop it in with `client:load`.

3. **Interactive widgets** are React components in `src/components/`.
   Keep one widget per file; they are isolated islands.

## Deploy

GitHub Actions builds and publishes on every push to `master` via
`.github/workflows/deploy.yml`. Configure the repository's Pages source
to "GitHub Actions" once.

If you publish under a different path (e.g. user/organization page or
custom domain), update `site` and `base` in `astro.config.mjs`.
