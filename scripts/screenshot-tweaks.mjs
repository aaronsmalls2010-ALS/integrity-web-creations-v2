/**
 * One-off probe of the 2026-06-11 evening tweaks on the LIVE site:
 * landing scroll cue, scene-4 mobile copy position, scene-6 CTA,
 * scene-7 mobile centering.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'https://www.integritywebcreations.com/'
const PORT = 9361
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
const TOTAL = 30.8

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

async function boot(tag, metrics, shots) {
  await send('Emulation.setDeviceMetricsOverride', metrics)
  await send('Page.reload', { ignoreCache: false })
  await sleep(2500)
  for (let i = 0; i < 40; i++) {
    const pre = await evaljs(`(()=>{const p=document.getElementById('preloader');return p?getComputedStyle(p).display:'none'})()`)
    if (pre === 'none') break
    await sleep(900)
  }
  await sleep(6000)
  for (const [name, units] of shots) {
    await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${units / TOTAL}));await new Promise(r=>setTimeout(r,3800));return 1})()`)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`._tw_${tag}_${name}.png`, Buffer.from(shot.data, 'base64'))
    console.log(`saved ._tw_${tag}_${name}.png`)
  }
}

await boot('desktop', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false }, [
  ['scene6cta', 23.9],
])

chrome.kill()
process.exit(0)
