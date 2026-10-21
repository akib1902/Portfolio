import { describe, expect, it } from 'vitest';
import { seedContent } from '../src/content/defaults';
import { buildSeo } from '../src/lib/seo';
import { buildDocument, themeFor } from './render';

const content = { ...seedContent('2026-01-01T00:00:00.000Z'), site: { url: 'https://portfolio.example' } };
const template = `<!doctype html>
<html lang="en" data-theme="amber-minimal">
  <head></head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('buildDocument', () => {
  it('replaces the template theme instead of adding a second attribute', () => {
    const html = buildDocument({
      template,
      appHtml: '<main>Hello</main>',
      content,
      seo: buildSeo('/', content),
      theme: 'graphite-terminal',
    });

    expect(html.match(/data-theme=/g)).toHaveLength(1);
    expect(html).toContain('data-theme="graphite-terminal"');
    expect(html).toContain('<meta name="theme-color" content="#16181a" />');
  });

  it('injects route metadata, server markup, and a safely escaped payload', () => {
    const hostile = {
      ...content,
      profile: { ...content.profile, name: '</script><img src=x onerror=alert(1)>' },
    };
    const seo = buildSeo('/about', hostile);
    const html = buildDocument({
      template,
      appHtml: '<main>Server markup</main>',
      content: hostile,
      seo,
      theme: themeFor(hostile),
    });

    expect(html).toContain('<title>About &lt;/script&gt;');
    expect(html).toContain('<main>Server markup</main>');
    expect(html).toContain('rel="canonical" href="https://portfolio.example/about"');
    expect(html).toContain('id="__content"');
    expect(html).not.toContain('</script><img src=x');
    expect(html).toContain('\\u003c/script\\u003e');
  });

  it('never renders a canonical URL when the site origin is unset', () => {
    const html = buildDocument({
      template,
      appHtml: '',
      content: { ...content, site: { url: null } },
      seo: buildSeo('/', { ...content, site: { url: null } }),
      theme: 'amber-minimal',
    });
    expect(html).not.toContain('rel="canonical"');
  });
});
