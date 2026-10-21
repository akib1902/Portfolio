import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ViteDevServer } from 'vite';
import type { PublicContent } from '../src/content/types';
import { escapeHtml, escapeJsonLd } from '../src/lib/seo';
import type { SeoData } from '../src/lib/seo';
import { themeMetaContent } from '../src/lib/themes';

export type PageRenderer = (url: string, content: PublicContent) => Promise<string>;

interface RendererOptions {
  isProduction: boolean;
  distDir: string;
  vite?: ViteDevServer;
}

/**
 * Loads the SSR bundle. In development Vite transforms the entry so imports,
 * aliases, and TSX behave exactly as they do in the browser build.
 */
export function createRenderer({ isProduction, distDir, vite }: RendererOptions): PageRenderer {
  let productionModule: Promise<{ render: (url: string, content: PublicContent) => string }> | null =
    null;

  return async (url, content) => {
    if (isProduction) {
      productionModule ??= import(
        pathToFileURL(path.join(distDir, 'server', 'entry-server.js')).href
      ) as Promise<{ render: (url: string, content: PublicContent) => string }>;
      const loaded = await productionModule;
      return loaded.render(url, content);
    }

    if (!vite) throw new Error('The Vite dev server is required outside production.');
    const loaded = (await vite.ssrLoadModule('/src/entry-server.tsx')) as {
      render: (url: string, content: PublicContent) => string;
    };
    return loaded.render(url, content);
  };
}

function headTags(seo: SeoData, content: PublicContent, themeColor: string): string {
  const tags = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${seo.noindex ? 'noindex, follow' : 'index, follow'}" />`,
    `<meta name="theme-color" content="${escapeHtml(themeColor)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(content.profile.name)}" />`,
    `<meta property="og:type" content="${seo.type}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
  ];

  if (seo.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`);
    tags.push(`<meta property="og:url" content="${escapeHtml(seo.canonical)}" />`);
  }
  if (seo.image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(seo.image)}" />`);
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(seo.imageAlt)}" />`);
    tags.push('<meta name="twitter:image" content="' + escapeHtml(seo.image) + '" />');
  }
  tags.push('<meta name="twitter:card" content="summary_large_image" />');
  tags.push(`<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`);

  if (seo.jsonLd.length > 0) {
    tags.push(
      `<script type="application/ld+json" id="seo-jsonld">${escapeJsonLd({
        '@context': 'https://schema.org',
        '@graph': seo.jsonLd,
      })}</script>`,
    );
  }

  return tags.join('\n    ');
}

export interface DocumentInput {
  template: string;
  appHtml: string;
  content: PublicContent;
  seo: SeoData;
  theme: string;
}

/** Injects per-request metadata, server markup, and the content payload. */
export function buildDocument({ template, appHtml, content, seo, theme }: DocumentInput): string {
  let html = template;

  // The template carries the default theme so a plain index.html is still
  // valid; the administrator's configured theme must replace it, not stack a
  // second data-theme attribute beside it.
  html = html.replace(/\sdata-theme="[^"]*"/, '');
  html = html.replace('<html lang="en"', `<html lang="en" data-theme="${escapeHtml(theme)}"`);
  html = html.replace('<head>', `<head>\n    ${headTags(seo, content, themeMetaContent(theme))}`);

  const rootMarkup = `<div id="root">${appHtml}</div>`;
  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', rootMarkup);
  } else {
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/, rootMarkup);
  }

  const payload = JSON.stringify(content)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

  html = html.replace(
    '</body>',
    `  <script id="__content" type="application/json">${payload}</script>\n  </body>`,
  );

  return html;
}

const themeFallback = 'amber-minimal';

export function themeFor(content: PublicContent): string {
  return content.settings.defaultTheme || themeFallback;
}

export async function readTemplate(options: {
  isProduction: boolean;
  distDir: string;
  rootDir: string;
}): Promise<string> {
  const file = options.isProduction
    ? path.join(options.distDir, 'index.html')
    : path.join(options.rootDir, 'index.html');
  return readFile(file, 'utf8');
}
