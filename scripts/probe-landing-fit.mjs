/**
 * Verifies the landing logo card fits the viewport at wide desktop aspects:
 * boots the page FRESH at each size (no mid-session resize), waits for the
 * reveal plate, reports the rendered image box vs viewport and the gap
 * between the nav and the drawn artwork edge, and saves a screenshot.
 * Usage: node scripts/probe-landing-fit.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'http://localhost:3000/'
const PORT = 9353
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(path.join(tmpdir(), 'iwc-cdp-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`,
  '--window-size=1920,1000', 'about:blank',
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

// [w, h] viewports: Aaron's maximized 1080p (~2.03), full 16:9, laptop 16:10, squarer
const SIZES = [[1912, 940], [1600, 900], [1280, 800], [1200, 900]]
for (const [w, h] of SIZES) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: URL_TO_TEST })
  await sleep(2500)
  for (let i = 0; i < 40; i++) {
    const pre = await evaljs(`(()=>{const p=document.getElementById('preloader');return p?getComputedStyle(p).display:'none'})()`)
    if (pre === 'none') break
    await sleep(900)
  }
  await sleep(8000) // intro: backdrop fade + card wipe
  const r = await evaljs(`(()=>{
    const img=document.querySelector('#scene-1 .scene__bg img.bg-reveal')
    const fit=getComputedStyle(img).objectFit
    const box=img.getBoundingClientRect()
    // drawn artwork box under the computed object-fit
    const ar=img.naturalWidth/img.naturalHeight
    let dw=box.width,dh=box.height
    if(fit==='contain'){ if(box.width/box.height>ar){dh=box.height;dw=dh*ar}else{dw=box.width;dh=dw/ar} }
    const artLeft=box.left+(box.width-dw)/2, artRight=artLeft+dw
    const nav=document.querySelector('.top-nav__links')?.getBoundingClientRect()
    return {fit,viewport:innerWidth+'x'+innerHeight,art:Math.round(dw)+'x'+Math.round(dh),
      overflowY:Math.round(dh-innerHeight),navOverArt:nav?Math.round(artRight-nav.left):null}
  })()`)
  console.log(`${w}x${h}`, JSON.stringify(r))
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`._fit_${w}x${h}.png`, Buffer.from(shot.data, 'base64'))
}

chrome.kill()
process.exit(0)
