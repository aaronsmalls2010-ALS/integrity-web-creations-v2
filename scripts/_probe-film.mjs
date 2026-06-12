/** Verifies FILM MODE on the live site: desktop scrub state + overlays,
 *  and mobile living-scene playback. */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'https://www.integritywebcreations.com/'
const PORT = 9381
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(path.join(tmpdir(), 'iwc-cdp-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--autoplay-policy=no-user-gesture-required',
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

async function bootWait() {
  await sleep(2500)
  for (let i = 0; i < 60; i++) {
    const pre = await evaljs(`(()=>{const p=document.getElementById('preloader');return p?getComputedStyle(p).display:'none'})()`)
    if (pre === 'none') break
    await sleep(900)
  }
  await sleep(11000) // film intro 0->8s (or image intro on mobile)
}
async function shoot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`._film_${name}.png`, Buffer.from(shot.data, 'base64'))
  console.log(`saved ._film_${name}.png`)
}

// ── DESKTOP ──
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: URL_TO_TEST })
await bootWait()
console.log('desktop state:', await evaljs(`(()=>{const v=document.getElementById('film');return JSON.stringify({filmMode:document.documentElement.classList.contains('film-mode'),display:v?getComputedStyle(v).display:'none',t:v?+v.currentTime.toFixed(2):null,ready:v?.readyState})})()`))
await shoot('desktop_landing')
// walk forward in steps so the smoother tracks (big jumps fight it)
for (const fr of [0.05, 0.09, 0.13]) {
  await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${fr}));await new Promise(r=>setTimeout(r,2600));return 1})()`)
}
console.log('at scene2:', await evaljs(`(()=>{const v=document.getElementById('film');const s=getComputedStyle(document.getElementById('scene-2'));return JSON.stringify({t:+v.currentTime.toFixed(2),scene2:s.visibility+' '+(+s.opacity).toFixed(2)})})()`))
await evaljs(`(async()=>{await new Promise(r=>setTimeout(r,3000));return 1})()`)
await shoot('desktop_scene2')
for (const fr of [0.2, 0.3, 0.4, 0.55]) {
  await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${fr}));await new Promise(r=>setTimeout(r,2600));return 1})()`)
}
console.log('at ~scene5/6:', await evaljs(`(()=>{const v=document.getElementById('film');return JSON.stringify({t:+v.currentTime.toFixed(2)})})()`))
await evaljs(`(async()=>{await new Promise(r=>setTimeout(r,3000));return 1})()`)
await shoot('desktop_mid')

// ── MOBILE ──
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: URL_TO_TEST })
await bootWait()
console.log('mobile state:', await evaljs(`(()=>{const v=document.getElementById('film');return JSON.stringify({filmMode:document.documentElement.classList.contains('film-mode'),filmSrc:!!(v&&v.src)})})()`))
for (const fr of [0.05, 0.09, 0.12]) {
  await evaljs(`(async()=>{const D=document.body.scrollHeight-innerHeight;scrollTo(0,Math.round(D*${fr}));await new Promise(r=>setTimeout(r,2600));return 1})()`)
}
await evaljs(`(async()=>{await new Promise(r=>setTimeout(r,4500));return 1})()`)
console.log('mobile scene2 video:', await evaljs(`(()=>{const v=document.querySelector('#scene-2 .scene-video');return JSON.stringify({display:getComputedStyle(v).display,t:+v.currentTime.toFixed(2),paused:v.paused,ended:v.ended})})()`))
await shoot('mobile_scene2')

chrome.kill()
process.exit(0)
