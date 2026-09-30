#!/usr/bin/env node
/**
 * Report a GLB's true orientation, straight from the file.
 *
 * `fitProp` measures the world bounding box and fits scale and position. It never
 * looked at ORIENTATION, and that omission is not theoretical: the timber panel
 * rendered as a 15x93 px sliver where it should have been ~113x213, because the
 * mesh arrived edge-on and tipped while the lantern and cabinet happened to
 * arrive facing the camera. Fitting scale to a mesh pointing the wrong way just
 * gives you a correctly-sized mistake.
 *
 * POSITION accessors carry min/max, so the geometry's own extents are readable
 * without a renderer or a guess. Node rotations and scales are read from the
 * glTF node hierarchy for the same reason: if the file tips the mesh, that is a
 * fact in the JSON, not something to discover by rendering it repeatedly.
 *
 * Usage: node scripts/inspect-glb-orientation.mjs public/models/*.glb
 */
import fs from 'node:fs'
import path from 'node:path'

function readGlb(file) {
  const buffer = fs.readFileSync(file)
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB`)
  const total = buffer.readUInt32LE(8)
  let offset = 12
  let json = null
  while (offset < total) {
    const length = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    const body = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'))
    offset += 8 + length + ((4 - (length % 4)) % 4)
  }
  return json
}

function labelled(extent, axes) {
  // Which axis is widest, tallest, thinnest — the shape's identity.
  const order = axes.map((axis, index) => ({ axis, size: extent[index] })).sort((a, b) => b.size - a.size)
  return order.map((entry, rank) => `${rank === 0 ? 'largest' : rank === 1 ? 'middle' : 'smallest'}=${entry.axis}(${entry.size.toFixed(2)})`).join('  ')
}

for (const file of process.argv.slice(2)) {
  const json = readGlb(file)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = json.accessors?.[primitive.attributes?.POSITION]
      if (!accessor?.min || !accessor?.max) continue
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], accessor.min[axis])
        max[axis] = Math.max(max[axis], accessor.max[axis])
      }
    }
  }

  const extent = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  console.log(`\n${path.basename(file)}`)
  console.log(`  geometry extents   x=${extent[0].toFixed(3)}  y=${extent[1].toFixed(3)}  z=${extent[2].toFixed(3)}`)
  console.log(`  shape              ${labelled(extent, ['x', 'y', 'z'])}`)

  const rotations = []
  json.nodes?.forEach((node, index) => {
    if (node.rotation || node.scale) {
      rotations.push(
        `  node[${index}] "${node.name ?? ''}" rotation=[${(node.rotation ?? [0, 0, 0, 1]).map((v) => v.toFixed(3)).join(', ')}] scale=[${(node.scale ?? [1, 1, 1]).map((v) => v.toFixed(3)).join(', ')}]`,
      )
    }
  })
  console.log(rotations.length ? `  node transforms:\n${rotations.join('\n')}` : '  node transforms:    none (identity)')

  // The actionable judgement for a mesh that must stand upright and face +z.
  //
  // Extents alone cannot decide orientation in general, and two earlier versions of
  // this check got it wrong in opposite directions. It first called a three-bell frame
  // "NOT upright" because x was wider than y — but a frame is genuinely wider than it
  // is tall. It then called a wide shallow basin "LYING DOWN" because y was the
  // thinnest axis — but a bowl's height IS its smallest dimension. Both were false
  // alarms from assuming one shape archetype. So this classifies the shape and only
  // states what the geometry actually supports.
  const thinnest = extent.indexOf(Math.min(...extent))
  const thinnestAxis = ['x', 'y', 'z'][thinnest]
  const widest = extent.indexOf(Math.max(...extent))

  let verdict
  if (thinnest === 2) {
    verdict = 'depth along z — faces the camera, no rotation expected'
  } else if (thinnest === 1) {
    verdict =
      'height is the smallest dimension — NORMAL for wide, flat or low objects (tables, bowls, ' +
      'bases) and NOT evidence of a rotated mesh. Confirm in a render'
  } else {
    verdict = `thinnest axis is ${thinnestAxis}, which is not the view axis — confirm in a render`
  }

  console.log(`  verdict            ${verdict}`)
  console.log(
    `  proportions        ${['x', 'y', 'z'][widest]} is the widest axis` +
      `${widest === 0 ? ' (wide object — taller-than-wide is NOT expected here)' : ''}`,
  )
  console.log(
    `  guidance           extents can only disprove orientation, not confirm it; ` +
      'treat this as a hint and verify the fitted prop in a capture',
  )
}
