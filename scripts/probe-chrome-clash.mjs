/**
 * Measures the fixed chrome (#brand-mark vs .top-nav__links) at a range of
 * desktop widths and reports the gap between them (negative = clashing).
 * Saves a screenshot per width. Usage:
 *   node scripts/probe-chrome-clash.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:3000/'
const PORT = 9347
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
await sleep(9000) // preloader + intro

const WIDTHS = [1920, 1600, 1440, 1366, 1280, 1152, 1024, 900, 800]
for (const w of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false })
  await sleep(700)
  const r = await evaljs(`(()=>{
    const b=document.getElementById('brand-mark').getBoundingClientRect()
    const links=document.querySelector('.top-nav__links')
    const visible=links&&getComputedStyle(links).display!=='none'
    const n=(visible?links:document.querySelector('.top-nav__menu-btn')).getBoundingClientRect()
    return {mode:visible?'links':'burger',gap:Math.round(n.left-b.right),brandRight:Math.round(b.right),navLeft:Math.round(n.left),navW:Math.round(n.width)}
  })()`)
  console.log(w, JSON.stringify(r))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`._chrome_${w}.png`, Buffer.from(shot.data, 'base64'))
}

chrome.kill()
process.exit(0)
