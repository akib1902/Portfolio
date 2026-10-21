import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for the DEF-001 accessibility defect: Swiss Editorial sets
 * --amber to near-black for its monochrome paper design, which made the
 * footer brand and CTA accent text invisible (~1.05:1) on the dark inverse
 * panels. The fix introduced --inverse-accent for accents on inverse
 * surfaces; this test parses themes.css and proves every shipped theme clears
 * WCAG AA (4.5:1) for that token on its inverse background.
 */

const themesCss = readFileSync(path.join(import.meta.dirname, 'themes.css'), 'utf8');

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '').trim();
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function tokensForTheme(theme: string): Record<string, string> {
  const match = themesCss.match(new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([\\s\\S]*?)\\}`));
  if (!match) throw new Error(`theme block not found: ${theme}`);
  const tokens: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/);
    if (pair) tokens[pair[1]] = pair[2];
  }
  return tokens;
}

const THEMES = ['amber-minimal', 'graphite-terminal', 'swiss-editorial', 'warm-bento', 'forest-sand'];

describe('theme inverse-surface contrast (DEF-001 regression)', () => {
  it('defines --inverse-accent in the :root defaults', () => {
    expect(themesCss).toMatch(/--inverse-accent:/);
  });

  for (const theme of THEMES) {
    it(`${theme}: --inverse-accent clears 4.5:1 on --inverse-bg`, () => {
      const tokens = tokensForTheme(theme);
      expect(tokens['inverse-accent'], `--inverse-accent missing in ${theme}`).toBeTruthy();
      expect(tokens['inverse-bg'], `--inverse-bg missing in ${theme}`).toBeTruthy();
      const ratio = contrastRatio(tokens['inverse-accent'], tokens['inverse-bg']);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme}: --inverse-ink and --inverse-muted clear 4.5:1 on --inverse-bg`, () => {
      const tokens = tokensForTheme(theme);
      expect(contrastRatio(tokens['inverse-ink'], tokens['inverse-bg'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens['inverse-muted'], tokens['inverse-bg'])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
