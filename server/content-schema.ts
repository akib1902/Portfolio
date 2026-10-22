import { z } from 'zod';
import { projectFilters, themeIds } from '../src/content/types';
import type { ProjectCategory } from '../src/content/types';

export function isSafeUrl(value: string): boolean {
  if (value === '') return true;
  if (value.startsWith('/')) {
    // Site-relative path: no traversal, no protocol-relative URLs, no whitespace.
    return /^\/[A-Za-z0-9\-._~/?=&%+]*$/.test(value) && !value.includes('..');
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const url = z
  .string()
  .trim()
  .max(600, 'URLs must be 600 characters or fewer.')
  .refine(isSafeUrl, 'Enter a full http(s) URL or a site-relative path starting with /.');

const nullableUrl = z
  .union([z.literal(''), url])
  .nullable()
  .transform((value) => (value ? value : null));

/** Administrator-defined contact links must point somewhere external and real. */
const externalUrl = z
  .string()
  .trim()
  .max(600, 'URLs must be 600 characters or fewer.')
  .refine(
    (value) => /^https?:\/\//i.test(value) && isSafeUrl(value),
    'Enter a full http(s) URL, for example https://example.com.',
  );

const email = z
  .string()
  .trim()
  .max(254)
  .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address.')
  .nullable()
  .transform((value) => (value ? value : null));

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

const slug = z
  .string()
  .trim()
  .min(1, 'A slug is required.')
  .max(90)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens.');

const categoryValues = projectFilters.filter(
  (filter): filter is ProjectCategory => filter !== 'All',
);
const categories = z.enum(categoryValues as [ProjectCategory, ...ProjectCategory[]]);

export const profileInputSchema = z
  .object({
    name: requiredText(80),
    firstName: requiredText(40),
    initials: requiredText(4),
    role: requiredText(80),
    headline: text(160),
    disciplines: z.array(text(60)).max(8),
    positioning: text(160),
    intro: text(600),
    shortIntro: text(300),
    location: text(80),
    timezone: text(40),
    workPreference: text(80),
    availability: z
      .object({
        available: z.boolean(),
        label: text(80),
        detail: text(240),
      })
      .strict(),
    education: z
      .object({
        field: text(120),
        status: text(80),
        note: text(300),
      })
      .strict(),
    email,
    links: z
      .object({
        github: nullableUrl,
        linkedin: nullableUrl,
        upwork: nullableUrl,
        more: z
          .array(
            z
              .object({
                id: requiredText(64),
                label: requiredText(40),
                href: externalUrl,
              })
              .strict(),
          )
          .max(10, 'Keep the additional links to 10 or fewer.'),
      })
      .strict(),
    portrait: nullableUrl,
    portraitAlt: text(160),
    shareImage: nullableUrl,
    resume: z
      .object({
        href: url,
        pdf: url,
        label: text(60),
        note: text(300),
      })
      .strict(),
    responseNote: text(400),
    principles: z
      .array(
        z
          .object({
            title: requiredText(120),
            body: requiredText(600),
          })
          .strict(),
      )
      .max(6),
  })
  .strict();

export const skillsInputSchema = z
  .object({
    note: text(600),
    groups: z
      .array(
        z
          .object({
            id: slug,
            index: text(4),
            title: requiredText(80),
            kicker: text(120),
            description: text(300),
            items: z.array(requiredText(80)).max(30),
            highlighted: z.array(requiredText(80)).max(10),
          })
          .strict(),
      )
      .min(1, 'Keep at least one skill group.')
      .max(12)
      .refine(
        (groups) => new Set(groups.map((group) => group.id)).size === groups.length,
        'Skill group ids must be unique.',
      ),
  })
  .strict();

export const projectInputSchema = z
  .object({
    slug,
    title: requiredText(140),
    shortTitle: requiredText(90),
    category: categories,
    categories: z.array(categories).min(1, 'Choose at least one discipline.').max(4),
    status: z.enum(['draft', 'published']),
    statusLabel: text(80),
    summary: requiredText(500),
    value: text(400),
    stack: z.array(requiredText(60)).max(24),
    diagram: z.enum(['agent', 'platform', 'pipeline']),
    diagramCaption: text(300),
    focus: text(200),
    featured: z.boolean(),
    position: z.number().int().min(0).max(999),
    image: nullableUrl,
    sections: z
      .array(
        z
          .object({
            id: slug,
            index: text(4),
            title: requiredText(140),
            paragraphs: z.array(text(4000)).max(30).optional(),
            bullets: z.array(text(400)).max(30).optional(),
          })
          .strict(),
      )
      .max(20),
    links: z
      .object({
        repo: nullableUrl,
        live: nullableUrl,
      })
      .strict(),
    evidenceNote: text(1000),
  })
  .strict();

export const settingsInputSchema = z.object({ defaultTheme: z.enum(themeIds) }).strict();

export const loginSchema = z
  .object({
    email: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(200),
  })
  .strict();

export const statusInputSchema = z.object({ status: z.enum(['draft', 'published']) }).strict();

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type SkillsInput = z.infer<typeof skillsInputSchema>;
export type ProjectPayload = z.infer<typeof projectInputSchema>;
