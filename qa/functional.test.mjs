// QA Phase 3: functional browser tests — routing, filters, search, history, contact form UX.
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100';
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
const ctx = await browser.newContext();
const page = await ctx.newPage();

// ── Navigation and history ──
console.log('Block: navigation and history');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
check('home hero renders', /build/i.test(await page.locator('h1').first().innerText()));

await page.click('header a[href="/projects"]');
await page.waitForURL('**/projects');
check('client navigation to /projects', /selected work/i.test(await page.locator('h1').first().innerText()));

await page.goBack();
await page.waitForURL(BASE + '/');
check('browser Back returns home', /build/i.test(await page.locator('h1').first().innerText()));

await page.goForward();
await page.waitForURL('**/projects');
check('browser Forward returns to projects', /selected work/i.test(await page.locator('h1').first().innerText()));

// Direct URL entry + refresh of a nested route
await page.goto(BASE + '/projects/full-stack-learning-platform', { waitUntil: 'networkidle' });
check('direct entry to nested project route', await page.locator('h1').first().innerText().then((t) => t.length > 0));
await page.reload({ waitUntil: 'networkidle' });
check('nested route refresh works', await page.locator('.evidence-card, main').first().isVisible());

// New tab (target=_blank links)
const [popup] = await Promise.all([
  ctx.waitForEvent('page'),
  page.goto(BASE + '/', { waitUntil: 'networkidle' }).then(() =>
    page.locator('a[target="_blank"]').first().click(),
  ),
]).catch(() => [null]);

// ── Projects: filters, search, deep links ──
console.log('Block: project filters and search');
await page.goto(BASE + '/projects', { waitUntil: 'networkidle' });
const allCards = await page.locator('.project-card').count();
check('all projects listed', allCards === 3, `count ${allCards}`);

await page.click('button.filter-chip:has-text("DevOps")');
await page.waitForURL(/category=DevOps/);
const devopsCards = await page.locator('.project-card').count();
check('DevOps filter narrows results', devopsCards === 1, `count ${devopsCards}`);
check('filter chip is aria-pressed', (await page.locator('button.filter-chip:has-text("DevOps")').getAttribute('aria-pressed')) === 'true');

// Deep link with filter state
await page.goto(BASE + '/projects?category=Full-Stack', { waitUntil: 'networkidle' });
await page.waitForTimeout(200);
const fsCards = await page.locator('.project-card').count();
check('deep link ?category=Full-Stack restores filter', fsCards === 1, `count ${fsCards}`);

// Invalid category param → falls back to All
await page.goto(BASE + '/projects?category=Bogus', { waitUntil: 'networkidle' });
await page.waitForTimeout(200);
check('invalid category falls back to All', (await page.locator('.project-card').count()) === 3);

// Search
await page.goto(BASE + '/projects', { waitUntil: 'networkidle' });
await page.fill('#project-search', 'CI/CD');
await page.waitForTimeout(200);
const searchCards = await page.locator('.project-card').count();
check('search narrows results', searchCards === 1, `count ${searchCards}`);

// Combined filter + search with empty result → empty state + reset
await page.click('button.filter-chip:has-text("Backend")');
await page.waitForURL(/category=Backend/);
await page.fill('#project-search', 'zzzz-no-match');
await page.waitForTimeout(200);
check('empty state shown for no matches', await page.locator('.empty-state').isVisible());
await page.click('.empty-state button:has-text("Clear filters")');
await page.waitForTimeout(300);
check('clear filters restores all projects', (await page.locator('.project-card').count()) === 3, `count ${await page.locator('.project-card').count()}`);

// Results live region announced
const statusText = await page.locator('[role="status"]').first().innerText();
check('results bar announces counts', /showing 3 of 3/i.test(statusText), statusText.slice(0, 60));

// ── Contact form UX ──
console.log('Block: contact form UX');
await page.goto(BASE + '/contact', { waitUntil: 'networkidle' });
// Empty submission → client-side errors
await page.click('button[type="submit"], form button:has-text("Send"), form button:has-text("send")').catch(() => {});
await page.waitForTimeout(400);
const liveErrors = await page.locator('[role="alert"], .field__error, .field-error, [aria-invalid="true"]').count();
check('empty submit surfaces validation feedback', liveErrors > 0, `errors ${liveErrors}`);

// Invalid email
const emailInput = page.locator('input[type="email"], input[name="email"]').first();
await emailInput.fill('not-an-email');
const msg = page.locator('textarea[name="message"], textarea').first();
if (await msg.count()) await msg.fill('QA automated message body for validation testing.');
const nameInput = page.locator('input[name="name"]').first();
if (await nameInput.count()) await nameInput.fill('QA Tester');
await page.click('button[type="submit"]').catch(() => {});
await page.waitForTimeout(400);
const invalidEmailShown = await page.locator('[aria-invalid="true"], [role="alert"]').count();
check('invalid email rejected', invalidEmailShown > 0, `count ${invalidEmailShown}`);

// Keyboard-only: tab through form and check visible focus
await page.goto(BASE + '/contact', { waitUntil: 'networkidle' });
let focusRingVisible = false;
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    return { tag: el.tagName, outline: s.outlineStyle, outlineWidth: s.outlineWidth, shadow: s.boxShadow };
  });
  if (info && (info.outline !== 'none' || (info.shadow && info.shadow !== 'none'))) {
    focusRingVisible = true;
    break;
  }
}
check('keyboard focus is visible in contact form', focusRingVisible);

// Skip link
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const firstFocus = await page.evaluate(() => document.activeElement?.textContent ?? '');
check('skip link is the first tab stop', /skip/i.test(firstFocus), `got "${firstFocus}"`);

await browser.close();
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log(failures.map((f) => ' - ' + f).join('\n'));
process.exit(fail === 0 ? 0 : 1);
