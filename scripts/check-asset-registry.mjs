#!/usr/bin/env node
/**
 * Check that the generated-asset registry and the shipped models agree.
 *
 * The registry exists so that every generated artifact's lineage is checkable. That
 * guarantee is only as good as its completeness, and completeness was previously
 * maintained by remembering — which failed once already: five models shipped while
 * the registry listed two. This turns that invariant into a command.
 *
 * Exits non-zero on drift so it can gate a commit.
 *
 * Usage: node scripts/check-asset-registry.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const MODELS_DIR = 'public/models'
const REGISTRY = 'public/agent/assets.json'

const shipped = fs
  .readdirSync(MODELS_DIR)
  .filter((f) => f.endsWith('.glb'))
  .map((f) => f.replace(/\.glb$/, ''))
  .sort()

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'))
const registered = registry.assets.map((a) => a.id).sort()

const unregistered = shipped.filter((id) => !registered.includes(id))
const phantom = registered.filter((id) => !shipped.includes(id))

console.log(`shipped     ${shipped.length}  ${shipped.join(', ')}`)
console.log(`registered  ${registered.length}  ${registered.join(', ')}`)

if (unregistered.length) {
  console.log(`\nFAIL  shipped but NOT registered: ${unregistered.join(', ')}`)
  console.log('      A model in public/models with no registry entry has no checkable lineage.')
}
if (phantom.length) {
  console.log(`\nFAIL  registered but NOT shipped: ${phantom.join(', ')}`)
  console.log('      The registry claims an artifact that does not exist at its declared path.')
}

// Also verify each declared file actually exists, so a typo in `file` is caught.
const missingFiles = registry.assets
  .filter((a) => !fs.existsSync(a.file))
  .map((a) => `${a.id} -> ${a.file}`)
if (missingFiles.length) {
  console.log(`\nFAIL  registry entries point at missing files:\n      ${missingFiles.join('\n      ')}`)
}

if (unregistered.length || phantom.length || missingFiles.length) process.exit(1)

console.log('\nOK  registry and shipped models agree')
