/**
 * Generates public/og-image.png (1200×630) for social sharing.
 * Run once: node scripts/generate-og-image.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath   = path.resolve(__dirname, '..', 'public', 'og-image.png');

const W = 1200, H = 630;

// SVG composition — no external fonts needed, system-safe fallback
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="web" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Subtle web geometry (decorative spokes) -->
  <g stroke="#93c5fd" stroke-opacity="0.12" stroke-width="1">
    <line x1="${W}" y1="0" x2="${W*0.3}" y2="${H}"/>
    <line x1="${W}" y1="0" x2="${W*0.1}" y2="${H}"/>
    <line x1="${W}" y1="0" x2="${-W*0.1}" y2="${H}"/>
    <line x1="${W}" y1="0" x2="${W*0.55}" y2="${H}"/>
    <line x1="${W}" y1="0" x2="${W*0.75}" y2="${H}"/>
    <!-- Arcs as rings -->
    <ellipse cx="${W}" cy="0" rx="320" ry="220" fill="none" stroke-opacity="0.09"/>
    <ellipse cx="${W}" cy="0" rx="520" ry="360" fill="none" stroke-opacity="0.07"/>
    <ellipse cx="${W}" cy="0" rx="720" ry="500" fill="none" stroke-opacity="0.05"/>
    <ellipse cx="${W}" cy="0" rx="950" ry="660" fill="none" stroke-opacity="0.04"/>
  </g>

  <!-- Logo wordmark -->
  <text
    x="80" y="240"
    font-family="Arial,Helvetica,sans-serif"
    font-size="22"
    font-weight="300"
    letter-spacing="8"
    fill="rgba(255,255,255,0.65)"
    text-anchor="start"
  >integrity</text>
  <text
    x="80" y="270"
    font-family="Arial,Helvetica,sans-serif"
    font-size="22"
    font-weight="800"
    letter-spacing="6"
    fill="white"
    text-anchor="start"
  >WEB CREATIONS</text>

  <!-- Divider -->
  <rect x="80" y="290" width="60" height="3" rx="1.5" fill="#60a5fa"/>

  <!-- Headline -->
  <text
    x="80" y="370"
    font-family="Arial,Helvetica,sans-serif"
    font-size="52"
    font-weight="800"
    fill="white"
    letter-spacing="-1"
  >Your Business.</text>
  <text
    x="80" y="435"
    font-family="Arial,Helvetica,sans-serif"
    font-size="52"
    font-weight="800"
    fill="white"
    letter-spacing="-1"
  >Every Screen.</text>

  <!-- Subline -->
  <text
    x="80" y="500"
    font-family="Arial,Helvetica,sans-serif"
    font-size="20"
    font-weight="400"
    fill="rgba(147,197,253,0.90)"
  >Custom websites · Beaufort, SC · Est. 2010</text>

  <!-- Domain pill -->
  <rect x="80" y="536" width="310" height="42" rx="21" fill="rgba(255,255,255,0.12)"/>
  <text
    x="235" y="562"
    font-family="Arial,Helvetica,sans-serif"
    font-size="16"
    font-weight="600"
    fill="white"
    text-anchor="middle"
  >integritywebcreations.com</text>
</svg>`;

await sharp(Buffer.from(svg))
  .resize(W, H)
  .png({ quality: 90 })
  .toFile(outPath);

console.log(`✓ og-image.png written to ${outPath}`);
