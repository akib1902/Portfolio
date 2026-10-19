import puppeteer from 'puppeteer-core';

const origin = 'http://127.0.0.1:3100';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error') problems.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
page.on('requestfailed', (request) =>
  problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`),
);

const home = await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
const homeStatus = home?.status();
const title = await page.title();
const h1 = await page.$eval('h1', (element) => element.textContent?.replace(/\s+/g, ' ').trim());
console.log({ homeStatus, title, h1 });

const cspViolations = await page.evaluate(() => {
  return performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.includes('content-security-policy'))
    .map((entry) => entry.name);
});
console.log({ cspViolations });

const notFound = await page.goto(`${origin}/nope`, { waitUntil: 'networkidle0' });
console.log('unknown route status:', notFound?.status(), 'title:', await page.title());

await page.goto(`${origin}/resume`, { waitUntil: 'networkidle0' });
const pdf = await page.evaluate(async () => {
  const link = document.querySelector('a[download][href$=".pdf"]');
  if (!link) return { found: false };
  const response = await fetch(link.href);
  return {
    found: true,
    href: link.getAttribute('href'),
    status: response.status,
    type: response.headers.get('content-type'),
    bytes: (await response.blob()).size,
  };
});
console.log('pdf:', pdf);

await page.goto(`${origin}/contact`, { waitUntil: 'networkidle0' });
await page.type('input[name="name"]', 'Production Test');
await page.type('input[name="email"]', 'production@example.com');
await page.select('select[name="inquiry"]', 'project');
await page.type(
  'textarea[name="message"]',
  'Production smoke test message with enough context for validation.',
);
await page.click('.contact-form button[type="submit"]');
await page.waitForSelector('.form-success', { timeout: 10000 });
console.log('production form: success');

console.log('problems:', problems);
await browser.close();
if (problems.length) process.exitCode = 1;
