/** Walks the timeline on MOBILE emulation and screenshots each scene the
 *  moment its #scene-N computes visible (state-driven, not unit guessing). */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'https://www.integritywebcreations.com/'
const PORT = 9371
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
if (!ready) throw new Error('no chrome')
const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL_TO_TEST)}`, { method: 'PUT' }).then((r) => r.json())
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaljs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value
await send('Runtime.enable'); await send('Page.enable')

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.reload', {})
await sleep(2500)
for (let i = 0; i < 40; i++) {
  const pre = await evaljs(`(()=>{const p=document.getElementById('preloader');return p?getComputedStyle(p).display:'none'})()`)
  if (pre === 'none') break
  await sleep(900)
}
await sleep(6000)

let next = 2 // scene 1 shot at fr=0 below
const shot1 = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync('._all_mobile_scene1.png', Buffer.from(shot1.data, 'base64'))
console.log('saved scene1 @ 0')
for (let fr = 0.05; fr <= 0.97 && next <= 7; fr += 0.015) {
  const vis = await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${fr}));await new Promise(r=>setTimeout(r,2200));const s=getComputedStyle(document.getElementById('scene-${next}'));return s.visibility==='visible'&&+s.opacity>0.99})()`)
  if (vis) {
    await evaljs(`(async()=>{await new Promise(r=>setTimeout(r,3200));return 1})()`)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`._all_mobile_scene${next}.png`, Buffer.from(shot.data, 'base64'))
    console.log(`saved scene${next} @ ${fr.toFixed(3)}`)
    next++
  }
}
chrome.kill()
process.exit(0)
