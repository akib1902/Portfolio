import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createAdmin } from './auth';
import { openDatabase, seedDatabase } from './db';
import type { Db } from './db';
import type { Project, PublicContent } from '../src/content/types';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';

interface Harness {
  base: string;
  app: Express;
  db: Db;
  dir: string;
  csrf: string;
  close: () => Promise<void>;
}

async function startHarness(options: { seedAdmin?: boolean } = {}): Promise<Harness> {
  const dir = await mkdtemp(path.join(tmpdir(), 'portfolio-test-'));
  await writeFile(
    path.join(dir, 'index.html'),
    '<!doctype html><html lang="en"><head></head><body><div id="root"></div></body></html>',
  );

  const db = openDatabase(':memory:');
  seedDatabase(db);
  if (options.seedAdmin !== false) createAdmin(db, ADMIN_EMAIL, ADMIN_PASSWORD);

  const app = createApp({
    db,
    isProduction: true,
    siteUrl: 'https://portfolio.example',
    distDir: dir,
    uploadsDir: path.join(dir, 'uploads'),
    dataDir: path.join(dir, 'data'),
    renderer: async (url, content) => `<main data-url="${url}">${content.profile.name}</main>`,
    sessionTtlMs: 60 * 60 * 1000,
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;

  return {
    base: `http://127.0.0.1:${address.port}`,
    app,
    db,
    dir,
    csrf: '',
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      db.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

async function signIn(harness: Harness): Promise<{ cookie: string; csrf: string }> {
  const response = await fetch(`${harness.base}/api/admin/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: harness.base,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  expect(response.status).toBe(200);
  const setCookie = response.headers.get('set-cookie');
  expect(setCookie).toBeTruthy();
  const cookie = setCookie!.split(';')[0];
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('SameSite=Strict');
  expect(setCookie).toContain('Secure');

  const payload = (await response.json()) as { csrfToken: string };
  harness.csrf = payload.csrfToken;
  return { cookie, csrf: payload.csrfToken };
}

function writeHeaders(cookie: string, csrf: string, origin: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    cookie,
    origin,
    'x-csrf-token': csrf,
  };
}

function projectPayload(overrides: Partial<Project> = {}) {
  return {
    slug: 'draft-lab',
    title: 'Draft Lab',
    shortTitle: 'Draft Lab',
    category: 'Backend',
    categories: ['Backend'],
    status: 'draft',
    statusLabel: 'Private build',
    summary: 'A draft case study that must never be publicly visible until published.',
    value: '',
    stack: ['TypeScript'],
    diagram: 'platform',
    diagramCaption: '',
    focus: 'Draft content',
    featured: false,
    position: 10,
    image: null,
    sections: [],
    links: { repo: null, live: null },
    evidenceNote: '',
    ...overrides,
  };
}

async function publicContent(harness: Harness): Promise<PublicContent> {
  const response = await fetch(`${harness.base}/api/content`);
  expect(response.status).toBe(200);
  return (await response.json()) as PublicContent;
}

const active: Harness[] = [];
async function harness(options?: { seedAdmin?: boolean }): Promise<Harness> {
  const created = await startHarness(options);
  active.push(created);
  return created;
}

afterEach(async () => {
  while (active.length > 0) {
    await active.pop()!.close();
  }
});

describe('response compression', () => {
  it('gzip-compresses text responses and sets Vary', async () => {
    const h = await harness();
    const response = await fetch(`${h.base}/`, { headers: { 'accept-encoding': 'gzip' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('vary')).toContain('Accept-Encoding');
    // Decompressed body must still be the full rendered page.
    expect(await response.text()).toContain('<!doctype html>');
  });

  it('still serves valid small JSON under compression negotiation', async () => {
    const h = await harness();
    const response = await fetch(`${h.base}/api/health`, { headers: { 'accept-encoding': 'gzip' } });
    // Tiny payloads sit below the compression threshold; the body must parse
    // either way, which is what the assert guards against.
    expect((await response.json()).ok).toBe(true);
  });
});

describe('public/admin separation', () => {
  it('rejects unauthenticated reads and writes on every admin endpoint', async () => {
    const h = await harness();
    const requests: Array<[string, string]> = [
      ['GET', '/api/admin/content'],
      ['GET', '/api/admin/projects'],
      ['GET', '/api/admin/audit'],
      ['PUT', '/api/admin/profile'],
      ['PUT', '/api/admin/skills'],
      ['PUT', '/api/admin/settings'],
      ['POST', '/api/admin/projects'],
      ['DELETE', '/api/admin/projects/anything'],
      ['POST', '/api/admin/media'],
      ['DELETE', '/api/admin/media/portrait-00000000-0000-0000-0000-000000000000.png'],
    ];

    for (const [method, route] of requests) {
      const response = await fetch(`${h.base}${route}`, {
        method,
        headers: { 'content-type': 'application/json', origin: h.base },
        ...(method === 'GET' || method === 'DELETE' ? {} : { body: '{}' }),
      });
      expect(response.status, `${method} ${route}`).toBe(401);
    }
  });

  it('marks admin pages noindex and keeps drafts out of public HTML', async () => {
    const h = await harness();
    const response = await fetch(`${h.base}/admin/projects`);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    const html = await response.text();
    expect(html).toContain('content="noindex, follow"');
    expect(html).not.toContain('Private build');
  });

  it('serves rendered public HTML with per-route metadata and a 404 status', async () => {
    const h = await harness();

    const home = await fetch(`${h.base}/`);
    expect(home.status).toBe(200);
    const homeHtml = await home.text();
    expect(homeHtml).toContain('data-url="/"');
    expect(homeHtml).toContain('<title>Akib Ahmed');
    expect(homeHtml).toContain('rel="canonical" href="https://portfolio.example/"');

    const missing = await fetch(`${h.base}/projects/does-not-exist`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('noindex');

    const unknown = await fetch(`${h.base}/nope`);
    expect(unknown.status).toBe(404);
  });
});

describe('authentication', () => {
  it('does not reveal whether an account exists and rate-limits attempts', async () => {
    const h = await harness();
    const attempt = (email: string, password: string) =>
      fetch(`${h.base}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: h.base },
        body: JSON.stringify({ email, password }),
      });

    const unknown = await attempt('nobody@example.com', 'wrong-password');
    const wrong = await attempt(ADMIN_EMAIL, 'wrong-password');
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    const unknownBody = (await unknown.json()) as { error: string };
    const wrongBody = (await wrong.json()) as { error: string };
    expect(unknownBody.error).toBe(wrongBody.error);

    await attempt(ADMIN_EMAIL, 'wrong-password');
    await attempt(ADMIN_EMAIL, 'wrong-password');
    await attempt(ADMIN_EMAIL, 'wrong-password');
    const limited = await attempt(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });

  it('stores no session cookie in the response body and invalidates on logout', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);

    const session = await fetch(`${h.base}/api/admin/session`, { headers: { cookie } });
    const body = (await session.json()) as Record<string, unknown>;
    expect(body.authenticated).toBe(true);
    expect(JSON.stringify(body)).not.toContain(cookie.split('=')[1]);

    const logout = await fetch(`${h.base}/api/admin/logout`, {
      method: 'POST',
      headers: writeHeaders(cookie, csrf, h.base),
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');

    const after = await fetch(`${h.base}/api/admin/content`, { headers: { cookie } });
    expect(after.status).toBe(401);
  });

  it('rejects a forged or expired session token', async () => {
    const h = await harness();
    const forged = await fetch(`${h.base}/api/admin/content`, {
      headers: { cookie: 'portfolio_admin_session=forged-token' },
    });
    expect(forged.status).toBe(401);

    // Insert an already-expired session row directly.
    h.db
      .prepare('INSERT INTO sessions (id, admin_id, csrf_token, created_at, expires_at) VALUES (?, 1, ?, 0, 1)')
      .run('expired-hash', 'csrf');
    const expired = await fetch(`${h.base}/api/admin/content`, {
      headers: { cookie: 'portfolio_admin_session=expired-hash' },
    });
    expect(expired.status).toBe(401);
  });
});

