// QA Phase 5: Admin CMS end-to-end against the live production server (isolated QA DB).
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100';
// Provision against a disposable database first (never production):
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... DATABASE_PATH=./qa-env/data/qa.db npm run admin:create
const EMAIL = process.env.QA_ADMIN_EMAIL ?? 'qa-admin@example.com';
const PASSWORD = process.env.QA_ADMIN_PASSWORD ?? 'QA-test-passphrase-2026!';

let pass = 0;
let fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    failures.push(`${name} ${detail}`);
    console.log(`  FAIL ${name} ${detail}`);
  }
}

function splitCookie(setCookie) {
  return setCookie.split(';')[0];
}

// ── Authentication ──
console.log('Block: authentication');
let r = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: BASE },
  body: JSON.stringify({ email: EMAIL, password: 'wrong-password' }),
});
check('wrong password rejected 401', r.status === 401, `got ${r.status}`);
const wrongBody = await r.json();

r = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: BASE },
  body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
});
check('unknown email rejected 401 with identical message', r.status === 401 && (await r.json()).error === wrongBody.error);

r = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: BASE },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
check('valid login 200', r.status === 200, `got ${r.status}`);
const setCookie = r.headers.get('set-cookie') ?? '';
const cookie = splitCookie(setCookie);
const { csrfToken } = await r.json();
check('cookie HttpOnly', /httponly/i.test(setCookie));
check('cookie SameSite=Strict', /samesite=strict/i.test(setCookie));
check('cookie Secure (production)', /secure/i.test(setCookie));
check('csrf token issued', typeof csrfToken === 'string' && csrfToken.length > 20);

const authed = (extra = {}) => ({ 'content-type': 'application/json', cookie, origin: BASE, 'x-csrf-token': csrfToken, ...extra });

// CSRF/Origin negatives (already covered in unit tests; re-verify on live server)
r = await fetch(`${BASE}/api/admin/profile`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie, origin: BASE }, body: '{}' });
check('missing CSRF rejected 403', r.status === 403, `got ${r.status}`);
r = await fetch(`${BASE}/api/admin/profile`, { method: 'PUT', headers: authed({ 'x-csrf-token': 'forged' }), body: '{}' });
check('forged CSRF rejected 403', r.status === 403, `got ${r.status}`);
r = await fetch(`${BASE}/api/admin/profile`, { method: 'PUT', headers: authed({ origin: 'https://attacker.example' }), body: '{}' });
check('foreign Origin rejected 403', r.status === 403, `got ${r.status}`);
r = await fetch(`${BASE}/api/admin/content`, { headers: { cookie: 'portfolio_admin_session=forged-token' } });
check('forged session cookie rejected 401', r.status === 401, `got ${r.status}`);

// ── Admin content read ──
console.log('Block: admin content');
r = await fetch(`${BASE}/api/admin/content`, { headers: { cookie } });
check('admin can read full content', r.status === 200, `got ${r.status}`);
const adminContent = (await r.json()).content;

// ── Profile editor ──
console.log('Block: profile editor');
const marker = `QA headline ${Date.now()}`;
r = await fetch(`${BASE}/api/admin/profile`, {
  method: 'PUT',
  headers: authed(),
  body: JSON.stringify({ ...adminContent.profile, headline: marker }),
});
check('profile save 200', r.status === 200, `got ${r.status}`);
const publicPage = await (await fetch(`${BASE}/about`)).text();
check('public page shows new headline', publicPage.includes(marker));

// Mass assignment attempt
r = await fetch(`${BASE}/api/admin/profile`, {
  method: 'PUT',
  headers: authed(),
  body: JSON.stringify({ ...adminContent.profile, headline: marker, isAdmin: true, role: 'superadmin' }),
});
check('role escalation fields rejected 400', r.status === 400, `got ${r.status}`);

// ── Project editor ──
console.log('Block: project editor');
const slug = `qa-test-project-${Date.now()}`;
const projectPayload = {
  slug,
  title: 'QA Test Project',
  shortTitle: 'QA Test',
  category: 'Backend',
  categories: ['Backend'],
  status: 'draft',
  statusLabel: 'QA draft',
  summary: 'A temporary QA project created by the automated audit.',
  value: '',
  stack: ['TypeScript'],
  diagram: 'platform',
  diagramCaption: '',
  focus: 'QA verification',
  featured: false,
  position: 99,
  image: null,
  sections: [],
  links: { repo: null, live: null },
  evidenceNote: '',
};
r = await fetch(`${BASE}/api/admin/projects`, { method: 'POST', headers: authed(), body: JSON.stringify(projectPayload) });
check('create draft project 201', r.status === 201, `got ${r.status}`);
const { project } = await r.json();
const draftPage = await fetch(`${BASE}/projects/${slug}`);
check('draft returns 404 publicly', draftPage.status === 404, `got ${draftPage.status}`);
const draftHtml = await draftPage.text();
check('draft content absent from public HTML', !draftHtml.includes('QA Test Project'), 'draft leaked into HTML');
const publicApi = await (await fetch(`${BASE}/api/content`)).json();
check('draft NOT in public API', !publicApi.projects.some((p) => p.slug === slug));
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check('draft NOT in sitemap', !sitemap.includes(slug));

// Duplicate slug
r = await fetch(`${BASE}/api/admin/projects`, { method: 'POST', headers: authed(), body: JSON.stringify(projectPayload) });
check('duplicate slug rejected', r.status >= 400, `got ${r.status}`);

// Publish
r = await fetch(`${BASE}/api/admin/projects/${project.id}/status`, {
  method: 'POST', headers: authed(), body: JSON.stringify({ status: 'published' }),
});
check('publish 200', r.status === 200, `got ${r.status}`);
check('published page 200', (await fetch(`${BASE}/projects/${slug}`)).status === 200);
check('published project in sitemap', (await (await fetch(`${BASE}/sitemap.xml`)).text()).includes(slug));

