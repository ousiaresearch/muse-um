#!/usr/bin/env node
/**
 * Build one kit module's image set — everything mechanical up to, but not
 * including, the paid reconstruction.
 *
 * The paid gate is deliberate. This script stops at a reviewed-ready set of
 * views and prints the exact command to spend credits, because the one thing
 * that must not be automated away is looking at the sheet before paying for a
 * mesh. Every defect in the lantern's history — open glazing, a magenta-baked
 * material, a sheet sliced mid-write — was caught by a human-readable check
 * between these steps, and each of those checks is now enforced here.
 *
 * Usage:
 *   node scripts/module-prep.mjs \
 *     --brief assets/meshy/briefs/timber-panel-turnaround.txt \
 *     --anchor public/art/fossil-wall.png \
 *     --sheet assets/meshy/turnarounds/timber-panel-sheet.png \
 *     --views assets/meshy/turnarounds/timber-panel \
 *     [--expect 2] [--reuse] [--model gpt-5.6-sol]
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

function valueOf(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}
const has = (flag) => process.argv.includes(flag)

const brief = valueOf('--brief')
const anchor = valueOf('--anchor')
const sheet = valueOf('--sheet')
const views = valueOf('--views')
const expect = Number(valueOf('--expect') || 2)
const model = valueOf('--model') || 'gpt-5.6-sol'
const reuse = has('--reuse')

if (!brief || !anchor || !sheet || !views) {
  console.error('Need --brief --anchor --sheet --views (see the header for the full shape).')
  process.exit(2)
}
if (!fs.existsSync(path.resolve(ROOT, brief))) throw new Error(`No brief at ${brief}`)
if (!fs.existsSync(path.resolve(ROOT, anchor))) throw new Error(`No anchor image at ${anchor}`)

const step = (n, text) => console.log(`\n[${n}] ${text}`)

// 1 ─ Generate, unless the sheet is already present and --reuse was passed.
step(1, `turnaround sheet${reuse ? ' (reusing the existing sheet)' : ''}`)
if (!reuse) {
  if (fs.existsSync(path.resolve(ROOT, sheet))) {
    console.log(`    a sheet already exists at ${sheet}; it will be overwritten`)
  }
  const artDir = path.resolve(ROOT, path.dirname(anchor))
  const outDir = path.resolve(ROOT, path.dirname(sheet))
  fs.mkdirSync(outDir, { recursive: true })

  const run = spawnSync(
    'codex',
    [
      'exec', '-m', model, '--skip-git-repo-check', '-s', 'workspace-write',
      '--add-dir', artDir, '--add-dir', outDir,
      '-i', path.resolve(ROOT, anchor), '-',
    ],
    { input: fs.readFileSync(path.resolve(ROOT, brief), 'utf8'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: ROOT },
  )
  if (run.status !== 0) {
    console.error(`    codex exited ${run.status}`)
    if (run.stderr) console.error(run.stderr.split('\n').slice(-12).join('\n'))
  }
}

if (!fs.existsSync(path.resolve(ROOT, sheet))) {
  throw new Error(`No sheet produced at ${sheet}. Nothing to slice — not proceeding.`)
}

// 2 ─ Wait for the file to stop moving. A generation process rewrites its output;
//     slicing a half-written image produces plausible slices of the wrong picture,
//     which is how the lantern got sliced mid-write and came back pink.
step(2, 'waiting for the sheet to stop changing')
const STABLE_FOR_MS = 15_000
let lastSize = -1
let lastChange = Date.now()
for (;;) {
  const stat = fs.statSync(path.resolve(ROOT, sheet))
  if (stat.size !== lastSize) {
    lastSize = stat.size
    lastChange = Date.now()
  } else if (Date.now() - lastChange > STABLE_FOR_MS) {
    break
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
}
console.log(`    stable at ${lastSize} bytes`)

// 3 ─ Slice. The slicer keys magenta out, re-measures what it wrote, and refuses a
//     freshly-modified input — so its exit status is the real gate, not a formality.
step(3, `slicing into ${expect} views`)
const slice = spawnSync(
  'npx',
  ['uv', 'run', '--python', '3.12', '--with', 'pillow', '--no-project', 'python',
   'scripts/slice-turnaround.py', sheet, views, '--expect', String(expect)],
  { encoding: 'utf8', cwd: ROOT, env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } },
)
const sliceOut = `${slice.stdout || ''}${slice.stderr || ''}`
console.log(sliceOut.trim().split('\n').map((l) => `    ${l}`).join('\n'))
if (slice.status !== 0) {
  throw new Error('Slicing failed or refused. Fix the sheet before spending credits.')
}

// 4 ─ Report what is ready, and the price of the next step.
step(4, 'ready for review')
const files = fs.readdirSync(path.resolve(ROOT, views)).sort()
for (const file of files) {
  const full = path.resolve(ROOT, views, file)
  const stat = fs.statSync(full)
  console.log(`    ${file}  ${(stat.size / 1024).toFixed(0)} KB  ${full}`)
}
console.log(
  `\n  REVIEW THE SHEET AND THE VIEWS BEFORE SUBMITTING.\n` +
  `  A view set that passes every automated check can still reconstruct badly —\n` +
  `  open glazing and baked key colour both did.\n\n` +
  `  Sheet: ${path.resolve(ROOT, sheet)}\n` +
  `  Views: ${path.resolve(ROOT, views)}\n\n` +
  `  Then point the module spec's image_files at those views, dry-run, and submit:\n` +
  `    node scripts/meshy-submit.mjs assets/meshy/<module>.json\n` +
  `    node scripts/meshy-submit.mjs assets/meshy/<module>.json --submit\n`,
)