describe('CSRF and authorization on mutations', () => {
  it('requires a matching CSRF token and trusted Origin', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const content = await publicContent(h);

    const noCsrf = await fetch(`${h.base}/api/admin/profile`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, origin: h.base },
      body: JSON.stringify(content.profile),
    });
    expect(noCsrf.status).toBe(403);

    const badCsrf = await fetch(`${h.base}/api/admin/profile`, {
      method: 'PUT',
      headers: writeHeaders(cookie, 'not-the-token', h.base),
      body: JSON.stringify(content.profile),
    });
    expect(badCsrf.status).toBe(403);

    const foreignOrigin = await fetch(`${h.base}/api/admin/profile`, {
      method: 'PUT',
      headers: writeHeaders(cookie, csrf, 'https://attacker.example'),
      body: JSON.stringify(content.profile),
    });
    expect(foreignOrigin.status).toBe(403);

    const missingOrigin = await fetch(`${h.base}/api/admin/profile`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie, 'x-csrf-token': csrf },
      body: JSON.stringify(content.profile),
    });
    expect(missingOrigin.status).toBe(403);

    // The content was never changed by the rejected attempts.
    const current = await publicContent(h);
    expect(current.profile.name).toBe(content.profile.name);
  });

  it('rejects malformed payloads and role escalation fields', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const headers = writeHeaders(cookie, csrf, h.base);

    const withRole = await fetch(`${h.base}/api/admin/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ...(await publicContent(h)).profile, isAdmin: true, role: 'admin' }),
    });
    expect(withRole.status).toBe(400);

    const badSlug = await fetch(`${h.base}/api/admin/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectPayload({ slug: '../escape', title: '' })),
    });
    expect(badSlug.status).toBe(400);

    const badUrl = await fetch(`${h.base}/api/admin/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectPayload({ links: { repo: 'javascript:alert(1)', live: null } })),
    });
    expect(badUrl.status).toBe(400);
  });
});

describe('drafts, publishing, and sitemap', () => {
  it('keeps drafts private, publishes on demand, and redirects renamed slugs', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const headers = writeHeaders(cookie, csrf, h.base);

    const created = await fetch(`${h.base}/api/admin/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(projectPayload()),
    });
    expect(created.status).toBe(201);
    const { project } = (await created.json()) as { project: Project };

    expect((await publicContent(h)).projects.some((item) => item.id === project.id)).toBe(false);
    expect((await fetch(`${h.base}/projects/draft-lab`)).status).toBe(404);
    expect(await (await fetch(`${h.base}/sitemap.xml`)).text()).not.toContain('draft-lab');

    // Publish it, then it must appear everywhere public.
    const published = await fetch(`${h.base}/api/admin/projects/${project.id}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status: 'published' }),
    });
    expect(published.status).toBe(200);
    expect((await publicContent(h)).projects.some((item) => item.id === project.id)).toBe(true);
    expect((await fetch(`${h.base}/projects/draft-lab`)).status).toBe(200);
    expect(await (await fetch(`${h.base}/sitemap.xml`)).text()).toContain('/projects/draft-lab');

    // Renaming the slug must preserve the old URL with a permanent redirect.
    const renamed = await fetch(`${h.base}/api/admin/projects/${project.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(projectPayload({ slug: 'renamed-lab', status: 'published' })),
    });
    expect(renamed.status).toBe(200);
    const redirect = await fetch(`${h.base}/projects/draft-lab`, { redirect: 'manual' });
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get('location')).toBe('/projects/renamed-lab');

    // Unpublishing removes it from public output and the sitemap.
    await fetch(`${h.base}/api/admin/projects/${project.id}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status: 'draft' }),
    });
    expect((await fetch(`${h.base}/projects/renamed-lab`)).status).toBe(404);
    expect(await (await fetch(`${h.base}/sitemap.xml`)).text()).not.toContain('renamed-lab');
  });

  it('updates public HTML after a legitimate profile edit and records an audit entry', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const headers = writeHeaders(cookie, csrf, h.base);
    const current = await publicContent(h);

    const saved = await fetch(`${h.base}/api/admin/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ...current.profile, headline: 'Updated headline for verification' }),
    });
    expect(saved.status).toBe(200);

    const page = await (await fetch(`${h.base}/about`)).text();
    expect(page).toContain('Updated headline for verification');

    const audit = (await (
      await fetch(`${h.base}/api/admin/audit`, { headers: { cookie } })
    ).json()) as { entries: Array<{ action: string; adminEmail: string }> };
    expect(audit.entries[0]).toMatchObject({ action: 'update', adminEmail: ADMIN_EMAIL });
  });
});

