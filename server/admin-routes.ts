import express from 'express';
import type { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  findAdminByEmail,
  hashPassword,
  readCookie,
  readSession,
  safeEqual,
  SESSION_COOKIE,
  serializeSessionCookie,
  verifyPassword,
} from './auth';
import type { ContentStore } from './content-store';
import type { Db } from './db';
import {
  loginSchema,
  profileInputSchema,
  projectInputSchema,
  settingsInputSchema,
  skillsInputSchema,
  statusInputSchema,
} from './content-schema';
import { createRateLimiter } from './rate-limit';
import { deleteMedia, MAX_UPLOAD_BYTES, saveDocument, saveImage, UploadError } from './uploads';

export interface AdminRouterOptions {
  db: Db;
  store: ContentStore;
  uploadsDir: string;
  siteUrl: string | null;
  isProduction: boolean;
  sessionTtlMs: number;
  now?: () => Date;
}

interface AdminIdentity {
  email: string;
  csrfToken: string;
}

// Used to keep the response time similar when the account does not exist.
const dummyHash = hashPassword('not-a-real-password-value');

function fail(res: Response, status: number, error: string, details?: unknown) {
  res.status(status).json({ ok: false, error, ...(details ? { details } : {}) });
}

function issueSummary(error: ZodError): string[] {
  return error.issues.slice(0, 8).map((issue) => {
    const where = issue.path.join('.');
    return where ? `${where}: ${issue.message}` : issue.message;
  });
}

