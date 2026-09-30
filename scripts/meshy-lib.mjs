/**
 * Shared Meshy helpers: secret loading, request, polling.
 *
 * Secret boundary: MESHY_API_KEY is read from the process environment or from
 * the Hermes secrets file (~/.hermes/.env, or $HERMES_HOME/.env when a profile
 * is active). It is never printed, logged, or written by this module.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const API_ROOT = 'https://api.meshy.ai'

export function hermesEnvPath() {
  const home = process.env.HERMES_HOME
    ? process.env.HERMES_HOME
    : path.join(os.homedir(), '.hermes')
  return path.join(home, '.env')
}

/** Parse a dotenv-style file. Values are returned, never logged. */
export function parseEnvFile(file) {
  const out = {}
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return out
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[m[1]] = value
  }
  return out
}

/** Resolve the Meshy key from env, then the Hermes secrets file. */
export function resolveApiKey() {
  if (process.env.MESHY_API_KEY) return { key: process.env.MESHY_API_KEY, origin: 'process environment' }
  const file = hermesEnvPath()
  const key = parseEnvFile(file).MESHY_API_KEY
  if (key) return { key, origin: `secrets file ${file}` }
  throw new Error(
    `MESHY_API_KEY not found. Set it in ${file} (Hermes secrets) or the process environment.`,
  )
}

export function maskKey(key) {
  if (!key || key.length < 8) return '<unusable>'
  return `${key.slice(0, 4)}…${key.slice(-4)} (len ${key.length})`
}

export async function meshyFetch(pathname, { method = 'GET', body, key } = {}) {
  const response = await fetch(`${API_ROOT}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.message || payload?.error || JSON.stringify(payload).slice(0, 200)
    throw new Error(`Meshy ${method} ${pathname} failed (${response.status}): ${detail}`)
  }
  return { payload, headers: response.headers }
}

export const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED'])

/** Poll a task to a terminal state. Returns the final task object. */
export async function pollTask({ endpoint, taskId, key, onTick, timeoutMs = 15 * 60 * 1000 }) {
  const started = Date.now()
  const pathname = `${endpoint}/${taskId}`
  for (;;) {
    const { payload, headers } = await meshyFetch(pathname, { key })
    if (onTick) onTick(payload)
    if (TERMINAL.has(payload.status)) return payload
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s (last status ${payload.status})`)
    }
    const retryAfter = Number(headers.get('retry-after'))
    const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 6
    await new Promise((r) => setTimeout(r, waitSeconds * 1000))
  }
}

export async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true })
}

/** Download a URL to a file path. Returns bytes written. */
export async function download(url, dest) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url.slice(0, 80)}…`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await ensureDir(path.dirname(dest))
  await fsp.writeFile(dest, buffer)
  return buffer.length
}
