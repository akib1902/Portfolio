import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F5F0E8"/>
  <defs>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#282720" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="0" y="0" width="1200" height="10" fill="#D99036"/>
  <text x="64" y="92" font-family="Consolas, monospace" font-size="19" letter-spacing="3.4" fill="#565248">SOFTWARE ENGINEER · FULL-STACK · DEVOPS · QA</text>

  <text x="58" y="300" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="158" letter-spacing="-6" fill="#282720">AKIB</text>
  <text x="58" y="452" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="158" letter-spacing="-6" fill="#282720">AHMED</text>
  <rect x="58" y="474" width="96" height="8" fill="#D99036"/>

  <text x="64" y="530" font-family="Consolas, monospace" font-size="25" letter-spacing="2" fill="#8A5714">BUILD. TEST. DEPLOY.</text>
  <text x="64" y="574" font-family="Segoe UI, Arial, sans-serif" font-size="19" fill="#565248">I build full-stack applications, automate delivery pipelines, and test software for reliability.</text>

  <g>
    <rect x="842" y="76" width="300" height="452" rx="14" fill="#EAE3D7" stroke="#D9D0C3"/>
    <g transform="rotate(-16 992 302)">
      <rect x="790" y="250" width="404" height="104" fill="#D99036"/>
    </g>
    <text x="992" y="336" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="150" letter-spacing="-10" fill="#282720">AA</text>
    <text x="862" y="112" font-family="Consolas, monospace" font-size="13" letter-spacing="2" fill="#565248">SOFTWARE</text>
    <text x="862" y="132" font-family="Consolas, monospace" font-size="13" letter-spacing="2" fill="#565248">ENGINEER</text>
    <rect x="842" y="498" width="300" height="30" fill="#FFFCF6" stroke="#D9D0C3"/>
    <text x="856" y="518" font-family="Consolas, monospace" font-size="12" letter-spacing="1" fill="#565248">AKIB AHMED</text>
    <text x="1128" y="518" text-anchor="end" font-family="Consolas, monospace" font-size="12" letter-spacing="1" fill="#8A5714">BD / GMT+6</text>
  </g>

  <text x="64" y="608" font-family="Consolas, monospace" font-size="14" letter-spacing="1.6" fill="#6E6A60">FULL-STACK DEVELOPMENT · CLOUD INFRASTRUCTURE · TEST AUTOMATION</text>
  <text x="1136" y="608" text-anchor="end" font-family="Consolas, monospace" font-size="14" letter-spacing="1.6" fill="#3F6B4F">AVAILABLE</text>
</svg>`;

await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile('public/og.png');

const favicon = await readFile('public/favicon.svg');
await sharp(favicon, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');

console.log('Generated public/og.png and public/apple-touch-icon.png');
