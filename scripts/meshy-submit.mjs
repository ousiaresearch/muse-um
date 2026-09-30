#!/usr/bin/env node
/**
 * Meshy submitter for curator-approved MUSE-UM assets.
 *
 * Two kinds of job, one client, one secret path, one dry-run gate:
 *
 *   1. text   — /openapi/v2/text-to-3d. Composes the asset's own text with the
 *               matching shared style suffix (form on `preview`, material on
 *               `refine`), and refuses to send an over-length payload.
 *   2. images — /openapi/v1/multi-image-to-3d. Conditions on 1-4 local images
 *               instead of prose. NOTE: this request has NO prompt field. The
 *               images are the entire style carrier, which is why the turnaround
 *               set has to be generated in the pavilion's own idiom.
 *               Conditionally supports the fused path: when `texture_image_files`
 *               are present AND `image_files` are present, both are sent so the
 *               same views drive both geometry and texture.
 *
 * Secret boundary: MESHY_API_KEY comes from the process environment or the
 * Hermes secrets file. It is never printed, logged, or written anywhere.
 *
 * Usage:
 *   node scripts/meshy-submit.mjs <spec.json> [--stage <name>] [--submit]
 *
 * Without --submit this is a dry run and makes no network request. The dry run
 * prints image COUNT and BYTE SIZES, never the base64 payload: dumping megabytes
 * of data URI into a terminal is its own defect.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { resolveApiKey, maskKey, meshyFetch, ensureDir } from './meshy-lib.mjs'

const STYLE_PATH = 'assets/meshy/style.json'
const MAX_IMAGES = 4
const ALLOWED_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg'])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const positional = argv.filter((a) => !a.startsWith('--'))
const specPath = positional[0] || 'assets/meshy/observatory-armillary.json'
const valueOf = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const shouldSubmit = flags.has('--submit')

const spec = JSON.parse(await fsp.readFile(specPath, 'utf8'))
const kind = spec.kind || 'text'

if (!spec.endpoint?.startsWith('/openapi/')) throw new Error('Spec is missing a valid Meshy endpoint.')

/** Local image paths -> data URIs, with the guards that matter. */
async function toDataUris(files, label) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(`${label} must be a non-empty array of local image paths.`)
  }
  if (files.length > MAX_IMAGES) {
    throw new Error(`${label} has ${files.length} images; the API accepts at most ${MAX_IMAGES}.`)
  }

  const uris = []
  const report = []
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (!ALLOWED_IMAGE_EXT.has(ext)) {
      throw new Error(`${file}: unsupported image type "${ext}". Meshy accepts .png/.jpg/.jpeg.`)
    }
    let bytes
    try {
      bytes = await fsp.readFile(file)
    } catch {
      throw new Error(`${file}: not found. Generate the turnaround set before submitting.`)
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new Error(
        `${file}: ${(bytes.length / 1048576).toFixed(1)} MB exceeds the ${MAX_IMAGE_BYTES / 1048576} MB guard. ` +
          'Run scripts/prepare-multi-images.py to normalise the set first.',
      )
    }
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    uris.push(`data:${mime};base64,${bytes.toString('base64')}`)
    report.push({ file, bytes: bytes.length })
  }
  return { uris, report }
}

// Fields the Meshy API actually accepts. A spec may carry narrative metadata —
// view selection, curation notes, why an angle was dropped — and none of that
// belongs in a request body. Silently shipping it is worse than failing: the
// first time this happened, a "viewSelection" note went out as a request field
// and the API happened to ignore it. It will not always happen to ignore it.
// Unknown fields therefore throw, so adding spec metadata is a deliberate act of
// choosing a name that is not an API field, and typos in real fields surface
// immediately instead of being sent as junk.
const API_FIELDS = new Set([
  // shared / multi-image
  'image_urls', 'input_task_id', 'name', 'ai_model',
  'topology', 'target_polycount', 'should_remesh',
  'should_texture', 'enable_pbr', 'remove_lighting',
  'image_enhancement', 'moderation',
  'texture_prompt', 'texture_image_url', 'texture_image_urls',
  // text-to-3D
  'prompt', 'negative_prompt', 'art_style', 'mode', 'preview_task_id',
  'texture_richness', 'seed', 'symmetry', 'pose_mode', 'auto_size',
  'origin_at', 'alpha_thumbnail', 'save_pre_remeshed_model',
])

function assertApiFields(payload) {
  const unknown = Object.keys(payload).filter((key) => !API_FIELDS.has(key))
  if (!unknown.length) return
  throw new Error(
    `Spec field(s) not accepted by the Meshy API: ${unknown.join(', ')}.\n` +
      'Either move them out of the stage into the spec root (metadata, not request), ' +
      'or add them to API_FIELDS in this script if they are genuinely request fields.',
  )
}

