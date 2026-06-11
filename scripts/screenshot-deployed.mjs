/**
 * CDP screenshot probe of the DEPLOYED site at desktop + mobile sizes.
 * Boots the page (waits for the preloader + intro), scrolls to requested
 * timeline positions, and saves PNGs. Usage:
 *   node scripts/screenshot-deployed.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'https://iwc-cinematic-preview.vercel.app'
const PORT = 9335
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
const TOTAL = 26.04 // scroll units

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
const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL_TO_TEST)}`, { method: 'PUT' }).then((r) => r.json())
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaljs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Runtime.enable')
await send('Page.enable')

async function bootAndShoot(tag, metrics) {
  if (metrics) await send('Emulation.setDeviceMetricsOverride', metrics)
  await send('Page.reload', { ignoreCache: false })
  await sleep(2500)
  for (let i = 0; i < 40; i++) {
    const pre = await evaljs(`(()=>{const p=document.getElementById('preloader');return p?getComputedStyle(p).display:'none'})()`)
    if (pre === 'none') break
    await sleep(900)
  }
  await sleep(5500) // intro
  const shots = [
    ['warmup', 1.5 / TOTAL], // absorbs the intro-pause window
    ['landing', 0],
    ['scene2', 4.5 / TOTAL],
    ['scene5', 14.6 / TOTAL],
    ['scene7', 23.4 / TOTAL],
  ]
  for (const [name, frac] of shots) {
    await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${frac}));await new Promise(r=>setTimeout(r,3800));return 1})()`)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`._shot_${tag}_${name}.png`, Buffer.from(shot.data, 'base64'))
    console.log(`saved ._shot_${tag}_${name}.png`)
  }
}

await bootAndShoot('mobile', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await bootAndShoot('landscape', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true })

chrome.kill()
process.exit(0)
