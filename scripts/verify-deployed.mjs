/**
 * One-shot CDP probe of the DEPLOYED site (no local server): launches
 * headless Chrome with a debugging port, watches the opening wipe complete,
 * then scrubs T1 and the wrap by setting scrollTop. Prints JSON verdicts.
 * Usage: node scripts/verify-deployed.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL_TO_TEST = process.argv[2] ?? 'https://iwc-cinematic-preview.vercel.app'
const PORT = 9333
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = mkdtempSync(path.join(tmpdir(), 'iwc-cdp-'))
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  '--window-size=1600,1000',
  'about:blank',
])

async function cdp() {
  // wait for the debugger endpoint
  let version
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json())
      break
    } catch {
      await sleep(250)
    }
  }
  if (!version) throw new Error('chrome debugger not reachable')
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL_TO_TEST)}`, { method: 'PUT' }).then((r) => r.json())
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id
      pending.set(mid, res)
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
  const evaljs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    return r?.result?.value
  }
  await send('Runtime.enable')
  return { evaljs }
}

const { evaljs } = await cdp()

const SNAP = `(() => {
  const rv = document.querySelector('#scene-1 .bg-reveal')
  const base = document.querySelector('#scene-1 .bg-base')
  const pre = document.getElementById('preloader')
  return {
    pre: pre ? getComputedStyle(pre).display : 'missing',
    base: base ? +(+getComputedStyle(base).opacity).toFixed(2) : null,
    wipe: rv ? getComputedStyle(rv).getPropertyValue('--wipe').trim() : null,
    o: rv ? +(+getComputedStyle(rv).opacity).toFixed(2) : null,
  }
})()`

// 1) watch the opening: black → base plate (1s) → wipe completing (3s)
const opening = []
let tPrev = Date.now()
for (let i = 0; i < 80; i++) {
  const s = await evaljs(SNAP)
  opening.push({ dt: Date.now() - tPrev, ...s })
  if (s && s.pre === 'none' && parseFloat(s.wipe) >= 139) break
  await sleep(350)
}
console.log('OPENING', JSON.stringify(opening.filter((s, i) => i % 2 === 0 || i === opening.length - 1)))

// 2) T1 phases (scroll-driven) + wrap landing
const t1 = await evaljs(`(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  const TOTAL = 25.59 // scroll units incl. T_SCALE-stretched transitions
  const D = document.body.scrollHeight - innerHeight
  const op = (sel) => { const el = document.querySelector(sel); return el ? +(+getComputedStyle(el).opacity).toFixed(2) : null }
  const mat = () => new DOMMatrix(getComputedStyle(document.querySelector('#scene-1 .scene__bg')).transform)
  const out = {}
  // T1 spans 1.0–2.8: zoom phase A ends ≈1.78, pan phase B after
  scrollTo(0, Math.round(D * 1.55 / TOTAL)); await sleep(3200)
  let m = mat()
  out.zoomPhase = { scale: +m.a.toFixed(3), yPx: Math.round(m.f), s2: op('#scene-2') }
  scrollTo(0, Math.round(D * 2.45 / TOTAL)); await sleep(3200)
  m = mat()
  out.panPhase = { scale: +m.a.toFixed(3), yPx: Math.round(m.f), s1: op('#scene-1'), s2: op('#scene-2') }
  scrollTo(0, D); await sleep(5500)
  const rv = document.querySelector('#scene-1 .bg-reveal')
  out.afterWrap = { y: Math.round(scrollY), s1: op('#scene-1'), reveal: op('#scene-1 .bg-reveal'), wipe: getComputedStyle(rv).getPropertyValue('--wipe').trim() }
  out.frameFullscreen = (() => { const r = document.getElementById('movie-frame').getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight })()
  out.chromeRemoved = !document.getElementById('scene-counter') && !document.getElementById('nav-dots')
  out.arrowCue = !!document.querySelector('.scroll-cue__arrow')
  return out
})()`)
console.log('T1_AND_WRAP', JSON.stringify(t1))

chrome.kill()
process.exit(0)