describe('media uploads', () => {
  it('rejects unauthenticated, non-image, and oversized uploads', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const headers = { cookie, origin: h.base, 'x-csrf-token': csrf };

    const form = new FormData();
    form.append('kind', 'portrait');
    form.append('file', new Blob([Buffer.from('not an image')], { type: 'image/png' }), 'fake.png');

    const anonymous = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers: { origin: h.base },
      body: form,
    });
    expect(anonymous.status).toBe(401);

    const invalid = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers,
      body: form,
    });
    expect(invalid.status).toBe(400);

    const svg = new FormData();
    svg.append('kind', 'portrait');
    svg.append(
      'file',
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], {
        type: 'image/svg+xml',
      }),
      'evil.svg',
    );
    const rejectedSvg = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers,
      body: svg,
    });
    expect(rejectedSvg.status).toBe(400);

    const oversized = new FormData();
    oversized.append('kind', 'portrait');
    oversized.append(
      'file',
      new Blob([Buffer.alloc(5 * 1024 * 1024 + 10)], { type: 'image/png' }),
      'large.png',
    );
    const tooLarge = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers,
      body: oversized,
    });
    expect(tooLarge.status).toBe(413);
  });

  it('accepts a real PDF resume and rejects a renamed non-PDF', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const headers = { cookie, origin: h.base, 'x-csrf-token': csrf };

    const form = new FormData();
    form.append('kind', 'resume');
    form.append(
      'file',
      new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'], { type: 'application/pdf' }),
      'resume.pdf',
    );

    const uploaded = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers,
      body: form,
    });
    expect(uploaded.status).toBe(201);
    const { media } = (await uploaded.json()) as { media: { url: string; filename: string } };
    expect(media.filename).toMatch(/^resume-[0-9a-f-]{36}\.pdf$/);

    const served = await fetch(`${h.base}${media.url}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toContain('application/pdf');

    const fake = new FormData();
    fake.append('kind', 'resume');
    fake.append(
      'file',
      new Blob(['<html>not a pdf</html>'], { type: 'application/pdf' }),
      'resume.pdf',
    );
    const rejected = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers,
      body: fake,
    });
    expect(rejected.status).toBe(400);
  });

  it('accepts a real PNG signature and publishes it under a generated name', async () => {
    const h = await harness();
    const { cookie, csrf } = await signIn(h);
    const headers = { cookie, origin: h.base, 'x-csrf-token': csrf };

    // Minimal valid PNG signature plus IHDR header bytes.
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 1),
    ]);
    const form = new FormData();
    form.append('kind', 'portrait');
    form.append('file', new Blob([png], { type: 'image/png' }), 'portrait.png');

    const uploaded = await fetch(`${h.base}/api/admin/media`, {
      method: 'POST',
      headers,
      body: form,
    });
    expect(uploaded.status).toBe(201);
    const { media } = (await uploaded.json()) as { media: { url: string; filename: string } };
    expect(media.filename).toMatch(/^portrait-[0-9a-f-]{36}\.png$/);
    expect(media.url).toBe(`/media/${media.filename}`);

    const served = await fetch(`${h.base}${media.url}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('cache-control')).toContain('immutable');
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');

    const traversal = await fetch(
      `${h.base}/api/admin/media/${encodeURIComponent('../index.html')}`,
      { method: 'DELETE', headers },
    );
    expect(traversal.status).toBe(400);
  });
});
