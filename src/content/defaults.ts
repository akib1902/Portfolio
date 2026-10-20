import { profile } from './profile';
import { skills } from './skills';
import { projects } from './projects';
import type { PublicContent } from './types';

/**
 * The content that seeds an empty database.
 *
 * Everything a visitor sees is authored in the CMS once the site is running;
 * this module exists so a fresh installation still renders the same editorial
 * portfolio it shipped with.
 */
export function seedContent(now = new Date().toISOString()): PublicContent {
  return structuredClone({
    profile,
    skills,
    projects,
    settings: { defaultTheme: 'amber-minimal' },
    site: { url: null },
    generatedAt: now,
  } satisfies PublicContent);
}

export const defaultContent: PublicContent = seedContent();