export function createAdminRouter({
  db,
  store,
  uploadsDir,
  siteUrl,
  isProduction,
  sessionTtlMs,
  now = () => new Date(),
}: AdminRouterOptions): Router {
  const router = express.Router();
  const secureCookies = isProduction;
  const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
  const json = express.json({ limit: '512kb' });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4 },
  });

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  function allowedOrigins(req: Request): Set<string> {
    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProto ?? req.protocol;
    const host = req.get('host');
    const origins = new Set<string>();
    if (host) origins.add(`${protocol}://${host}`);
    if (siteUrl) {
      try {
        origins.add(new URL(siteUrl).origin);
      } catch {
        /* invalid SITE_URL is handled elsewhere */
      }
    }
    return origins;
  }

  function originAllowed(req: Request): boolean {
    const origin = req.get('origin');
    if (!origin) return false;
    try {
      return allowedOrigins(req).has(new URL(origin).origin);
    } catch {
      return false;
    }
  }

  function identity(res: Response): AdminIdentity | null {
    return (res.locals.admin as AdminIdentity | undefined) ?? null;
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const token = readCookie(req.get('cookie'), SESSION_COOKIE);
    const session = readSession(db, token);
    if (!session) {
      if (token) res.setHeader('Set-Cookie', clearSessionCookie(secureCookies));
      fail(res, 401, 'Authentication required.');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (!originAllowed(req)) {
        fail(res, 403, 'Request origin could not be verified.');
        return;
      }
      const csrf = req.get('x-csrf-token');
      if (!csrf || !safeEqual(csrf, session.csrfToken)) {
        fail(res, 403, 'A valid CSRF token is required.');
        return;
      }
    }

    res.locals.admin = { email: session.email, csrfToken: session.csrfToken } satisfies AdminIdentity;
    res.locals.sessionExpiresAt = session.expiresAt;
    next();
  }

  router.post('/login', json, (req, res) => {
    const limit = loginLimiter.check(req.ip ?? 'unknown');
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      fail(res, 429, 'Too many sign-in attempts. Try again in a few minutes.');
      return;
    }

    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Enter an email address and password.');
      return;
    }

    const admin = findAdminByEmail(db, parsed.data.email);
    const storedHash = admin?.password_hash ?? dummyHash;
    const passwordOk = verifyPassword(parsed.data.password, storedHash);

    if (!admin || !passwordOk) {
      console.warn('[admin] failed sign-in', { ip: req.ip ?? 'unknown' });
      fail(res, 401, 'Email or password is incorrect.');
      return;
    }

    // Rotate any existing identifier before issuing a new one.
    destroySession(db, readCookie(req.get('cookie'), SESSION_COOKIE));
    const session = createSession(db, admin.id, sessionTtlMs, now().getTime());
    loginLimiter.reset();

    res.setHeader(
      'Set-Cookie',
      serializeSessionCookie(session.token, sessionTtlMs / 1000, secureCookies),
    );
    res.json({
      ok: true,
      user: { email: admin.email },
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  });

  router.get('/session', (req, res) => {
    const session = readSession(db, readCookie(req.get('cookie'), SESSION_COOKIE));
    if (!session) {
      res.json({ ok: true, authenticated: false });
      return;
    }
    res.json({
      ok: true,
      authenticated: true,
      user: { email: session.email },
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    });
  });

  router.post('/logout', requireAdmin, (req, res) => {
    destroySession(db, readCookie(req.get('cookie'), SESSION_COOKIE));
    res.setHeader('Set-Cookie', clearSessionCookie(secureCookies));
    res.json({ ok: true });
  });

  router.get('/content', requireAdmin, (_req, res) => {
    res.json({ ok: true, content: store.adminContent() });
  });

  router.put('/profile', json, requireAdmin, (req, res) => {
    const admin = identity(res)!;
    const parsed = profileInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Check the profile fields and try again.', issueSummary(parsed.error));
      return;
    }
    const saved = store.updateProfile(parsed.data, admin.email);
    res.json({ ok: true, profile: saved });
  });

  router.put('/skills', json, requireAdmin, (req, res) => {
    const admin = identity(res)!;
    const parsed = skillsInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Check the skills fields and try again.', issueSummary(parsed.error));
      return;
    }
    const saved = store.updateSkills(parsed.data, admin.email);
    res.json({ ok: true, skills: saved });
  });

  router.put('/settings', json, requireAdmin, (req, res) => {
    const admin = identity(res)!;
    const parsed = settingsInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Choose one of the supported themes.', issueSummary(parsed.error));
      return;
    }
    const saved = store.updateSettings(parsed.data, admin.email);
    res.json({ ok: true, settings: saved });
  });

  router.get('/projects', requireAdmin, (_req, res) => {
    res.json({ ok: true, projects: store.projects(true) });
  });

  router.post('/projects', json, requireAdmin, (req, res) => {
    const admin = identity(res)!;
    const parsed = projectInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Check the project fields and try again.', issueSummary(parsed.error));
      return;
    }
    try {
      const project = store.createProject(parsed.data, admin.email);
      res.status(201).json({ ok: true, project });
    } catch (error) {
      if (isUniqueSlugError(error)) {
        fail(res, 409, 'Another project already uses that slug.');
        return;
      }
      throw error;
    }
  });

  router.get('/projects/:id', requireAdmin, (req, res) => {
    const project = store.projectById(req.params.id);
    if (!project) {
      fail(res, 404, 'Project not found.');
      return;
    }
    res.json({ ok: true, project });
  });

  router.put('/projects/:id', json, requireAdmin, (req, res) => {
    const admin = identity(res)!;
    if (!store.projectById(req.params.id)) {
      fail(res, 404, 'Project not found.');
      return;
    }
    const parsed = projectInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Check the project fields and try again.', issueSummary(parsed.error));
      return;
    }
    try {
      const project = store.updateProject(req.params.id, parsed.data, admin.email);
      res.json({ ok: true, project });
    } catch (error) {
      if (isUniqueSlugError(error)) {
        fail(res, 409, 'Another project already uses that slug.');
        return;
      }
      throw error;
    }
  });

  router.post('/projects/:id/status', json, requireAdmin, (req, res) => {
    const admin = identity(res)!;
    const parsed = statusInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, 'Choose publish or draft.');
      return;
    }
    try {
      const project = store.setProjectStatus(req.params.id, parsed.data.status, admin.email);
      res.json({ ok: true, project });
    } catch {
      fail(res, 404, 'Project not found.');
    }
  });

  router.delete('/projects/:id', requireAdmin, (req, res) => {
    const admin = identity(res)!;
    try {
      store.deleteProject(req.params.id, admin.email);
      res.json({ ok: true });
    } catch {
      fail(res, 404, 'Project not found.');
    }
  });

  router.get('/audit', requireAdmin, (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json({ ok: true, entries: store.auditEntries(Number.isFinite(limit) ? limit : 50) });
  });

  router.post('/media', requireAdmin, (req, res, next) => {
    const admin = identity(res)!;
    upload.single('file')(req, res, (error: unknown) => {
      if (error) {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
          fail(res, 413, 'Images must be 5 MB or smaller.');
          return;
        }
        fail(res, 400, 'The upload could not be processed.');
        return;
      }

      const kind = typeof req.body?.kind === 'string' ? req.body.kind : '';
      const save = kind === 'resume' ? saveDocument : saveImage;
      void save(uploadsDir, kind, req.file)
        .then((saved) => {
          store.audit(admin.email, 'upload', 'media', saved.filename, `${kind} file uploaded (${saved.bytes} bytes)`);
          res.status(201).json({ ok: true, media: saved });
        })
        .catch(next);
    });
  });

  router.delete('/media/:filename', requireAdmin, (req, res, next) => {
    const admin = identity(res)!;
    void deleteMedia(uploadsDir, req.params.filename)
      .then((deleted) => {
        if (!deleted) {
          fail(res, 404, 'Media file not found.');
          return;
        }
        store.audit(admin.email, 'delete', 'media', req.params.filename, 'Image removed');
        res.json({ ok: true });
      })
      .catch(next);
  });

  router.use((_req, res) => {
    fail(res, 404, 'Not found.');
  });

  router.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof UploadError) {
      fail(res, error.status, error.message);
      return;
    }
    if (error instanceof ZodError) {
      fail(res, 400, 'The request body was not valid.', issueSummary(error));
      return;
    }
    console.error('[admin] request failed', {
      path: req.path,
      reason: error instanceof Error ? error.message : 'unknown error',
    });
    fail(res, 500, 'Something went wrong. Please try again.');
  });

  return router;
}

function isUniqueSlugError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code?: unknown }).code).startsWith('SQLITE_CONSTRAINT')
  );
}
