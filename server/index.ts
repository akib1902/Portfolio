import 'dotenv/config';
import express from 'express';
import type { ErrorRequestHandler, Request, Response } from 'express';
import { createServer } from 'node:http';
import { appendFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { contactSchema, fieldErrorsFromIssues } from '../src/lib/contact-schema';
import type { ContactInput } from '../src/lib/contact-schema';
import { projects } from '../src/content/projects';
import { createRateLimiter } from './rate-limit';
import { buildContactEmail } from './email';

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1');
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const dataDir = path.resolve(process.env.DATA_DIR ?? 'data');
const submissionsFile = path.join(dataDir, 'contact-submissions.jsonl');
const distDir = path.resolve('dist');

const contactLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

const smtpHost = process.env.SMTP_HOST?.trim();
const contactTo = process.env.CONTACT_TO_EMAIL?.trim();
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS;
let transporter: Transporter | null = null;

if (smtpHost && contactTo) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
}

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

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
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "connect-src 'self'",
      ].join('; '),
    );
    if (siteUrl.startsWith('https://')) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }
  next();
});

function requestOrigin(req: Request): string {
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto ?? req.protocol;
  return `${protocol}://${req.get('host') ?? 'localhost'}`;
}

app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
});

app.get('/sitemap.xml', (req, res) => {
  const base = siteUrl || requestOrigin(req);
  const paths = [
    '/',
    '/about',
    '/projects',
    ...projects.map((project) => `/projects/${project.slug}`),
    '/contact',
    '/resume',
  ];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((route) => `  <url><loc>${escapeXml(`${base}${route}`)}</loc></url>`),
    '</urlset>',
  ].join('\n');
  res.type('application/xml').send(xml);
});

app.get('/robots.txt', (req, res) => {
  const base = siteUrl || requestOrigin(req);
  res
    .type('text/plain')
    .send(['User-agent: *', 'Allow: /', 'Disallow: /api/', `Sitemap: ${base}/sitemap.xml`, ''].join('\n'));
});

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
    await appendFile(submissionsFile, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
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

  if (transporter && contactTo) {
    try {
      const email = buildContactEmail(data, { id, receivedAt });
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? smtpUser ?? contactTo,
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

const httpServer = createServer(app);

if (isProduction) {
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
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const type = (error as { type?: string }).type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ ok: false, error: 'The request body was not valid JSON.' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ ok: false, error: 'The message is too large to submit.' });
    return;
  }
  console.error('[server] unhandled request error', {
    path: req.path,
    reason: error instanceof Error ? error.message : 'unknown error',
  });
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
    return;
  }
  res.status(500).type('text/plain').send('Internal server error');
};
app.use(errorHandler);

httpServer.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port} (${isProduction ? 'production' : 'development'})`);
  console.log(
    transporter
      ? '[contact] email notifications enabled'
      : '[contact] submissions will be stored on disk; SMTP is not configured',
  );
});

function shutdown(signal: string) {
  console.log(`[server] ${signal} received, closing`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export type { Response };
