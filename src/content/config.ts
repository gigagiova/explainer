import { defineCollection, reference, z } from 'astro:content';

const sections = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    blurb: z.string(),
    order: z.number().default(0),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    section: reference('sections'),
    author: z.string().default('Editor'),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    order: z.number().default(0),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { sections, pages };
