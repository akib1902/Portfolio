import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource/anton/latin-400.css';
import './styles/base.css';
import './styles/themes.css';
import './styles/home.css';
import './styles/pages.css';
import './styles/admin.css';
import './styles/print.css';
import type { PublicContent } from './content/types';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

async function readContent(): Promise<PublicContent> {
  const embedded = document.getElementById('__content')?.textContent;
  if (embedded) return JSON.parse(embedded) as PublicContent;

  const response = await fetch('/api/content', { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Content request failed with ${response.status}`);
  return (await response.json()) as PublicContent;
}

const content = await readContent();

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App content={content} />
    </BrowserRouter>
  </StrictMode>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, tree);
} else {
  createRoot(rootElement).render(tree);
}
