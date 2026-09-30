#!/usr/bin/env node
/**
 * Meshy submitter for curator-approved MUSE-UM assets.
 *
 * Composes each asset's own text with the matching shared stylesheet suffix, so
 * every generated prop inherits one coherent MUSE-UM language: the form suffix
 * on `preview`, the material suffix on `refine`.
 *
 * Secret boundary: MESHY_API_KEY comes from the process environment or the
 * Hermes secrets file. It is never printed, logged, or written anywhere.
 *
 * Usage:
 *   node scripts/meshy-submit.mjs <spec.json> [--stage preview|refine] [--submit]
 *
 * Without --submit this is a dry run and makes no network request.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { resolveApiKey, maskKey, hermesEnvPath, meshyFetch, ensureDir } from './meshy-lib.mjs'

const STYLE_PATH = 'assets/meshy/style.json'

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const positional = argv.filter((a) => !a.startsWith('--'))
const specPath = positional[0] || 'assets/meshy/observatory-armillary.json'
const valueOf = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const stageName = valueOf('--stage') || 'preview'
const shouldSubmit = flags.has('--submit')

const spec = JSON.parse(await fsp.readFile(specPath, 'utf8'))
const style = JSON.parse(await fsp.readFile(STYLE_PATH, 'utf8'))

if (!spec.endpoint?.startsWith('/openapi/')) throw new Error('Spec is missing a valid Meshy endpoint.')
const stage = spec.stages?.[stageName]
if (!stage) {
  throw new Error(
    `Spec has no "${stageName}" stage. Available: ${Object.keys(spec.stages || {}).join(', ') || 'none'}`,
  )
}

const stageStyle = style.stages?.[stageName]
if (!stageStyle) throw new Error(`Stylesheet has no rule for stage "${stageName}".`)

// --- compose: the asset's own text + the shared suffix for this stage ---
const payload = { ...stage }
delete payload.__comment

const ownText = payload[stageStyle.uses]
if (!ownText) throw new Error(`Stage "${stageName}" is missing its "${stageStyle.uses}" field.`)

const suffix = style[stageStyle.suffix] || ''
payload[stageStyle.uses] = `${ownText.trim()} ${suffix}`.trim()

if (stageStyle.sends_negative_prompt) {
  payload.negative_prompt = [stage.negative_prompt, style.sharedNegativePrompt]
    .filter(Boolean)
    .join(', ')
} else {
  delete payload.negative_prompt
}

// --- hard guard: an over-length prompt is a rejected request, not a style choice ---
const limitKey = stageName === 'refine' ? 'texture_prompt_max_chars' : 'prompt_max_chars'
const limit = style.limits?.[limitKey] ?? 800
const composed = payload[stageStyle.uses]
if (composed.length > limit) {
  throw new Error(
    `Composed ${stageStyle.uses} is ${composed.length} chars, over the ${limit} limit. ` +
      `Shorten it in ${specPath} or the ${stageStyle.suffix} in ${STYLE_PATH}.`,
  )
}
if (payload.negative_prompt && payload.negative_prompt.length > 800) {
  throw new Error(`Composed negative_prompt is ${payload.negative_prompt.length} chars, over the 800 limit.`)
}

if (stageName === 'refine') {
  if (!payload.preview_task_id) throw new Error('A refine stage requires preview_task_id.')
  payload.preview_task_id = spec.stages.refine.preview_task_id
}

const plan = {
  mode: shouldSubmit ? 'SUBMIT (spends credits)' : 'dry run (no request made)',
  asset: spec.asset,
  assetId: spec.id,
  room: spec.room,
  stage: stageName,
  endpoint: `https://api.meshy.ai${spec.endpoint}`,
  composedChars: {
    [stageStyle.uses]: composed.length,
    negative_prompt: payload.negative_prompt?.length ?? null,
  },
  payload,
  curation: spec.curation,
}

if (!shouldSubmit) {
  console.log(JSON.stringify(plan, null, 2))
  console.log('\nDry run only. Add --submit to create the task.')
  process.exit(0)
}

const { key, origin } = resolveApiKey()
console.log(`Key: ${maskKey(key)} — from ${origin}`)
console.log(`Submitting: ${spec.asset} [${stageName}]`)

const { payload: created } = await meshyFetch(spec.endpoint, { method: 'POST', body: payload, key })
const taskId = created.result || created.id
if (!taskId) throw new Error(`Meshy returned no task id: ${JSON.stringify(created).slice(0, 200)}`)

const receipt = {
  asset: spec.asset,
  assetId: spec.id,
  room: spec.room,
  stage: stageName,
  endpoint: spec.endpoint,
  taskId,
  submittedAt: new Date().toISOString(),
  styleRef: `${STYLE_PATH} v${style.version}`,
  request: payload,
  curation: spec.curation,
  observed: { status: created.status ?? null, progress: created.progress ?? null },
}

await ensureDir('artifacts/meshy')
const receiptPath = path.join('artifacts/meshy', `${spec.id}-${stageName}-${taskId}.json`)
await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)

console.log(`Task created: ${taskId}`)
console.log(`Receipt:      ${receiptPath}`)
console.log(`Next:         node scripts/meshy-poll.mjs ${taskId} --spec ${specPath}`)
