/**
 * CDP screenshot probe of the DEPLOYED subpages (cinematic hero rebuild).
 * For each page: hero after the line reveals, then a scrolled shot of the
 * page's signature moment. Usage:
 *   node scripts/screenshot-subpages.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = (process.argv[2] ?? 'https://iwc-cinematic-preview.vercel.app').replace(/\/$/, '')
const PORT = 9341
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(path.join(tmpdir(), 'iwc-cdp-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`,
  '--window-size=1600,1000', 'about:blank',
])

let ready
for (let i = 0; i < 40; i++) {
  try { ready = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()); break } catch { await sleep(250) }
}
if (!ready) throw new Error('chrome debugger not reachable')
const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaljs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Runtime.enable')
await send('Page.enable')

async function shoot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`._shot_${name}.png`, Buffer.from(shot.data, 'base64'))
  console.log(`saved ._shot_${name}.png`)
}

// scrollFrac: fraction of (scrollHeight - innerHeight) for the signature shot
const PAGES = [
  ['services', 0.45],
  ['about', 0.42],
  ['portfolio', 0.3],
  ['contact', 0.55],
]

async function run(tag, metrics) {
  await send('Emulation.setDeviceMetricsOverride', metrics)
  for (const [page, frac] of PAGES) {
    await send('Page.navigate', { url: `${BASE}/${page}` })
    await sleep(6500) // page fade + label + line reveals + lede + cue
    await shoot(`${tag}_${page}_hero`)
    await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${frac}));await new Promise(r=>setTimeout(r,4200));return 1})()`)
    await shoot(`${tag}_${page}_body`)
  }
}

await run('desktop', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await run('mobile', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

chrome.kill()
process.exit(0)
