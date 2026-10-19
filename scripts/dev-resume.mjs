import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1400 });
await page.goto('http://127.0.0.1:3000/resume', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.emulateMediaType('print');
await page.screenshot({ path: 'shots/resume-print.png', fullPage: true });
await page.pdf({
  path: 'public/akib-ahmed-resume.pdf',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log('Generated public/akib-ahmed-resume.pdf and shots/resume-print.png');
