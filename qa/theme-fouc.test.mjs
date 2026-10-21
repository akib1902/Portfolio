// QA Phase 4: theme system + FOUC verification against the production server.
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100';
const THEMES = {
  'amber-minimal': 'rgb(245, 240, 232)',
  'graphite-terminal': 'rgb(21, 23, 26)',
  'swiss-editorial': 'rgb(251, 250, 247)',
  'warm-bento': 'rgb(241, 231, 219)',
  'forest-sand': 'rgb(239, 228, 210)',
};
const KEY = 'akib-portfolio-theme';

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

const browser = await chromium.launch({ channel: 'chrome' });

async function newPage(opts = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  return { ctx, page };
}

// ── 1. First visit, empty storage: server default theme in initial HTML ──
{
  console.log('Scenario 1: first visit, empty storage');
  const { ctx, page } = await newPage();
  const resp = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('initial HTML carries default theme', theme === 'amber-minimal', `got ${theme}`);
  check('http 200', resp.status() === 200);
  // At DOMContentLoaded the canvas must already be painted by boot.css.
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  check('canvas colour at DOMContentLoaded matches theme', bg === THEMES[theme], `${bg} vs ${THEMES[theme]}`);
  await ctx.close();
}

// ── 2. Every saved theme applies pre-hydration and survives navigation ──
for (const [saved, colour] of Object.entries(THEMES)) {
  console.log(`Scenario 2: saved theme ${saved}`);
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('akib-portfolio-theme', t), saved);

  // Delay only the main CSS bundle to make any FOUC window observable.
  await page.route('**/assets/index-*.css', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });

  const start = Date.now();
  const nav = page.goto(BASE + '/about', { waitUntil: 'domcontentloaded' });
  // Sample the DOM repeatedly from the earliest moment to catch wrong-theme frames.
  const samples = [];
  const sampler = (async () => {
    while (Date.now() - start < 4000) {
      try {
        samples.push(
          await page.evaluate(() => ({
            t: document.documentElement.getAttribute('data-theme'),
            bg: getComputedStyle(document.documentElement).backgroundColor,
            phase: document.readyState,
          })),
        );
      } catch {
        /* navigation in flight */
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  })();
  await Promise.all([nav, sampler]);

  const wrongFrame = samples.find((s) => s.phase !== 'loading' && s.t !== saved);
  check(`${saved}: data-theme correct at every sampled frame`, !wrongFrame, JSON.stringify(wrongFrame ?? {}));
  const wrongBg = samples.find((s) => s.phase !== 'loading' && s.bg && s.bg !== colour && s.bg !== 'rgba(0, 0, 0, 0)');
  check(`${saved}: canvas colour never flashes another theme`, !wrongBg, JSON.stringify(wrongBg ?? {}));
  const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check(`${saved}: still applied after load`, themeAttr === saved, `got ${themeAttr}`);

  // Paint-timing proof: FCP must land after data-theme was set to the saved
  // value, so no painted frame can ever show the wrong theme.
  const paintPage = await ctx.newPage();
  await paintPage.addInitScript(() => {
    window.__themeAppliedAt = null;
    const orig = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'data-theme' && this === document.documentElement) {
        window.__themeAppliedAt = performance.now();
      }
      return orig.call(this, name, value);
    };
  });
  await paintPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await paintPage.evaluate((t) => localStorage.setItem('akib-portfolio-theme', t), saved);
  await paintPage.goto(BASE + '/', { waitUntil: 'networkidle' });
  const timing = await paintPage.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { fcp: fcp ? fcp.startTime : null, applied: window.__themeAppliedAt };
  });
  check(
    `${saved}: FCP occurs after saved theme applied`,
    timing.fcp !== null && timing.applied !== null && timing.fcp >= timing.applied,
    JSON.stringify(timing),
  );
  await ctx.close();
}

// ── 3. Persistence across routes, reload, and new tab (same context) ──
{
  console.log('Scenario 3: persistence across routes / reload / new tab');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.selectOption('header select, .theme-switcher select', 'forest-sand');
  await page.waitForFunction((t) => document.documentElement.getAttribute('data-theme') === t, 'forest-sand');
  const stored = await page.evaluate(() => localStorage.getItem('akib-portfolio-theme'));
  check('selector writes localStorage', stored === 'forest-sand', `got ${stored}`);

  await page.click('a[href="/projects"]');
  await page.waitForURL('**/projects');
  let t = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('theme survives client navigation', t === 'forest-sand', `got ${t}`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  t = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('theme survives reload', t === 'forest-sand', `got ${t}`);

  const page2 = await ctx.newPage();
  await page2.goto(BASE + '/contact', { waitUntil: 'domcontentloaded' });
  t = await page2.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('theme applies in new tab', t === 'forest-sand', `got ${t}`);
  await ctx.close();
}

// ── 4. Invalid / hostile saved values fall back to default ──
for (const bad of ['bogus-theme', '', 'AMBER', '__proto__', '../../etc/passwd']) {
  console.log(`Scenario 4: invalid stored value "${bad}"`);
  const { ctx, page } = await newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((v) => localStorage.setItem('akib-portfolio-theme', v), bad);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const t = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check(`invalid value "${bad}" falls back to default`, t === 'amber-minimal', `got ${t}`);
  await ctx.close();
}

// ── 5. localStorage throwing (storage blocked): default theme must stay ──
{
  console.log('Scenario 5: storage access throws');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('storage disabled');
      },
    });
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const t = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('default theme applied when storage throws', t === 'amber-minimal', `got ${t}`);
  check('no unhandled page error when storage throws', errors.length === 0, errors.join('; '));
  await ctx.close();
}

// ── 6. Hydration + console cleanliness on every public route ──
for (const route of ['/', '/about', '/projects', '/projects/financial-research-settlement-agent', '/contact', '/resume']) {
  console.log(`Scenario 6: console/hydration on ${route}`);
  const { ctx, page } = await newPage();
  const consoleMsgs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e}`));
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const hydration = consoleMsgs.filter((m) => /hydrat|mismatch|Minified React error/i.test(m));
  check(`${route}: no hydration warnings`, hydration.length === 0, hydration.join(' | '));
  check(`${route}: no console errors`, consoleMsgs.filter((m) => m.startsWith('[error]') || m.startsWith('[pageerror]')).length === 0, consoleMsgs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log(failures.map((f) => ' - ' + f).join('\n'));
process.exit(fail === 0 ? 0 : 1);
