/**
 * Capture a MUSE-UM room through the DevTools protocol.
 *
 * Why not `--screenshot --virtual-time-budget`: virtual time only advances as
 * tasks complete, and a WebGL app renders a frame every requestAnimationFrame.
 * Frame cost therefore multiplies into wall-clock time. With a selection pass
 * doubling the scene render under SwiftShader that turned a 1.2s budget into
 * minutes with no file produced — the page was not hung, it was grinding.
 *
 * So wait for the app to say it is ready instead:
 *
 *   1. launch Chrome with a debugging port
 *   2. wait for window.__museReady, which the app sets after the model has loaded
 *      and a few frames have actually rendered
 *   3. capture once, through Page.captureScreenshot
 *   4. report any window errors the app recorded on the way
 *
 * Usage:
 *   node scripts/capture-cdp.mjs <room> <output.png> [query flags...]
 *
 * Query flags are passed straight through, e.g. --variant=woodcut --post=0.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const CHROME = process.env.CHROME_BIN
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = process.env.MUSEUM_URL || 'http://127.0.0.1:5173/muse-um/'
const PORT = Number(process.env.CDP_PORT || 9333)

const [room, output, ...rest] = process.argv.slice(2)
if (!room || !output) {
  console.error('usage: node scripts/capture-cdp.mjs <room> <output.png> [--flag=value ...]')
  process.exit(2)
}

const wanted = new Set(rest.map((arg) => arg.replace(/^--/, '')))
const has = (prefix) => [...wanted].some((flag) => flag.startsWith(prefix))
const query = ['still=1', 'post=1']
if (!has('still')) query.push(...[...wanted].filter((f) => f.startsWith('still=')))
if (!has('post')) query.push(...[...wanted].filter((f) => f.startsWith('post=')))
query.push(...[...wanted].filter((f) => !f.startsWith('still=') && !f.startsWith('post=')))

const url = `${BASE_URL}?room=${room}&${query.join('&')}`
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-capture-'))

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--window-size=1440,900',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  url,
], { stdio: ['ignore', 'ignore', 'pipe'] })

let chromeErr = ''
chrome.stderr.on('data', (chunk) => { chromeErr += chunk.toString() })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function findTarget() {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await response.json()
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch {
      // port not open yet
    }
    await sleep(250)
  }
  throw new Error('Chrome never exposed a debuggable page target')
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    // CDP events (Runtime.consoleAPICalled and friends) arrive on the same socket
    // as replies. Without dispatch they were parsed and dropped, which is why the
    // harness could not see the scene's own logging.
    const listeners = new Map()

    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          id += 1
          const messageId = id
          return new Promise((res, rej) => {
            pending.set(messageId, { res, rej })
            socket.send(JSON.stringify({ id: messageId, method, params }))
          })
        },
        on(method, handler) {
          if (!listeners.has(method)) listeners.set(method, [])
          listeners.get(method).push(handler)
        },
        close: () => socket.close(),
      })
    })
    socket.addEventListener('error', reject)
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) rej(new Error(message.error.message))
        else res(message.result)
        return
      }
      if (message.method) {
        for (const handler of listeners.get(message.method) ?? []) handler(message.params)
      }
    })
  })
}

const cleanup = async () => {
  chrome.kill('SIGKILL')
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}

let exitCode = 0
try {
  const target = await findTarget()
  const client = await connect(target.webSocketDebuggerUrl)

  // Collect console output. The scene logs each generated prop's measured fit in
  // DEV, and that line is the only hard evidence a prop actually loaded and was
  // scaled — a screenshot cannot distinguish "the table is missing" from "the
  // table is behind the framed painting", because the unlit painting dominates
  // the frame.
  const consoleLines = []
  client.on('Runtime.consoleAPICalled', (params) => {
    const text = (params.args ?? [])
      .map((a) => a.value ?? a.description ?? '')
      .join(' ')
    consoleLines.push(`[${params.type}] ${text}`)
  })
  client.on('Runtime.exceptionThrown', (params) => {
    consoleLines.push(`[exception] ${params.exceptionDetails?.text ?? ''} ${params.exceptionDetails?.exception?.description ?? ''}`)
  })

  // Enable first, then reload: the app logs its prop fits during load, and those
  // messages are not replayed to a listener that attaches afterwards.
  await client.send('Runtime.enable')
  await client.send('Page.enable')
  await client.send('Page.reload', { ignoreCache: false })

  const evaluate = async (expression) => {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    })
    return result?.result?.value
  }

  // Wait for the app's own readiness signal rather than for a timer.
  const deadline = Date.now() + 240000
  let ready = false
  while (Date.now() < deadline) {
    ready = await evaluate('window.__museReady === true')
    if (ready) break
    await sleep(500)
  }

  const diagnostics = (await evaluate('JSON.stringify(window.__museDiagnostics || {})')) || '{}'
  if (!ready) {
    console.error('the room never reported ready')
    exitCode = 1
  }

  // Capture the WebGL canvas only, and measure the label that sits on top of it.
  // The full page includes sidebars and captions, and a reviewer reading the page
  // tends to describe those — including the unlit framed painting — as if they were
  // objects in the room. Cropping to the canvas removes that ambiguity at the source.
  let clip
  const rectJson = await evaluate(
    '(() => { const c = document.querySelector("canvas"); if (!c) return null;' +
      ' const r = c.getBoundingClientRect();' +
      ' return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }); })()',
  )
  if (rectJson) {
    const rect = JSON.parse(rectJson)
    if (rect.width > 0 && rect.height > 0) {
      clip = { ...rect, scale: 1 }
      console.log(`canvas:   ${rect.width}x${rect.height} at ${rect.x},${rect.y} (capturing canvas only)`)
    }
  }

  // Measure the wall-label's covered zone, and optionally hide it. The label is an
  // absolutely-positioned panel anchored bottom-left at max-width 62%, so it sits
  // ON TOP of the canvas and hides whatever is behind it — floor-level furniture on
  // the left disappears under it. That is an occlusion to place against, not a
  // rendering bug, and it cannot be judged from a screenshot without measuring it.
  const labelRectJson = await evaluate(
    '(() => { const el = document.querySelector(".scene-label"); if (!el) return null;' +
      ' const r = el.getBoundingClientRect(); const c = document.querySelector("canvas").getBoundingClientRect();' +
      ' return JSON.stringify({ x: Math.round(r.x - c.x), y: Math.round(r.y - c.y), width: Math.round(r.width), height: Math.round(r.height) }); })()',
  )
  if (labelRectJson) {
    const r = JSON.parse(labelRectJson)
    const canvasW = clip ? clip.width : 720
    const canvasH = clip ? clip.height : 720
    console.log(
      `label:    covers ${r.width}x${r.height} at ${r.x},${r.y} of the canvas → ` +
        `left ${((r.width / canvasW) * 100).toFixed(0)}% of width, bottom ${((r.height / canvasH) * 100).toFixed(0)}% of height`,
    )
    if (process.env.MUSE_CLEAN === '1') {
      await evaluate('(() => { const el = document.querySelector(".scene-label"); if (el) el.style.display = "none"; return true; })()')
      console.log('label:    hidden for this capture (MUSE_CLEAN=1)')
    }
  }

  // One more frame so the compositor has something to hand over.
  await evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))')

  const shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    ...(clip ? { clip } : {}),
  })
  await fs.writeFile(output, Buffer.from(shot.data, 'base64'))
  const stats = await fs.stat(output)

  console.log(`captured ${room} -> ${output} (${stats.size} bytes)`)
  console.log(`query:    ${query.join('&')}`)
  console.log(`ready:    ${ready}`)
  console.log(`browser:  ${diagnostics}`)
  const kitLines = consoleLines.filter((l) => /\[kit\]|exception|error/i.test(l))
  if (kitLines.length) {
    console.log(`page log (${kitLines.length} line(s) matching kit/errors):`)
    for (const line of kitLines) console.log(`  ${line}`)
  } else {
    console.log('page log: no kit or error lines captured')
  }
  if (stats.size < 60000) {
    console.log('warning: the file is small for a 1440x900 frame — the scene may be blank')
  }
  client.close()
} catch (error) {
  console.error(`capture failed: ${error.message}`)
  if (chromeErr) console.error(chromeErr.split('\n').slice(-4).join('\n'))
  exitCode = 1
} finally {
  await cleanup()
  process.exit(exitCode)
}
