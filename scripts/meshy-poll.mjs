#!/usr/bin/env node
/**
 * Poll a Meshy task to completion and report what actually came back.
 *
 * By default this downloads nothing — a task reaching SUCCEEDED is not
 * curatorial acceptance. Pass --download to fetch the GLB and preview render
 * once the result has been reviewed against the asset's criteria.
 *
 * Usage:
 *   node scripts/meshy-poll.mjs <taskId> [--spec <spec.json>] [--endpoint <path>]
 *   node scripts/meshy-poll.mjs <taskId> --download
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { resolveApiKey, pollTask, download, ensureDir } from './meshy-lib.mjs'

const argv = process.argv.slice(2)
const positional = argv.filter((a) => !a.startsWith('--'))
const taskId = positional[0]
if (!taskId) throw new Error('Usage: node scripts/meshy-poll.mjs <taskId> [--spec <spec.json>] [--download]')

const valueOf = (flagName) => {
  const i = argv.indexOf(flagName)
  return i >= 0 ? argv[i + 1] : undefined
}
const specPath = valueOf('--spec')
const shouldDownload = argv.includes('--download')

let endpoint = valueOf('--endpoint')
let spec
if (specPath) {
  spec = JSON.parse(await fsp.readFile(specPath, 'utf8'))
  endpoint = endpoint || spec.endpoint
}
endpoint = endpoint || '/openapi/v2/text-to-3d'

const { key } = resolveApiKey()

let lastLine = ''
const task = await pollTask({
  endpoint,
  taskId,
  key,
  onTick: (t) => {
    const line = `  ${t.status} ${t.progress ?? 0}%`
    if (line !== lastLine) {
      console.log(line)
      lastLine = line
    }
  },
})

console.log(`\nFinal status: ${task.status}`)
if (task.status !== 'SUCCEEDED') {
  console.log(`Error: ${task.task_error?.message || '(none reported)'}`)
  if (task.task_error) console.log(JSON.stringify(task.task_error, null, 2))
  process.exit(1)
}

const urls = task.model_urls || {}
console.log('\nArtifacts reported by the API:')
for (const [format, url] of Object.entries(urls)) {
  console.log(`  ${format.padEnd(6)} ${String(url).split('?')[0]}`)
}
if (task.thumbnail_url) console.log(`  thumb  ${task.thumbnail_url.split('?')[0]}`)
if (task.texture_urls) console.log(`  textures: ${JSON.stringify(task.texture_urls).slice(0, 300)}`)
console.log(`\nCredits consumed: ${task.consumed_credits ?? 'not reported'}`)

const summary = {
  taskId,
  endpoint,
  status: task.status,
  finishedAt: new Date().toISOString(),
  formats: Object.keys(urls),
  thumbnail: task.thumbnail_url ? task.thumbnail_url.split('?')[0] : null,
  consumedCredits: task.consumed_credits ?? null,
  note: shouldDownload ? 'downloaded' : 'not downloaded — pending visual review',
}
await ensureDir('artifacts/meshy')
const receiptLine = path.join('artifacts/meshy', `${taskId}.result.json`)
await fsp.writeFile(receiptLine, `${JSON.stringify(summary, null, 2)}\n`)
console.log(`Receipt: ${receiptLine}`)

if (!shouldDownload) {
  console.log('\nNothing downloaded. Review the preview first, then re-run with --download.')
  process.exit(0)
}

const slug = spec?.id || taskId
const glbPath = path.join('public/models', `${slug}.glb`)
const thumbExt = (task.thumbnail_url || '').split('?')[0].split('.').pop() || 'png'
const thumbPath = path.join('artifacts/meshy', `${slug}-preview.${thumbExt}`)

if (urls.glb) {
  const bytes = await download(urls.glb, glbPath)
  console.log(`Downloaded GLB: ${glbPath} (${bytes} bytes)`)
} else {
  console.log('No GLB in this response — nothing to download.')
}
if (task.thumbnail_url) {
  const bytes = await download(task.thumbnail_url, thumbPath)
  console.log(`Downloaded preview: ${thumbPath} (${bytes} bytes)`)
}

console.log('\nDownloaded assets are NOT integrated. Register provenance, then wire into the room and verify in the running app.')