async function buildImagesPayload(stage) {
  const { uris: geometryUris, report: geometryReport } = await toDataUris(stage.image_files, 'stage.image_files')
  const payload = { ...stage }
  delete payload.image_files
  delete payload.__comment
  payload.image_urls = geometryUris

  // Fused path: when the stage declares separate texture inputs, send them as
  // the texture_image_urls so the same views drive both geometry and texture.
  // Fall back to geometry inputs as the texture source when no separate texture
  // set is declared.
  if (stage.texture_image_files && stage.texture_image_files.length) {
    const texture = await toDataUris(stage.texture_image_files, 'stage.texture_image_files')
    payload.texture_image_urls = texture.uris
    delete payload.texture_image_files
    report.push(...texture.report.map((r) => ({ ...r, role: 'texture' })))
  } else {
    payload.texture_image_urls = geometryUris
  }

  assertApiFields(payload)
  return { payload, report: geometryReport }
}

let payload
let plan

if (kind === 'images') {
  const stage = spec.stages?.[valueOf('--stage') || 'build']
  if (!stage) {
    throw new Error(`Spec has no stage "${valueOf('--stage') || 'build'}". Available: ${Object.keys(spec.stages || {}).join(', ')}`)
  }
  const built = await buildImagesPayload(stage)
  payload = built.payload
  plan = {
    mode: shouldSubmit ? 'SUBMIT (spends credits)' : 'dry run (no request made)',
    kind: 'images',
    asset: spec.asset,
    assetId: spec.id,
    endpoint: `https://api.meshy.ai${spec.endpoint}`,
    images: built.report,
    totalImageBytes: built.report.reduce((sum, r) => sum + r.bytes, 0),
    payloadWithoutImages: {
      ...payload,
      image_urls: `[${payload.image_urls.length} data URIs omitted]`,
      ...(payload.texture_image_urls
        ? { texture_image_urls: `[${payload.texture_image_urls.length} data URIs omitted]` }
        : {}),
    },
    curation: spec.curation,
  }
} else {
  const style = JSON.parse(await fsp.readFile(STYLE_PATH, 'utf8'))
  const stageName = valueOf('--stage') || 'preview'
  const stage = spec.stages?.[stageName]
  if (!stage) {
    throw new Error(`Spec has no "${stageName}" stage. Available: ${Object.keys(spec.stages || {}).join(', ') || 'none'}`)
  }
  const stageStyle = style.stages?.[stageName]
  if (!stageStyle) throw new Error(`Stylesheet has no rule for stage "${stageName}".`)

  payload = { ...stage }
  delete payload.__comment

  const ownText = payload[stageStyle.uses]
  if (!ownText) throw new Error(`Stage "${stageName}" is missing its "${stageStyle.uses}" field.`)
  payload[stageStyle.uses] = `${ownText.trim()} ${style[stageStyle.suffix] || ''}`.trim()

  if (stageStyle.sends_negative_prompt) {
    payload.negative_prompt = [stage.negative_prompt, style.sharedNegativePrompt].filter(Boolean).join(', ')
  } else {
    delete payload.negative_prompt
  }

  assertApiFields(payload)

  const limitKey = stageName === 'refine' ? 'texture_prompt_max_chars' : 'prompt_max_chars'
  const limit = style.limits?.[limitKey] ?? 800
  const composed = payload[stageStyle.uses]
  if (composed.length > limit) {
    throw new Error(
      `Composed ${stageStyle.uses} is ${composed.length} chars, over the ${limit} limit. ` +
        `Shorten it in ${specPath} or the ${stageStyle.suffix} in ${STYLE_PATH}.`,
    )
  }

  if (stageName === 'refine' && !payload.preview_task_id) {
    throw new Error('A refine stage requires preview_task_id.')
  }

  plan = {
    mode: shouldSubmit ? 'SUBMIT (spends credits)' : 'dry run (no request made)',
    kind: 'text',
    asset: spec.asset,
    assetId: spec.id,
    room: spec.room,
    stage: stageName,
    endpoint: `https://api.meshy.ai${spec.endpoint}`,
    composedChars: { [stageStyle.uses]: composed.length, negative_prompt: payload.negative_prompt?.length ?? null },
    payload,
    curation: spec.curation,
  }
}

if (!shouldSubmit) {
  console.log(JSON.stringify(plan, null, 2))
  console.log('\nDry run only. Add --submit to create the task.')
  process.exit(0)
}

const { key, origin } = resolveApiKey()
console.log(`Key: ${maskKey(key)} — from ${origin}`)
console.log(`Submitting: ${spec.asset} [${kind}]`)

const { payload: created } = await meshyFetch(spec.endpoint, { method: 'POST', body: payload, key })
const taskId = created.result || created.id
if (!taskId) throw new Error(`Meshy returned no task id: ${JSON.stringify(created).slice(0, 200)}`)

const receipt = {
  asset: spec.asset,
  assetId: spec.id,
  room: spec.room,
  kind,
  endpoint: spec.endpoint,
  taskId,
  submittedAt: new Date().toISOString(),
  sourceImages: plan.images ?? null,
  request: kind === 'text' ? payload : plan.payloadWithoutImages,
  curation: spec.curation,
  observed: { status: created.status ?? null, progress: created.progress ?? null },
}

await ensureDir('artifacts/meshy')
const receiptPath = path.join('artifacts/meshy', `${spec.id}-${kind}-${taskId}.json`)
await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)

console.log(`Task created: ${taskId}`)
console.log(`Receipt:      ${receiptPath}`)
console.log(`Next:         node scripts/meshy-poll.mjs ${taskId} --spec ${specPath}`)
