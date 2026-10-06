// Generates public/og-default.png, the link-preview image for pages without a cover.
// Run: node scripts/make-og-default.mjs
import sharp from 'sharp';

const name = 'Harry Wu';
const tagline = 'Software · Life · Things I make';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="96" y="250" width="56" height="6" rx="3" fill="#2f6feb"/>
  <text x="96" y="356" font-family="Ubuntu Sans, DejaVu Sans, sans-serif" font-size="96" font-weight="600" fill="#1c1c1c" letter-spacing="-1">${name}</text>
  <text x="96" y="420" font-family="Ubuntu Sans, DejaVu Sans, sans-serif" font-size="36" fill="#6b6b6b">${tagline}</text>
  <rect x="0" y="622" width="1200" height="8" fill="#e7e5e4"/>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og-default.png');
console.log('Wrote public/og-default.png');
