/**
 * Seed profile used to initialise the content store.
 *
 * CONTENT POLICY
 * Only factual, supplied details belong here. Do not add years of experience,
 * employers, testimonials, certifications, or client metrics without evidence.
 *
 * CONTACT DETAILS
 * Email and social URLs are intentionally left empty rather than guessed.
 * Once the administrator fills them in through /admin/profile, the UI links,
 * footer icons, mailto fallback, and structured data appear automatically.
 */

import type { Profile, SocialKey, SocialLink } from './types';

export const profile: Profile = {
  name: 'Akib Ahmed',
  firstName: 'Akib',
  initials: 'AA',
  role: 'Software Engineer',
  headline: 'Software engineer building, testing, and deploying reliable systems',
  disciplines: ['Full-Stack Development', 'DevOps', 'QA Automation'],
  positioning: 'Software Engineer · Full-Stack Development · DevOps · QA Automation',
  intro:
    'I build full-stack applications, automate delivery pipelines, and test software for reliability. I focus on turning ideas into maintainable, production-ready systems.',
  shortIntro:
    'I build reliable web applications, automate the path to production, and test the parts that matter.',
  location: 'Bangladesh',
  timezone: 'GMT+6',
  workPreference: 'Open to remote work',
  availability: {
    available: true,
    label: 'Available for opportunities',
    detail: 'Open to freelance projects and full-time engineering roles.',
  },
  education: {
    field: 'Computer Science & Engineering',
    status: 'Graduate',
    note: 'Institution and academic records available on request.',
  },
  /** Set to a public address to enable the email fallback and mailto links. */
  email: null,
  /** Set each to a full URL once the profile exists. */
  links: {
    github: null,
    linkedin: null,
    upwork: null,
  },
  /** Optional real portrait, e.g. '/media/portrait-....jpg'. Falls back to a typographic plate. */
  portrait: null,
  portraitAlt: 'Portrait of Akib Ahmed',
  /** Optional page-specific social image. Falls back to /og.png. */
  shareImage: null,
  resume: {
    href: '/resume',
    pdf: '/akib-ahmed-resume.pdf',
    label: 'Resume',
    note: 'Print-ready resume. Download the PDF or use your browser to save a fresh copy.',
  },
  responseNote:
    'I read every message myself. Share a little context about what you are building and the timeline you have in mind.',
  principles: [
    {
      title: 'Design for failure',
      body: 'Networks time out, workers restart, and third parties misbehave. Retries, idempotency, and observable state are part of the design — not a later patch.',
    },
    {
      title: 'Test behaviour, not implementation',
      body: 'Tests should describe what the system promises. Fast unit checks protect logic; integration and end-to-end tests protect the promises users actually depend on.',
    },
    {
      title: 'Automate the path to production',
      body: 'A deploy should be repeatable, gated by evidence, and reversible. If a step only works because someone remembers it, it is a risk.',
    },
  ],
};

export const socialLabels: Record<SocialKey, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  upwork: 'Upwork',
};

/** Returns only links that have actually been configured. */
export function activeSocialLinks(source: Profile = profile): SocialLink[] {
  return (Object.keys(source.links) as SocialKey[])
    .filter((key) => Boolean(source.links[key]))
    .map((key) => ({ key, label: socialLabels[key], href: source.links[key] as string }));
}

export function contactMailto(subject: string, source: Profile = profile): string | null {
  if (!source.email) return null;
  return `mailto:${source.email}?subject=${encodeURIComponent(subject)}`;
}
