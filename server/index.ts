import 'dotenv/config';
import { createServer } from 'node:http';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { createApp } from './app';
import { countAdmins } from './auth';
import { openDatabase, seedDatabase } from './db';
import { createRenderer } from './render';
import { resolveSiteUrl } from './site-url';

const isProduction = process.env.NODE_ENV === 'production';
const configuredPort = Number(process.env.PORT);
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
const host = process.env.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1');

const dataDir = path.resolve(process.env.DATA_DIR ?? 'data');
const databaseFile = path.resolve(process.env.DATABASE_PATH ?? path.join(dataDir, 'portfolio.db'));
const uploadsDir = path.resolve(process.env.UPLOAD_DIR ?? path.join(dataDir, 'uploads'));
const distDir = path.resolve('dist');

const site = resolveSiteUrl(process.env.SITE_URL, { isProduction });
if (site.problem) {
  console.error(`[seo] ${site.problem} Canonical URLs, sitemap, and robots.txt will not be served.`);
}

const db = openDatabase(databaseFile);
const seeded = seedDatabase(db);

let vite: ViteDevServer | undefined;
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
}

const app = createApp({
  db,
  isProduction,
  siteUrl: site.url,
  distDir,
  rootDir: process.cwd(),
  uploadsDir,
  dataDir,
  vite,
  renderer: createRenderer({ isProduction, distDir, vite }),
  trustProxy: process.env.TRUST_PROXY === '1',
  sessionTtlMs: sessionTtlMs(),
});

const server = createServer(app);

server.listen(port, host, () => {
  console.log(
    `[server] listening on http://${host}:${port} (${isProduction ? 'production' : 'development'})`,
  );
  console.log(`[content] database: ${databaseFile}${seeded ? ' (seeded)' : ''}`);
  console.log(`[media] uploads: ${uploadsDir}`);
  if (countAdmins(db) === 0) {
    console.warn('[admin] no administrator exists yet. Run: npm run admin:create');
  }
  if (site.url) console.log(`[seo] canonical origin: ${site.url}`);
  console.log(
    process.env.SMTP_HOST && process.env.CONTACT_TO_EMAIL
      ? '[contact] email notifications enabled'
      : '[contact] submissions will be stored on disk; SMTP is not configured',
  );
});

function sessionTtlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? 8);
  const safeHours = Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 72) : 8;
  return safeHours * 60 * 60 * 1000;
}

function shutdown(signal: string) {
  console.log(`[server] ${signal} received, closing`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
