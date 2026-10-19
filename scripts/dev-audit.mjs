import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const origin = 'http://127.0.0.1:3000';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = path.resolve('shots');
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  ['home', '/'],
  ['about', '/about'],
  ['projects', '/projects'],
  ['project-agent', '/projects/financial-research-settlement-agent'],
  ['project-platform', '/projects/full-stack-learning-platform'],
  ['project-pipeline', '/projects/cicd-test-automation-lab'],
  ['contact', '/contact'],
  ['resume', '/resume'],
  ['not-found', '/nope'],
];

const viewports = [
  ['desktop', { width: 1440, height: 1000, deviceScaleFactor: 1, isMobile: false, hasTouch: false }],
  ['tablet', { width: 834, height: 1112, deviceScaleFactor: 1, isMobile: false, hasTouch: true }],
  ['mobile', { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }],
];

const axeSource = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

const report = { generatedAt: new Date().toISOString(), pages: {} };

for (const [viewportName, viewport] of viewports) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const [name, route] of routes) {
    await page.goto(origin + route, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const h1 = document.querySelector('h1');
      const brokenImages = [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src);
      const overflowing = [...document.querySelectorAll('body *')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1);
        })
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName,
          class: element.className?.toString?.().slice(0, 80),
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
        }));
      return {
        title: document.title,
        h1: h1?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
        brokenImages,
        overflowing,
      };
    });

    if (viewportName === 'desktop' || viewportName === 'mobile') {
      await page.screenshot({
        path: path.join(outDir, `${name}-${viewportName}.jpg`),
        fullPage: true,
        type: 'jpeg',
        quality: 72,
      });
    }

    let axe = null;
    if (viewportName === 'desktop') {
      await page.addScriptTag({ content: axeSource });
      axe = await page.evaluate(async () => {
        const results = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
        return results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.slice(0, 4).map((node) => node.target.join(' ')),
          count: violation.nodes.length,
        }));
      });
    }

    report.pages[`${name}-${viewportName}`] = { route, ...metrics, consoleErrors: [...errors], axe };
  }
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
