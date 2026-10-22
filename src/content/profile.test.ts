import { describe, expect, it } from 'vitest';
import {
  activeContactLinks,
  activeSocialLinks,
  profile as seedProfile,
  socialLabels,
} from './profile';
import type { Profile } from './types';

function withLinks(patch: Partial<Profile['links']>): Profile {
  return { ...seedProfile, links: { ...seedProfile.links, ...patch } };
}

describe('activeSocialLinks', () => {
  it('returns nothing for the seed profile, which has no configured links', () => {
    expect(activeSocialLinks(seedProfile)).toEqual([]);
  });

  it('ignores the extra links list so footer and structured data stay fixed', () => {
    const source = withLinks({
      github: 'https://github.com/akib',
      more: [{ id: 'x', label: 'X', href: 'https://x.com/akib' }],
    });
    expect(activeSocialLinks(source)).toEqual([
      { key: 'github', label: socialLabels.github, href: 'https://github.com/akib' },
    ]);
  });
});

describe('activeContactLinks', () => {
  it('lists configured fixed links before administrator extras', () => {
    const source = withLinks({
      github: 'https://github.com/akib',
      linkedin: 'https://www.linkedin.com/in/akib',
      upwork: 'https://www.upwork.com/freelancers/akib',
      more: [
        { id: 'x', label: 'X', href: 'https://x.com/akib' },
        { id: 'site', label: 'Writing', href: 'https://akib.example/blog' },
      ],
    });

    expect(activeContactLinks(source).map((link) => link.label)).toEqual([
      'GitHub',
      'LinkedIn',
      'Upwork',
      'X',
      'Writing',
    ]);
  });

  it('drops extra entries the administrator left incomplete', () => {
    const source = withLinks({
      more: [
        { id: 'blank-label', label: '', href: 'https://x.com/akib' },
        { id: 'blank-url', label: 'X', href: '' },
        { id: 'complete', label: 'X', href: 'https://x.com/akib' },
      ],
    });

    expect(activeContactLinks(source).map((link) => link.key)).toEqual(['complete']);
  });

  it('keeps the administrator-defined order', () => {
    const source = withLinks({
      more: [
        { id: 'b', label: 'Second', href: 'https://example.com/b' },
        { id: 'a', label: 'First', href: 'https://example.com/a' },
      ],
    });

    expect(activeContactLinks(source).map((link) => link.key)).toEqual(['b', 'a']);
  });
});