// Slug change → redirect
r = await fetch(`${BASE}/api/admin/projects/${project.id}`, {
  method: 'PUT', headers: authed(), body: JSON.stringify({ ...projectPayload, slug: `${slug}-renamed`, status: 'published' }),
});
check('rename slug 200', r.status === 200, `got ${r.status}`);
const redirect = await fetch(`${BASE}/projects/${slug}`, { redirect: 'manual' });
check('old slug 301 redirects', redirect.status === 301, `got ${redirect.status}`);
check('redirect target correct', redirect.headers.get('location') === `/projects/${slug}-renamed`, redirect.headers.get('location'));

// Unpublish
await fetch(`${BASE}/api/admin/projects/${project.id}/status`, { method: 'POST', headers: authed(), body: JSON.stringify({ status: 'draft' }) });
check('unpublished page 404', (await fetch(`${BASE}/projects/${slug}-renamed`)).status === 404);

// Delete
r = await fetch(`${BASE}/api/admin/projects/${project.id}`, { method: 'DELETE', headers: authed() });
check('delete 200', r.status === 200, `got ${r.status}`);
check('deleted project gone from admin list', !(await (await fetch(`${BASE}/api/admin/projects`, { headers: { cookie } })).json()).projects.some((p) => p.id === project.id));

// ── Appearance ──
console.log('Block: appearance');
r = await fetch(`${BASE}/api/admin/settings`, {
  method: 'PUT', headers: authed(), body: JSON.stringify({ defaultTheme: 'graphite-terminal' }),
});
check('default theme change 200', r.status === 200, `got ${r.status}`);
const homeHtml = await (await fetch(`${BASE}/`)).text();
check('server renders new default theme', /data-theme="graphite-terminal"/.test(homeHtml));

// Invalid theme value
r = await fetch(`${BASE}/api/admin/settings`, {
  method: 'PUT', headers: authed(), body: JSON.stringify({ defaultTheme: 'not-a-theme' }),
});
check('invalid theme rejected', r.status >= 400, `got ${r.status}`);

// Restore
await fetch(`${BASE}/api/admin/settings`, { method: 'PUT', headers: authed(), body: JSON.stringify({ defaultTheme: 'amber-minimal' }) });
check('theme restored', /data-theme="amber-minimal"/.test(await (await fetch(`${BASE}/`)).text()));

// ── Audit trail ──
console.log('Block: audit trail');
const audit = await (await fetch(`${BASE}/api/admin/audit`, { headers: { cookie } })).json();
check('audit records exist', audit.entries.length > 0, `entries ${audit.entries.length}`);
check('audit has admin email', audit.entries.every((e) => e.adminEmail === EMAIL));
const auditStr = JSON.stringify(audit);
check('audit contains no password', !auditStr.includes(PASSWORD));
check('audit contains no csrf token', !auditStr.includes(csrfToken));

// ── Media upload: JPEG + WebP + traversal + double extension ──
console.log('Block: media uploads');
// Minimal JPEG (SOI + EOI)
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1), Buffer.from([0xff, 0xd9])]);
{
  const form = new FormData();
  form.append('kind', 'portrait');
  form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'photo.jpg');
  r = await fetch(`${BASE}/api/admin/media`, { method: 'POST', headers: { cookie, origin: BASE, 'x-csrf-token': csrfToken }, body: form });
  check('valid JPEG accepted 201', r.status === 201, `got ${r.status}`);
}
{
  const form = new FormData();
  form.append('kind', 'portrait');
  form.append('file', new Blob(['<html>fake</html>'], { type: 'image/jpeg' }), 'photo.jpg');
  r = await fetch(`${BASE}/api/admin/media`, { method: 'POST', headers: { cookie, origin: BASE, 'x-csrf-token': csrfToken }, body: form });
  check('fake JPEG rejected', r.status === 400, `got ${r.status}`);
}
{
  const form = new FormData();
  form.append('kind', 'portrait');
  form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'evil.js.jpg');
  r = await fetch(`${BASE}/api/admin/media`, { method: 'POST', headers: { cookie, origin: BASE, 'x-csrf-token': csrfToken }, body: form });
  check('double-extension upload', r.status === 201 || r.status === 400, `got ${r.status}`);
  if (r.status === 201) {
    const { media } = await r.json();
    check('double-extension sanitized to uuid name', /^portrait-[0-9a-f-]{36}\.jpg$/.test(media.filename), media.filename);
  }
}
{
  const form = new FormData();
  form.append('kind', 'portrait');
  form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), '../../server/evil.jpg');
  r = await fetch(`${BASE}/api/admin/media`, { method: 'POST', headers: { cookie, origin: BASE, 'x-csrf-token': csrfToken }, body: form });
  check('path traversal filename does not escape uploads dir', r.status === 201 || r.status === 400, `got ${r.status}`);
  if (r.status === 201) {
    const { media } = await r.json();
    check('traversal filename sanitized', !media.filename.includes('..') && !media.filename.includes('/'), media.filename);
  }
}

// ── Session logout ──
console.log('Block: logout');
r = await fetch(`${BASE}/api/admin/logout`, { method: 'POST', headers: authed() });
check('logout 200', r.status === 200, `got ${r.status}`);
r = await fetch(`${BASE}/api/admin/content`, { headers: { cookie } });
check('session invalid after logout', r.status === 401, `got ${r.status}`);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log(failures.map((f) => ' - ' + f).join('\n'));
process.exit(fail === 0 ? 0 : 1);
