import { describe, expect, it } from 'vitest';
import { seedContent } from '@/content/defaults';
import { buildSeo, escapeJsonLd } from './seo';

const content = seedContent('2026-01-01T00:00:00.000Z');
const withSite = { ...content, site: { url: 'https://portfolio.example' } };
const withoutSite = { ...content, site: { url: null } };

describe('buildSeo', () => {
  it('gives every public route a unique title and description', () => {
    const routes = ['/', '/about', '/projects', '/contact', '/resume'];
    const results = routes.map((route) => buildSeo(route, withSite));
    expect(new Set(results.map((result) => result.title)).size).toBe(routes.length);
    expect(new Set(results.map((result) => result.description)).size).toBe(routes.length);
    for (const result of results) {
      expect(result.status).toBe(200);
      expect(result.noindex).toBe(false);
      expect(result.canonical).toBe(`https://portfolio.example${result.path === '/' ? '/' : result.path}`);
    }
  });

  it('builds canonical project metadata and JSON-LD', () => {
    const project = withSite.projects[0];
    const seo = buildSeo(`/projects/${project.slug}`, withSite);
    expect(seo.status).toBe(200);
    expect(seo.type).toBe('article');
    expect(seo.canonical).toBe(`https://portfolio.example/projects/${project.slug}`);
    expect(seo.jsonLd.map((node) => node['@type'])).toEqual(
      expect.arrayContaining(['SoftwareSourceCode', 'BreadcrumbList']),
    );
    expect(JSON.stringify(seo.jsonLd)).not.toContain('undefined');
  });

  it('marks unknown routes and unpublished projects as 404 and noindex', () => {
    for (const path of ['/missing', `/projects/${withSite.projects[0].slug}-nope`]) {
      const seo = buildSeo(path, withSite);
      expect(seo.status, path).toBe(404);
      expect(seo.noindex, path).toBe(true);
      expect(seo.canonical, path).toBeNull();
    }
  });

  it('never exposes drafts through project metadata', () => {
    const draft = { ...withSite.projects[0], slug: 'secret-draft', status: 'draft' as const };
    const seo = buildSeo('/projects/secret-draft', withSite);
    expect(seo.status).toBe(404);
    expect(JSON.stringify(seo)).not.toContain(draft.summary);
  });

  it('leaves canonical URLs unset when SITE_URL is not configured', () => {
    const seo = buildSeo('/', withoutSite);
    expect(seo.canonical).toBeNull();
    expect(seo.image).toBeNull();
  });

  it('applies noindex to admin routes', () => {
    const seo = buildSeo('/admin/projects', withSite);
    expect(seo.noindex).toBe(true);
    expect(seo.canonical).toBeNull();
  });
});

describe('escapeJsonLd', () => {
  it('escapes characters that could close the script element', () => {
    const escaped = escapeJsonLd({ value: '</script><img src=x onerror=alert(1)>' });
    expect(escaped).not.toContain('</script>');
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
  });
});
