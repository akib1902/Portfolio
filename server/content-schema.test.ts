import { describe, expect, it } from 'vitest';
import { profileInputSchema } from './content-schema';
import { seedContent } from '../src/content/defaults';

const seededProfile = seedContent().profile;

function profileWith(patch: { links?: Record<string, unknown> } = {}) {
  return {
    ...seededProfile,
    links: { ...seededProfile.links, ...patch.links },
  };
}

describe('profileInputSchema contact links', () => {
  it('accepts configured fixed links and administrator extras', () => {
    const result = profileInputSchema.safeParse(
      profileWith({
        links: {
          github: 'https://github.com/akib',
          linkedin: null,
          upwork: 'https://www.upwork.com/freelancers/akib',
          more: [
            { id: 'x', label: 'X (Twitter)', href: 'https://x.com/akib' },
            { id: 'writing', label: 'Writing', href: 'https://akib.example/blog' },
          ],
        },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.links.more).toHaveLength(2);
    }
  });

  it('rejects a non-http scheme instead of publishing it as a link', () => {
    const result = profileInputSchema.safeParse(
      profileWith({
        links: { more: [{ id: 'bad', label: 'Bad', href: 'javascript:alert(1)' }] },
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/http/i);
    }
  });

  it('rejects an incomplete extra link', () => {
    const blankLabel = profileInputSchema.safeParse(
      profileWith({
        links: { more: [{ id: 'blank', label: '   ', href: 'https://example.com' }] },
      }),
    );
    const blankUrl = profileInputSchema.safeParse(
      profileWith({ links: { more: [{ id: 'blank', label: 'Example', href: '' }] } }),
    );

    expect(blankLabel.success).toBe(false);
    expect(blankUrl.success).toBe(false);
  });

  it('caps the number of extra links', () => {
    const many = Array.from({ length: 11 }, (_, index) => ({
      id: `link-${index}`,
      label: `Link ${index}`,
      href: `https://example.com/${index}`,
    }));
    const result = profileInputSchema.safeParse(profileWith({ links: { more: many } }));

    expect(result.success).toBe(false);
  });

  it('rejects unknown fields on an extra link', () => {
    const result = profileInputSchema.safeParse(
      profileWith({
        links: {
          more: [
            { id: 'x', label: 'X', href: 'https://x.com/akib', icon: 'brand-x' },
          ],
        },
      }),
    );

    expect(result.success).toBe(false);
  });
});
