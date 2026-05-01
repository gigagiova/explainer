# Explainer

A personal site for interactive math and stats explainers. Built with
Astro, MDX, and React islands.

## Scope: personal use only

This site is for the author and at most a handful of friends. It is
not a public publication. Treat it that way:

- No marketing copy, taglines, hero sections, or "About" pages.
- No top navigation, no site header, no footer. Inner pages have a
  small back link near the title and that is the entire navigation
  system.
- Do not add SEO metadata, Open Graph tags, sitemaps, robots.txt,
  analytics, social share buttons, RSS, or related apparatus that only
  matters for strangers arriving via Google. Skip them unless asked.
- Default the chrome down. The reader should land on content. Cut
  anything that exists for the benefit of an audience the site does
  not have.

When in doubt, cut it.

## Voice: no AI-speak

I write the prose here, including article copy, code comments,
commit messages, and chat replies. The author does not want to read
text that signals "this was written by an LLM." The following list is
the result of looking up the most-flagged tells in current AI-detection
literature; treat it as a hard ban, not a guideline.

### Banned punctuation

- **Em-dash (`—`) and en-dash (`–`) used as a sentence break.** This
  is the single strongest tell in casual prose. Use a comma, a period,
  parentheses, or a colon. Hyphens in compound words ("first-cousin",
  "intuition-first") are fine.

### Banned sentence templates

- "Not just X, but Y." / "It's not X, it's Y." / "More than X, it's
  Y." Any contrastive escalator. State what you mean once, directly.
- "It's worth noting that...", "It's important to note that...",
  "Keep in mind...", "Note that..." Throat-clearing. Just say it.
- "In today's fast-paced world", "In an era of", "In the realm of",
  "At the heart of", "When it comes to". Empty scene-setting.
- "Whether you're a [X], a [Y], or a [Z]..." Audience-flattering
  opener.
- Tricolons where the three items are the same thing dressed up three
  ways.

### Banned vocabulary

delve, delving, dive into, tapestry, landscape (figurative), leverage
(as a verb), utilize, robust, seamless, streamline, comprehensive,
multifaceted, crucial, pivotal, vibrant, ever-evolving, ever-changing,
foster, embark, journey, realm, navigate the complexities of, unleash,
unlock (potential), captivating, resonate, holistic, synergy,
showcase, harness, empower, testament to, speaks volumes, stands as,
plays a (pivotal/crucial/key) role, boasts, underscores, in essence,
furthermore, moreover, additionally (as a paragraph hinge),
game-changer, revolutionary, cutting-edge, state-of-the-art.

Prefer the plain alternative: "use" not "utilize", "help" not
"facilitate", "start" not "embark on", "many" not "myriad", "show"
not "showcase", "many-sided" or just deleting the word not
"multifaceted".

### Banned reply openers

"Certainly!", "Of course!", "Absolutely!", "Great question!",
"I'd be happy to...", "Let me dive in.", "Here's a breakdown:".
Skip the warmup. Start with the answer.

### Banned reply closers

"I hope this helps!", "Feel free to ask...", "Let me know if you have
any other questions!", "In conclusion", "In summary", "Ultimately",
"At the end of the day". The reply ends when the answer ends.

### Positive direction

Vary sentence length, mixing short with long; uniform cadence is
itself a strong AI tell. Use concrete nouns. If a sentence could
appear word for word in a hundred other documents on a hundred
unrelated topics, rewrite it so it could only appear in this one.

## Where things live

- `src/content/sections/<id>.md`: section definitions (frontmatter
  with `title`, `blurb`, `order`).
- `src/content/pages/<slug>.mdx`: articles. Use `$...$` and `$$...$$`
  for math (KaTeX). Avoid the Unicode `½` glyph in math mode; use
  `\tfrac{1}{2}` instead, since KaTeX has no metrics for it and warns.
- `src/components/<Name>.tsx`: interactive React widgets, one per
  file. Loaded as Astro islands with `client:load`.
- `src/layouts/BaseLayout.astro`: bare HTML shell, no header or
  footer.
- `src/layouts/ArticleLayout.astro`: article shell with back link to
  the section.
- `src/styles/global.css`: single editorial stylesheet.

## Local dev

`npm run dev`, or via `.claude/launch.json` and `preview_start`. Astro
requires a server restart on `astro.config.mjs` changes; content and
component edits hot-reload.

## Deploy

`base` is `/`. The GitHub Actions workflow at
`.github/workflows/deploy.yml` publishes to GitHub Pages. Because the
repo is named `explainer`, GitHub serves it at
`https://gigagiova.github.io/explainer/`, which will break root-relative
paths in production. To fix when needed, rename the repo to
`gigagiova.github.io` (user page, served at root) or add a `CNAME`
file under `public/` for a custom domain.
