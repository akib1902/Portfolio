// QA Phase 7: SEO verification at the HTTP layer (production server).
const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100';
const ROUTES = ['/', '/about', '/projects', '/contact', '/resume', '/projects/financial-research-settlement-agent', '/projects/full-stack-learning-platform', '/projects/cicd-test-automation-lab'];

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(`${name} ${detail}`); console.log(`  FAIL ${name} ${detail}`); }
}

const titles = new Map();
for (const route of ROUTES) {
  console.log(`Route: ${route}`);
  const resp = await fetch(BASE + route);
  check(`${route} -> 200`, resp.status === 200, `got ${resp.status}`);
  const html = await resp.text();

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  check(`${route} unique title`, title.length > 10 && !titles.has(title), title);
  titles.set(title, route);

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  check(`${route} meta description 50-300 chars`, desc.length >= 50 && desc.length <= 300, `len ${desc.length}`);

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  check(`${route} canonical present`, canonical === BASE + (route === '/' ? '/' : route), canonical);

  check(`${route} og:title`, /<meta property="og:title" content="/.test(html));
  check(`${route} og:url`, /<meta property="og:url" content="/.test(html));
  check(`${route} twitter:card`, /<meta name="twitter:card" content="/.test(html));
  check(`${route} robots index`, /<meta name="robots" content="index, follow"/.test(html));

  // Primary content server-rendered
  check(`${route} SSR has <main`, /<main /.test(html) || /<main>/.test(html));
  const h1s = (html.match(/<h1[ >]/g) ?? []).length;
  check(`${route} exactly one visible h1 (noscript excluded)`, (() => {
    const withoutNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
    return (withoutNoscript.match(/<h1[ >]/g) ?? []).length === 1;
  })(), `h1 count ${h1s}`);

  // Heading hierarchy: h1 → h2 (no skipped levels downstream of h1 is a heuristic; count h2 existence)
  check(`${route} has h2 sections`, /<h2[ >]/.test(html));

  // Image alt coverage
  const imgs = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
  const missingAlt = imgs.filter((tag) => !/\salt="/.test(tag));
  check(`${route} all images have alt (${imgs.length} imgs)`, missingAlt.length === 0, missingAlt.join(' ').slice(0, 100));
}

// JSON-LD
console.log('Block: JSON-LD');
for (const route of ['/', '/projects/financial-research-settlement-agent']) {
  const html = await (await fetch(BASE + route)).text();
  const m = html.match(/<script type="application\/ld\+json" id="seo-jsonld">([\s\S]*?)<\/script>/);
  check(`${route} JSON-LD present`, Boolean(m));
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      check(`${route} JSON-LD valid`, parsed['@context'] === 'https://schema.org' && Array.isArray(parsed['@graph']));
      const types = parsed['@graph'].map((n) => n['@type']);
      check(`${route} has structured types (${types.join(',')})`, types.length > 0);
    } catch (e) {
      check(`${route} JSON-LD parses`, false, String(e).slice(0, 80));
    }
  }
  // JSON-LD must be escaped, not raw-injectable
  check(`${route} no raw </script> breakout in JSON-LD`, !m || !m[1].includes('</script>'));
}

// 404 + noindex + admin
console.log('Block: 404/admin directives');
const notFound = await fetch(BASE + '/definitely-not-a-page');
check('unknown route 404', notFound.status === 404);
check('404 carries noindex', /noindex/.test(await notFound.text()) || /x-robots-tag/i.test(notFound.headers.get('x-robots-tag') ?? ''), notFound.headers.get('x-robots-tag') ?? '');

const admin = await fetch(BASE + '/admin/projects');
check('admin page 200 for shell', admin.status === 200);
check('admin X-Robots-Tag noindex', admin.headers.get('x-robots-tag') === 'noindex');
check('admin meta noindex', /content="noindex, follow"/.test(await admin.text()));

// Sitemap hygiene
console.log('Block: sitemap');
const sitemap = await (await fetch(BASE + '/sitemap.xml')).text();
check('sitemap has no admin/api', !/\/(admin|api)\//.test(sitemap));
check('sitemap has all 5 static pages', ['/', '/about', '/projects', '/contact', '/resume'].every((p) => sitemap.includes(`${BASE}${p}`)));

// JSON-LD Person/WebSite on home
{
  const html = await (await fetch(BASE + '/')).text();
  const m = html.match(/id="seo-jsonld">([\s\S]*?)<\/script>/);
  const types = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
  check('home JSON-LD includes Person and WebSite', types.includes('Person') && types.includes('WebSite'), types.join(','));
}

// Security headers (production)
console.log('Block: security headers');
const home = await fetch(BASE + '/');
const h = home.headers;
check('X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff');
check('X-Frame-Options DENY', h.get('x-frame-options') === 'DENY');
check('Referrer-Policy set', Boolean(h.get('referrer-policy')));
check('Permissions-Policy set', Boolean(h.get('permissions-policy')));
check('CSP present', (h.get('content-security-policy') ?? '').includes("default-src 'self'"));
check('CSP has no unsafe-inline', !(h.get('content-security-policy') ?? '').includes('unsafe-inline'));
check('no X-Powered-By', !h.get('x-powered-by'));
check('HSTS absent for http origin (correct)', !h.get('strict-transport-security'));
check('Cache-Control no-store on HTML', h.get('cache-control') === 'no-store');

// Asset caching
const cssHref = (await (await fetch(BASE + '/')).text()).match(/href="(\/assets\/index-[^"]+\.css)"/)[1];
const asset = await fetch(BASE + cssHref);
check('assets immutable cached', (asset.headers.get('cache-control') ?? '').includes('immutable'), asset.headers.get('cache-control'));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log(failures.map((f) => ' - ' + f).join('\n'));
process.exit(fail === 0 ? 0 : 1);
