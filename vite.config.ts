import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Fonts discovered through CSS can only start downloading after the
 * render-blocking stylesheet has arrived, which paints the hero in fallback
 * faces and then swaps them out (flash of unstyled text + layout shift).
 *
 * The woff2 filenames are content-hashed, so the preload links cannot live in
 * index.html; this plugin reads the emitted bundle and injects them into the
 * production HTML instead. Only the latin subsets used above the fold are
 * preloaded — the body face, the display face, and the technical label face.
 */
const CRITICAL_FONT_PATTERNS = [
  /^assets\/inter-latin-wght-normal-[\w-]+\.woff2$/,
  /^assets\/anton-latin-400-normal-[\w-]+\.woff2$/,
  /^assets\/jetbrains-mono-latin-wght-normal-[\w-]+\.woff2$/,
];

function criticalFontPreload(): Plugin {
  return {
    name: 'critical-font-preload',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Dev serves fonts straight from node_modules with no bundling; only
        // the production build needs (and can resolve) hashed preload URLs.
        if (!ctx.bundle) return html;

        const files = Object.keys(ctx.bundle).filter((file) =>
          CRITICAL_FONT_PATTERNS.some((pattern) => pattern.test(file)),
        );
        if (files.length === 0) return html;

        return {
          html,
          tags: files.map((file) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${file}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: true,
            },
            injectTo: 'head' as const,
          })),
        };
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), criticalFontPreload()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    // Keep fonts and other assets as separate files so a strict CSP never
    // needs to allow data: fonts.
    assetsInlineLimit: 0,
  },
  server: {
    // Express owns the port; Vite runs in middleware mode.
    host: '127.0.0.1',
  },
});
