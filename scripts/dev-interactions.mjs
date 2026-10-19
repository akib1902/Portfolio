import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const origin = 'http://127.0.0.1:3000';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

// ── Mobile navigation ───────────────────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });

  const menuHiddenInitially = (await page.$('#mobile-nav')) === null;
  check('mobile menu starts closed', menuHiddenInitially);

  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-nav');
  const expanded = await page.$eval('.menu-toggle', (button) =>
    button.getAttribute('aria-expanded'),
  );
  check('menu toggle reports expanded', expanded === 'true', expanded);

  const linkCount = await page.$$eval('#mobile-nav a', (links) => links.length);
  check('mobile menu exposes navigation links', linkCount >= 4, String(linkCount));

  await page.keyboard.press('Escape');
  await new Promise((resolve) => setTimeout(resolve, 120));
  check('Escape closes the mobile menu', (await page.$('#mobile-nav')) === null);
  const focusReturned = await page.evaluate(() => document.activeElement?.className);
  check('focus returns to the menu button', focusReturned === 'menu-toggle', focusReturned);

  await page.click('.menu-toggle');
  await page.waitForSelector('#mobile-nav');
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('#mobile-nav a')].find(
      (item) => item.textContent?.trim().startsWith('About'),
    );
    link?.click();
  });
  await page.waitForFunction(() => document.title.startsWith('About'));
  check('mobile navigation changes route', page.url().endsWith('/about'), page.url());
  check('mobile menu closes after navigation', (await page.$('#mobile-nav')) === null);
  await page.close();
}

// ── Project filters and search ──────────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/projects`, { waitUntil: 'networkidle0' });

  const initialCards = await page.$$eval('.projects-grid .project-card', (cards) => cards.length);
  check('projects page shows all case studies', initialCards === 3, String(initialCards));

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('.filter-chip')].find(
      (item) => item.textContent?.trim() === 'DevOps',
    );
    button?.click();
  });
  await page.waitForFunction(() => location.search.includes('category=DevOps'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  const devopsCards = await page.$$eval('.projects-grid .project-card', (cards) => cards.length);
  check('DevOps filter narrows to one project', devopsCards === 1, String(devopsCards));
  const pressed = await page.$eval(
    '.filter-chip[aria-pressed="true"]',
    (button) => button.textContent,
  );
  check('active filter is exposed with aria-pressed', pressed?.trim() === 'DevOps', pressed?.trim());

  await page.type('#project-search', 'zzzz-no-match');
  await page.waitForSelector('.empty-state');
  const emptyText = await page.$eval('.empty-state', (element) => element.textContent);
  check('search shows an empty state', /Nothing in this slice yet/.test(emptyText ?? ''));

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('.empty-state button')].find((item) =>
      item.textContent?.includes('Clear filters'),
    );
    button?.click();
  });
  await page.waitForSelector('.projects-grid');
  const resetCount = await page.$$eval('.projects-grid .project-card', (cards) => cards.length);
  check('clear filters restores all projects', resetCount === 3, String(resetCount));
  check('filter is removed from the URL', !page.url().includes('category='), page.url());

  await page.goto(`${origin}/projects?category=QA%20%2F%20Automation`, {
    waitUntil: 'networkidle0',
  });
  const qaCards = await page.$$eval('.projects-grid .project-card', (cards) => cards.length);
  check('deep-linked category filter is applied', qaCards === 3, String(qaCards));
  await page.close();
}

// ── Contact form: validation, success, storage ──────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/contact`, { waitUntil: 'networkidle0' });

  await page.click('.contact-form button[type="submit"]');
  await page.waitForSelector('.form-status--error');
  const fieldErrors = await page.$$eval('.field__error', (items) => items.length);
  check('invalid submission shows field errors', fieldErrors >= 2, String(fieldErrors));
  const focusedField = await page.evaluate(() => document.activeElement?.getAttribute('name'));
  check('first invalid field receives focus', focusedField === 'name', focusedField);

  await page.type('input[name="name"]', 'Browser Test');
  await page.type('input[name="email"]', 'browser-test@example.com');
  await page.select('select[name="inquiry"]', 'role');
  await page.type(
    'textarea[name="message"]',
    'This is an automated interaction test for the portfolio contact form.',
  );
  await page.click('.contact-form button[type="submit"]');
  await page.waitForSelector('.form-success', { timeout: 10000 });
  const successText = await page.$eval('.form-success', (element) => element.textContent);
  check('valid submission shows success state', /Message received/.test(successText ?? ''));
  const reference = await page.$eval('.form-success__reference', (element) => element.textContent);
  check('success state includes a reference', /Reference/.test(reference ?? ''), reference?.trim());

  const stored = fs.readFileSync(path.resolve('data/contact-submissions.jsonl'), 'utf8');
  const latest = stored.trim().split('\n').at(-1);
  const record = JSON.parse(latest);
  check('submission is persisted server-side', record.email === 'browser-test@example.com');
  check('submission is not exposed in the DOM', !successText.includes('browser-test@example.com'));
  await page.close();
}

// ── Contact form: network failure state ─────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().endsWith('/api/contact') && request.method() === 'POST') {
      request.respond({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'The message could not be saved right now.' }),
      });
    } else {
      request.continue();
    }
  });
  await page.goto(`${origin}/contact`, { waitUntil: 'networkidle0' });
  await page.type('input[name="name"]', 'Failure Test');
  await page.type('input[name="email"]', 'failure@example.com');
  await page.type('textarea[name="message"]', 'Testing how the form reports a server failure.');
  await page.click('.contact-form button[type="submit"]');
  await page.waitForSelector('.form-status--error');
  const errorText = await page.$eval('.form-status--error', (element) => element.textContent);
  check('server failure is surfaced honestly', /could not be saved/.test(errorText ?? ''));
  check('success state is not shown on failure', (await page.$('.form-success')) === null);
  await page.close();
}

await browser.close();
const failed = results.filter((result) => !result.pass);
fs.writeFileSync('shots/interaction-results.json', JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
