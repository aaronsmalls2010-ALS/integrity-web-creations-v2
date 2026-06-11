/**
 * IWC asset pipeline (sharp) — Build Order step 2.
 *
 * Per scene: AVIF + WebP at a desktop tier and a mobile tier
 *   → /public/images/scenes/scene-N-{desktop|mobile}.{webp,avif}
 *
 * Brief targets 2560w desktop / 1536w mobile, BUT the delivered sources
 * (IWC_Concept_N.png) are ~1536×1024 native. We never upscale: desktop tier =
 * min(2560, native), mobile tier = 1536 when the native is larger, else 1080.
 * FLAGGED in the checkpoint report — re-exported 2560w+ sources slot straight
 * in by re-running `npm run optimize-images`.
 *
 * Budgets (brief): WebP ≤400KB desktop / ≤220KB mobile · AVIF ≤280KB / ≤160KB.
 * Quality steps down from the baseline until each file fits (trim quality
 * before dimensions).
 *
 * Also: /public/og.jpg (1200×630, Scene 1 art incl. wordmark), favicons from
 * the IWC monogram region of Scene 1, and Storyboard.png → /docs.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(root, 'Storyboard')
const OUT_DIR = path.join(root, 'public', 'images', 'scenes')
const DOCS_DIR = path.join(root, 'docs')

const SCENES = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  n,
  src: path.join(SRC_DIR, `IWC_Concept_${n}.png`),
}))

const BUDGET = {
  desktop: { webp: 400_000, avif: 280_000 },
  mobile: { webp: 220_000, avif: 160_000 },
}

const kb = (b) => `${(b / 1024).toFixed(0)}KB`

async function encodeWithBudget(pipeline, format, startQ, budget, outPath) {
  let q = startQ
  for (;;) {
    const buf =
      format === 'webp'
        ? await pipeline.clone().webp({ quality: q, effort: 5 }).toBuffer()
        : await pipeline.clone().avif({ quality: q, effort: 6 }).toBuffer()
    if (buf.length <= budget || q <= 40) {
      await fs.writeFile(outPath, buf)
      const over = buf.length > budget ? '  ⚠ OVER BUDGET' : ''
      console.log(
        `  ${path.basename(outPath).padEnd(28)} q=${q}  ${kb(buf.length)} (budget ${kb(budget)})${over}`,
      )
      return buf.length
    }
    q -= 6
  }
}

async function scenes() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const { n, src } of SCENES) {
    const meta = await sharp(src).metadata()
    const desktopW = Math.min(2560, meta.width)
    const mobileW = meta.width > 1536 ? 1536 : 1080
    console.log(`Scene ${n}  (${meta.width}×${meta.height} native)`)
    for (const [tier, w] of [
      ['desktop', desktopW],
      ['mobile', mobileW],
    ]) {
      const pipeline = sharp(src).resize({ width: w, withoutEnlargement: true })
      await encodeWithBudget(
        pipeline,
        'webp',
        82,
        BUDGET[tier].webp,
        path.join(OUT_DIR, `scene-${n}-${tier}.webp`),
      )
      await encodeWithBudget(
        pipeline,
        'avif',
        60,
        BUDGET[tier].avif,
        path.join(OUT_DIR, `scene-${n}-${tier}.avif`),
      )
    }
  }
}

/** og.jpg — Scene 1 art (logo + wordmark region), 1200×630 */
async function og() {
  const src = SCENES[0].src
  const meta = await sharp(src).metadata()
  // 1.904:1 window over the logo block (upper-middle of the 1448×1086 art)
  const w = meta.width
  const h = Math.round(w / (1200 / 630))
  const top = Math.min(108, meta.height - h)
  await sharp(src)
    .extract({ left: 0, top: Math.max(0, top), width: w, height: h })
    .resize(1200, 630)
    .jpeg({ quality: 80 })
    .toFile(path.join(root, 'public', 'og.jpg'))
  console.log('og.jpg            1200×630 written')
}

/** favicons from the IWC monogram region of Scene 1 */
async function favicons() {
  const src = SCENES[0].src
  // "IWC" letters (pixel-measured dense bbox x 485–895, y 203–460 + padding),
  // full-width on a navy square for max legibility at small sizes.
  // NOTE: sharp allows ONE resize per pipeline — pad in a second pass.
  const region = { left: 425, top: 170, width: 600, height: 310 }
  const NAVY = '#0a0f1f'
  const strip = await sharp(src).extract(region).png().toBuffer()
  const pad = async (w, h, ext, out) => {
    const buf = await sharp(strip).resize(w, h).png().toBuffer()
    return sharp(buf)
      .extend({ ...ext, background: NAVY })
      .png()
      [out ? 'toFile' : 'toBuffer'](out)
  }
  await pad(460, 238, { top: 137, bottom: 137, left: 26, right: 26 },
    path.join(root, 'app', 'icon.png'))
  await pad(164, 85, { top: 48, bottom: 47, left: 8, right: 8 },
    path.join(root, 'app', 'apple-icon.png'))
  // favicon.ico — single 32×32 PNG-embedded ICO (valid in all modern browsers)
  const png32 = await pad(30, 16, { top: 8, bottom: 8, left: 1, right: 1 })
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // count
  header.writeUInt8(32, 6) // width
  header.writeUInt8(32, 7) // height
  header.writeUInt8(0, 8) // palette
  header.writeUInt8(0, 9) // reserved
  header.writeUInt16LE(1, 10) // planes
  header.writeUInt16LE(32, 12) // bpp
  header.writeUInt32LE(png32.length, 14)
  header.writeUInt32LE(22, 18) // offset
  await fs.writeFile(
    path.join(root, 'public', 'favicon.ico'),
    Buffer.concat([header, png32]),
  )
  console.log('favicons          app/icon.png · app/apple-icon.png · public/favicon.ico')
}

async function storyboardDoc() {
  await fs.mkdir(DOCS_DIR, { recursive: true })
  await fs.copyFile(
    path.join(SRC_DIR, 'Storyboard.png'),
    path.join(DOCS_DIR, 'storyboard.png'),
  )
  console.log('docs/storyboard.png copied')
}

await scenes()
await og()
await favicons()
await storyboardDoc()
console.log('\nAsset pipeline complete.')
