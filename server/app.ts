import express from 'express';
import compression from 'compression';
import type { ErrorRequestHandler, Express, Request, Response } from 'express';
import { appendFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { ViteDevServer } from 'vite';
import { contactSchema, fieldErrorsFromIssues } from '../src/lib/contact-schema';
import type { ContactInput } from '../src/lib/contact-schema';
import { buildSeo } from '../src/lib/seo';
import { ContentStore } from './content-store';
import type { Db } from './db';
import { createAdminRouter } from './admin-routes';
import { buildContactEmail } from './email';
import { createRateLimiter } from './rate-limit';
import { buildDocument, readTemplate, themeFor } from './render';
import type { PageRenderer } from './render';
import { requestOrigin } from './site-url';

export interface AppOptions {
  db: Db;
  isProduction: boolean;
  siteUrl: string | null;
  distDir: string;
  rootDir?: string;
  uploadsDir: string;
  dataDir: string;
  renderer: PageRenderer | null;
  vite?: ViteDevServer;
  trustProxy?: boolean;
  sessionTtlMs?: number;
  now?: () => Date;
}

const contactLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8 });

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function createApp(options: AppOptions): Express {
  const {
    db,
    isProduction,
    siteUrl,
    distDir,
    rootDir = process.cwd(),
    uploadsDir,
    dataDir,
    renderer,
    vite,
    now = () => new Date(),
  } = options;

  const store = new ContentStore(db, siteUrl, now);
  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', 1);

  // Brotli/gzip the text responses (SSR HTML, JSON APIs, JS/CSS assets).
  // compression() skips already-compressed formats and sub-1 KB payloads and
  // sets Vary: Accept-Encoding, so immutable hashed assets stay cache-safe.
  app.use(compression());

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (isProduction) {
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "img-src 'self' data:",
          "font-src 'self'",
          "style-src 'self'",
          "script-src 'self'",
          "connect-src 'self'",
        ].join('; '),
      );
      if (siteUrl?.startsWith('https://')) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  app.get('/api/content', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.json(store.publicContent());
  });

  app.use(
    '/api/admin',
    createAdminRouter({
      db,
      store,
      uploadsDir,
      siteUrl,
      isProduction,
      sessionTtlMs: options.sessionTtlMs ?? 8 * 60 * 60 * 1000,
      now,
    }),
  );

  app.post('/api/contact', express.json({ limit: '16kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (!req.is('application/json')) {
      res.status(415).json({ ok: false, error: 'Please submit the form as JSON.' });
      return;
    }

    const origin = req.get('origin');
    if (origin) {
      const allowedHosts = new Set([req.get('host') ?? '']);
      if (siteUrl) {
        try {
          allowedHosts.add(new URL(siteUrl).host);
        } catch {
          /* SITE_URL is invalid; fall back to the request host. */
        }
      }
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        res.status(403).json({ ok: false, error: 'Request origin could not be verified.' });
        return;
      }
      if (!allowedHosts.has(originHost)) {
        res.status(403).json({ ok: false, error: 'Request origin could not be verified.' });
        return;
      }
    }

    const limit = contactLimiter.check(req.ip ?? 'unknown');
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({
        ok: false,
        error: 'Too many messages from this connection. Please try again in a few minutes.',
      });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    // Honeypot: real users never see or fill this field. Respond generically.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      res.status(200).json({ ok: true });
      return;
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: 'Please check the highlighted fields and try again.',
        fieldErrors: fieldErrorsFromIssues(parsed.error.issues),
      });
      return;
    }

    const data: ContactInput = parsed.data;
    const id = randomUUID();
    const receivedAt = new Date().toISOString();
    const submissionsFile = path.join(dataDir, 'contact-submissions.jsonl');

    try {
      await mkdir(dataDir, { recursive: true });
      const record = {
        id,
        receivedAt,
        name: data.name,
        email: data.email,
        inquiry: data.inquiry,
        message: data.message,
      };
      await appendFile(submissionsFile, `${JSON.stringify(record)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
    } catch (error) {
      console.error('[contact] failed to store submission', {
        id,
        reason: error instanceof Error ? error.message : 'unknown error',
      });
      res.status(500).json({
        ok: false,
        error: 'The message could not be saved right now. Please try again shortly.',
      });
      return;
    }

    const transporter = createTransporter();
    const contactTo = process.env.CONTACT_TO_EMAIL?.trim();
    if (transporter && contactTo) {
      try {
        const email = buildContactEmail(data, { id, receivedAt });
        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? contactTo,
          to: contactTo,
          replyTo: data.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      } catch (error) {
        // The submission is safely stored; email delivery is best-effort.
        console.error('[contact] notification email failed', {
          id,
          reason: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    console.log('[contact] submission received', { id, inquiry: data.inquiry });
    res.status(200).json({ ok: true, id });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'Not found.' });
  });

  app.use(
    '/media',
    express.static(uploadsDir, {
      index: false,
      dotfiles: 'deny',
      maxAge: '365d',
      immutable: true,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );
  app.use('/media', (_req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  function canonicalBase(req: Request): string | null {
    if (siteUrl) return siteUrl;
    if (isProduction) return null;
    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    return requestOrigin(forwardedProto ?? req.protocol, req.get('host'));
  }

  app.get('/sitemap.xml', (req, res) => {
    const base = canonicalBase(req);
    if (!base) {
      console.error('[seo] sitemap refused: SITE_URL is missing or invalid');
      res.status(503).type('text/plain').send('Sitemap unavailable: SITE_URL is not configured.');
      return;
    }

    const staticPaths = ['/', '/about', '/projects', '/contact', '/resume'];
    const projects = store.projects(false);
    const entries = [
      ...staticPaths.map((route) => ({ loc: `${base}${route}`, lastmod: undefined as string | undefined })),
      ...projects.map((project) => ({
        loc: `${base}/projects/${project.slug}`,
        lastmod: project.updatedAt,
      })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.map((entry) =>
        [
          '  <url>',
          `    <loc>${escapeXml(entry.loc)}</loc>`,
          ...(entry.lastmod ? [`    <lastmod>${escapeXml(entry.lastmod.slice(0, 10))}</lastmod>`] : []),
          '  </url>',
        ].join('\n'),
      ),
      '</urlset>',
    ].join('\n');

    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.type('application/xml').send(xml);
  });

  app.get('/robots.txt', (req, res) => {
    const base = canonicalBase(req);
    if (!base) {
      console.error('[seo] robots refused: SITE_URL is missing or invalid');
      res.status(503).type('text/plain').send('robots.txt unavailable: SITE_URL is not configured.');
      return;
    }
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        `Sitemap: ${base}/sitemap.xml`,
        '',
      ].join('\n'),
    );
  });

  // Trailing slashes redirect to the canonical path without one.
  app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.path.length > 1 && req.path.endsWith('/')) {
      const query = req.originalUrl.slice(req.path.length);
      res.redirect(301, `${req.path.replace(/\/+$/, '')}${query.startsWith('?') ? query : ''}`);
      return;
    }
    next();
  });

  if (isProduction) {
    app.get('/index.html', (_req, res) => res.redirect(301, '/'));
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      }),
    );
  } else if (vite) {
    app.use(vite.middlewares);
  }

  let cachedTemplate: Promise<string> | null = null;
  async function template(): Promise<string> {
    if (isProduction) {
      cachedTemplate ??= readTemplate({ isProduction, distDir, rootDir });
      return cachedTemplate;
    }
    return readTemplate({ isProduction, distDir, rootDir });
  }

  async function sendHtml(req: Request, res: Response, pathname: string) {
    const content = store.publicContent();
    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
    const seo = buildSeo(pathname, content);

    if (!isAdmin && pathname.startsWith('/projects/')) {
      let slug = '';
      try {
        slug = decodeURIComponent(pathname.slice('/projects/'.length));
      } catch {
        slug = '';
      }
      const project = store.projectBySlug(slug);
      if (!project || project.status !== 'published') {
        const target = store.redirectForSlug(slug);
        if (target && store.projectBySlug(target)?.status === 'published') {
          res.redirect(301, `/projects/${target}`);
          return;
        }
      }
    }

    const appHtml = isAdmin || !renderer ? '' : await renderer(pathname, content);
    const document = buildDocument({
      template: await template(),
      appHtml,
      content,
      seo,
      theme: themeFor(content),
    });
    const html = vite ? await vite.transformIndexHtml(req.originalUrl, document) : document;

    res.setHeader('Cache-Control', 'no-store');
    if (seo.noindex) res.setHeader('X-Robots-Tag', 'noindex');
    res.status(seo.status).type('html').send(html);
  }

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    void sendHtml(req, res, req.path).catch(next);
  });

  app.use((_req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const type = (error as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ ok: false, error: 'The request body was not valid JSON.' });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ ok: false, error: 'The request is too large.' });
      return;
    }
    console.error('[server] unhandled request error', {
      path: req.path,
      reason: error instanceof Error ? error.message : 'unknown error',
    });
    if (res.headersSent) return;
    if (req.path.startsWith('/api/')) {
      res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
      return;
    }
    res.status(500).type('text/plain').send('Internal server error');
  };
  app.use(errorHandler);

  return app;
}

let cachedTransporter: Transporter | null | undefined;

function createTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;
  const smtpHost = process.env.SMTP_HOST?.trim();
  const contactTo = process.env.CONTACT_TO_EMAIL?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS;
  cachedTransporter =
    smtpHost && contactTo
      ? nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        })
      : null;
  return cachedTransporter;
}
