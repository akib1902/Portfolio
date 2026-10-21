// QA Phase 7: automated accessibility scans with axe-core (WCAG 2.2 AA).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100';
const ROUTES = ['/', '/about', '/projects', '/projects/financial-research-settlement-agent', '/contact', '/resume'];
const THEMES = ['amber-minimal', 'graphite-terminal', 'swiss-editorial', 'warm-bento', 'forest-sand'];

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(`${name} ${detail}`); console.log(`  FAIL ${name} ${detail}`); }
}

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function scan(route) {
  // NOTE: the production CSP (script-src 'self') blocks addScriptTag for inline
  // scripts — verified separately. page.evaluate uses the CDP runtime, which is
  // not subject to page CSP, so axe is evaluated there instead.
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
    });
    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 3),
    }));
  });
}

// Scan every route in the default theme
for (const route of ROUTES) {
  console.log(`axe scan: ${route} (amber-minimal)`);
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  const violations = await scan(route);
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  check(`${route}: no serious/critical WCAG 2.2 AA violations`, serious.length === 0, JSON.stringify(serious).slice(0, 400));
  if (violations.length) console.log(`    info-level: ${violations.map((v) => `${v.id}(${v.impact})`).join(', ')}`);
}

// Contrast-sensitive themes: scan home + contact in every theme
for (const theme of THEMES) {
  console.log(`axe scan: / (theme ${theme})`);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('akib-portfolio-theme', t), theme);
  await page.reload({ waitUntil: 'networkidle' });
  const violations = await scan('/');
  const contrast = violations.filter((v) => v.id === 'color-contrast');
  check(`theme ${theme}: no colour-contrast violations`, contrast.length === 0, JSON.stringify(contrast).slice(0, 300));
}

// Admin login page accessibility
console.log('axe scan: /admin/login');
await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
const loginViolations = await scan('/admin/login');
check('admin login: no serious/critical violations', loginViolations.filter((v) => ['serious', 'critical'].includes(v.impact)).length === 0, JSON.stringify(loginViolations).slice(0, 400));

// Keyboard workflow on projects filters
console.log('Block: keyboard workflows');
await page.goto(BASE + '/projects', { waitUntil: 'networkidle' });
await page.locator('button.filter-chip:has-text("DevOps")').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('filter operable with keyboard', (await page.locator('.project-card').count()) === 1);
await page.locator('#project-search').focus();
await page.keyboard.type('pipeline');
await page.waitForTimeout(300);
check('search operable with keyboard', (await page.locator('.project-card').count()) <= 1);

// Theme selector keyboard access
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const selector = page.locator('header select').first();
await selector.focus();
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
check('theme selector keyboard-operable', Boolean(themeAfter) && themeAfter !== 'amber-minimal', `theme ${themeAfter}`);

// Reduced motion
console.log('Block: reduced motion');
const rmCtx = await browser.newContext({ reducedMotion: 'reduce' });
const rmPage = await rmCtx.newPage();
await rmPage.goto(BASE + '/', { waitUntil: 'networkidle' });
const animCount = await rmPage.evaluate(() => {
  return [...document.querySelectorAll('*')].filter((el) => {
    const s = getComputedStyle(el);
    return (s.animationName !== 'none' && s.animationDuration !== '0s') ||
      (s.transitionDuration !== '0s' && parseFloat(s.transitionDuration) > 0.05);
  }).length;
});
check('reduced-motion disables/pares animations', animCount <= 3, `${animCount} animated elements`);
await rmCtx.close();

// Touch targets at 390px viewport — official WCAG 2.2 AA SC 2.5.8 rule.
// (An earlier naive bounding-box heuristic flagged inline text links, which
// SC 2.5.8 explicitly exempts; axe's target-size rule encodes the real spec.)
console.log('Block: touch targets (390px, axe target-size)');
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mobile.newPage();
for (const route of ['/', '/about', '/projects', '/contact', '/resume']) {
  await mp.goto(BASE + route, { waitUntil: 'networkidle' });
  await mp.evaluate(axeSource);
  const tv = await mp.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['target-size'] } });
    return r.violations.map((v) => v.nodes.map((n) => n.target.join(' ')).slice(0, 4));
  });
  check(`${route}: no SC 2.5.8 target-size violations`, tv.length === 0, JSON.stringify(tv).slice(0, 200));
}
await mobile.close();

await browser.close();
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log(failures.map((f) => ' - ' + f).join('\n'));
process.exit(fail === 0 ? 0 : 1);
