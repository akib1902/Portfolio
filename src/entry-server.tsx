import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import type { PublicContent } from '@/content/types';
import App from './App';

/**
 * Renders a public route to HTML.
 *
 * `App` imports every public page eagerly, so the markup contains the real
 * content rather than a loading fallback. Admin routes are lazy and are never
 * rendered here: the server sends an empty shell for /admin.
 */
export function render(url: string, content: PublicContent): string {
  return renderToString(
    <StaticRouter location={url}>
      <App content={content} />
    </StaticRouter>,
  );
}
