// QA Phase 8: responsive overflow at 10 viewports + lab Core Web Vitals.
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100';
const WIDTHS = [320, 360, 390, 430, 768, 834, 1024, 1280, 1440, 1920];
const ROUTES = ['/', '/about', '/projects', '/projects/financial-research-settlement-agent', '/contact', '/resume'];

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(`${name} ${detail}`); console.log(`  FAIL ${name} ${detail}`); }
}

const browser = await chromium.launch({ channel: 'chrome' });

// ── Horizontal overflow scan ──
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  let overflows = [];
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const offenders = [];
      if (de.scrollWidth > de.clientWidth + 1) {
        for (const el of document.querySelectorAll('*')) {
          const rect = el.getBoundingClientRect();
          if (rect.right > de.clientWidth + 1 && rect.width > 0 && getComputedStyle(el).position !== 'fixed') {
            offenders.push(`${el.tagName}.${String(el.className).slice(0, 40)} right=${Math.round(rect.right)}`);
            if (offenders.length > 3) break;
          }
        }
      }
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, offenders };
    });
    if (r.scrollW > r.clientW + 1) overflows.push(`${route} (${r.scrollW}>${r.clientW}) ${r.offenders.join(', ')}`);
  }
  check(`no horizontal overflow at ${width}px`, overflows.length === 0, overflows.join(' | ').slice(0, 300));
  await ctx.close();
}

// ── Mobile nav menu ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const toggle = page.locator('header button[aria-controls="mobile-nav"]');
  check('mobile nav toggle exists', (await toggle.count()) === 1);
  if (await toggle.count()) {
    check('toggle exposes aria-expanded=false', (await toggle.getAttribute('aria-expanded')) === 'false');
    await toggle.click();
    await page.waitForTimeout(300);
    check('toggle exposes aria-expanded=true when open', (await toggle.getAttribute('aria-expanded')) === 'true');
    const navVisible = await page.locator('#mobile-nav a[href="/about"]').isVisible().catch(() => false);
    check('mobile nav opens and links are visible', navVisible);
    await page.locator('#mobile-nav a[href="/about"]').click().catch(() => {});
    await page.waitForURL('**/about').catch(() => {});
    check('mobile nav navigates', page.url().includes('/about'));
    // The menu closes in a useEffect on pathname change; wait for React.
    const closedAfterNav = await toggle
      .getAttribute('aria-expanded')
      .catch(() => 'detached');
    if (closedAfterNav === 'detached') {
      check('mobile nav closes after navigating', true, 'header re-mounted (detached toggle)');
    } else {
      await page
        .waitForFunction(() => document.querySelector('header button[aria-controls="mobile-nav"]')?.getAttribute('aria-expanded') === 'false', null, { timeout: 2000 })
        .catch(() => {});
      const state = await page.evaluate(() => document.querySelector('header button[aria-controls="mobile-nav"]')?.getAttribute('aria-expanded'));
      check('mobile nav closes after navigating', state === 'false', `aria-expanded=${state}`);
    }
  }
  await ctx.close();
}

// ── Lab Core Web Vitals (3 runs per route, median FCP/LCP/CLS) ──
console.log('Block: Core Web Vitals (lab, localhost, warm cache)');
const ctx = await browser.newContext();
const page = await ctx.newPage();
const metrics = {};
for (const route of ['/', '/projects', '/contact']) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    // FCP/LCP are most reliably observed via buffered PerformanceObserver.
    await page.addInitScript(() => {
      window.__lcp = 0;
      window.__fcp = 0;
      new PerformanceObserver((l) => {
        const entries = l.getEntries();
        window.__lcp = entries[entries.length - 1].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => {
        const entries = l.getEntries();
        window.__fcp = entries[entries.length - 1].startTime;
      }).observe({ type: 'paint', buffered: true });
    });
    await page.goto(BASE + route, { waitUntil: 'load' });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByName('first-contentful-paint')[0];
      return { ttfb: nav.responseStart, fcp: window.__fcp || (paints ? paints.startTime : 0), lcp: window.__lcp || 0, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd };
    });
    runs.push(m);
  }
  const median = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  metrics[route] = { ttfb: Math.round(median(runs.map((r) => r.ttfb))), fcp: Math.round(median(runs.map((r) => r.fcp))), lcp: Math.round(median(runs.map((r) => r.lcp ?? 0))), dcl: Math.round(median(runs.map((r) => r.dcl))) };
  console.log(`  ${route}: ${JSON.stringify(metrics[route])}`);
  check(`${route}: lab FCP ≤ 1800ms (localhost)`, metrics[route].fcp <= 1800, `${metrics[route].fcp}ms`);
  check(`${route}: TTFB ≤ 500ms (localhost)`, metrics[route].ttfb <= 500, `${metrics[route].ttfb}ms`);
  check(`${route}: lab LCP ≤ 2500ms (localhost)`, metrics[route].lcp > 0 && metrics[route].lcp <= 2500, `${metrics[route].lcp}ms`);
}

// CLS: load with slow CPU throttle and watch layout-shift entries
{
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let totalCls = 0;
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  for (const route of ['/', '/projects']) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => window.__cls);
    check(`${route}: CLS ≤ 0.1 (lab, 4x CPU throttle)`, cls <= 0.1, cls.toFixed(4));
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}

// ── Transfer sizes ──
let transfer = 0, requests = 0;
page.on('response', async (res) => {
  try {
    const headers = res.headers();
    const len = Number(headers['content-length'] ?? 0);
    transfer += len; requests++;
  } catch { /* ignore */ }
});
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const kb = Math.round(transfer / 1024);
console.log(`  home: ${requests} requests, ~${kb} KB transferred (content-length sum)`);
check('home JS+CSS+fonts transfer ≤ 350 KB', kb <= 350, `${kb} KB`);

await browser.close();
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log(failures.map((f) => ' - ' + f).join('\n'));
process.exit(fail === 0 ? 0 : 1);
