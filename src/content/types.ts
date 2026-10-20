/**
 * Shared content types.
 *
 * These types describe the public content document that the database stores,
 * the server validates, and the React app renders. They intentionally contain
 * no framework-specific code so the server, the admin UI, and the public site
 * can all import them.
 */

export const themeIds = [
  'amber-minimal',
  'graphite-terminal',
  'swiss-editorial',
  'warm-bento',
  'forest-sand',
] as const;

export type ThemeId = (typeof themeIds)[number];

export const themeLabels: Record<ThemeId, string> = {
  'amber-minimal': 'Amber Minimal',
  'graphite-terminal': 'Graphite Terminal',
  'swiss-editorial': 'Swiss Editorial',
  'warm-bento': 'Warm Bento',
  'forest-sand': 'Forest & Sand',
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (themeIds as readonly string[]).includes(value);
}

export type SocialKey = 'github' | 'linkedin' | 'upwork';

export interface SocialLink {
  key: SocialKey;
  label: string;
  href: string;
}

export interface Availability {
  available: boolean;
  label: string;
  detail: string;
}

export interface Education {
  field: string;
  status: string;
  note: string;
}

export interface Principle {
  title: string;
  body: string;
}

export interface ProfileLinks {
  github: string | null;
  linkedin: string | null;
  upwork: string | null;
}

export interface ResumeSettings {
  href: string;
  pdf: string;
  label: string;
  note: string;
}

export interface Profile {
  name: string;
  firstName: string;
  initials: string;
  role: string;
  headline: string;
  disciplines: string[];
  positioning: string;
  intro: string;
  shortIntro: string;
  location: string;
  timezone: string;
  workPreference: string;
  availability: Availability;
  education: Education;
  email: string | null;
  links: ProfileLinks;
  portrait: string | null;
  portraitAlt: string;
  shareImage: string | null;
  resume: ResumeSettings;
  responseNote: string;
  principles: Principle[];
}

export interface SkillGroup {
  id: string;
  index: string;
  title: string;
  kicker: string;
  description: string;
  items: string[];
  /** Shown in the home page summary and the resume. */
  highlighted: string[];
}

export interface SkillsDocument {
  groups: SkillGroup[];
  note: string;
}

export const projectFilters = [
  'All',
  'Full-Stack',
  'Backend',
  'DevOps',
  'QA / Automation',
] as const;

export type ProjectFilter = (typeof projectFilters)[number];
export type ProjectCategory = Exclude<ProjectFilter, 'All'>;
export type DiagramKind = 'agent' | 'platform' | 'pipeline';
export type ProjectStatus = 'draft' | 'published';

export interface CaseStudySection {
  id: string;
  index: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: ProjectCategory;
  categories: ProjectCategory[];
  status: ProjectStatus;
  statusLabel: string;
  summary: string;
  value: string;
  stack: string[];
  diagram: DiagramKind;
  diagramCaption: string;
  focus: string;
  featured: boolean;
  position: number;
  image: string | null;
  sections: CaseStudySection[];
  links: {
    repo: string | null;
    live: string | null;
  };
  evidenceNote: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface SiteSettings {
  defaultTheme: ThemeId;
}

export interface PublicContent {
  profile: Profile;
  skills: SkillsDocument;
  projects: Project[];
  settings: SiteSettings;
  site: {
    url: string | null;
  };
  generatedAt: string;
}
