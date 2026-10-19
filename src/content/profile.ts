/**
 * Single source of truth for the public profile.
 *
 * CONTENT POLICY
 * Only factual, supplied details belong here. Do not add years of experience,
 * employers, testimonials, certifications, or client metrics without evidence.
 *
 * CONTACT DETAILS
 * Email and social URLs are intentionally left empty rather than guessed.
 * Fill them in and the UI links, footer icons, mailto fallback, and structured
 * data appear automatically. See README.md → "Connect your details".
 */

export type SocialKey = 'github' | 'linkedin' | 'upwork';

export interface SocialLink {
  key: SocialKey;
  label: string;
  href: string;
}

export const profile = {
  name: 'Akib Ahmed',
  firstName: 'Akib',
  initials: 'AA',
  role: 'Software Engineer',
  disciplines: ['Full-Stack Development', 'DevOps', 'QA Automation'] as const,
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
  email: null as string | null,
  /** Replace `null` with the full URL once each profile exists. */
  links: {
    github: null as string | null,
    linkedin: null as string | null,
    upwork: null as string | null,
  },
  /** Optional real portrait, e.g. '/portrait.jpg'. Falls back to a typographic plate. */
  portrait: null as string | null,
  portraitAlt: 'Portrait of Akib Ahmed',
  resume: {
    href: '/resume',
    label: 'Resume',
    note: 'Print-ready resume. Use your browser to save it as a PDF.',
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
} as const;

export const socialLabels: Record<SocialKey, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  upwork: 'Upwork',
};

/** Returns only links that have actually been configured. */
export function activeSocialLinks(): SocialLink[] {
  return (Object.keys(profile.links) as SocialKey[])
    .filter((key) => Boolean(profile.links[key]))
    .map((key) => ({ key, label: socialLabels[key], href: profile.links[key] as string }));
}

export function contactMailto(subject = 'Project inquiry'): string | null {
  if (!profile.email) return null;
  return `mailto:${profile.email}?subject=${encodeURIComponent(subject)}`;
}
