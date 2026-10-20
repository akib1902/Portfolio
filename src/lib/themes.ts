import { themeIds, themeLabels } from '@/content/types';
import type { ThemeId } from '@/content/types';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  /** Browser chrome colour for this theme. */
  themeColor: string;
}

/**
 * The five supported themes. Colours live in CSS as token overrides; this list
 * only carries the metadata the switcher, the admin preview, and
 * <meta name="theme-color"> need.
 */
export const themes: ThemeDefinition[] = [
  {
    id: 'amber-minimal',
    label: themeLabels['amber-minimal'],
    description: 'Warm ivory paper, charcoal type, restrained amber accents.',
    themeColor: '#f5f0e8',
  },
  {
    id: 'graphite-terminal',
    label: themeLabels['graphite-terminal'],
    description: 'Graphite surfaces, high-contrast text, technical amber highlights.',
    themeColor: '#16181a',
  },
  {
    id: 'swiss-editorial',
    label: themeLabels['swiss-editorial'],
    description: 'White space, black type, strict alignment, almost no decoration.',
    themeColor: '#fbfaf7',
  },
  {
    id: 'warm-bento',
    label: themeLabels['warm-bento'],
    description: 'Warm neutral canvas, modular cards, balanced information density.',
    themeColor: '#f1e7db',
  },
  {
    id: 'forest-sand',
    label: themeLabels['forest-sand'],
    description: 'Sand backgrounds, deep forest panels, muted brass highlights.',
    themeColor: '#efe4d2',
  },
];

export const THEME_STORAGE_KEY = 'akib-portfolio-theme';

export function themeById(id: string): ThemeDefinition | undefined {
  return themes.find((theme) => theme.id === id);
}

export function themeMetaContent(id: string): string {
  return themeById(id)?.themeColor ?? themes[0].themeColor;
}

/** Validates an arbitrary stored value against the supported themes. */
export function normaliseTheme(value: unknown): ThemeId | null {
  return typeof value === 'string' && (themeIds as readonly string[]).includes(value)
    ? (value as ThemeId)
    : null;
}

export const themeIdsInOrder: readonly ThemeId[] = themeIds;
