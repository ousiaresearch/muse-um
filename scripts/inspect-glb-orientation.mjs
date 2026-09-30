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
  // "Upright" does NOT mean y is the tallest axis. A three-bell frame is genuinely
  // wider than it is tall (x 65534 vs y 31474), and an earlier version of this
  // check called that "NOT upright" — a false alarm that would have had me
  // rotating a correctly-oriented mesh. What actually matters is which axis is
  // DEPTH: a standing object can never have its height as the thinnest dimension.
  const thinnest = extent.indexOf(Math.min(...extent))
  const thinnestAxis = ['x', 'y', 'z'][thinnest]
  const upright = thinnest !== 1
  const facesForward = thinnest === 2
  const widest = extent.indexOf(Math.max(...extent))

  console.log(
    `  verdict            ${
      upright ? 'upright — y is not the depth axis' : 'LYING DOWN — y is the thinnest axis, needs a rotation'
    }, ${
      facesForward
        ? 'faces +z (z is depth)'
        : `faces ±${thinnestAxis} (depth is ${thinnestAxis}) — needs a y-rotation to face +z`
    }`,
  )
  console.log(
    `  proportions        ${['x', 'y', 'z'][widest]} is the widest axis` +
      `${widest === 0 ? ' (wide object — taller-than-wide is NOT expected here)' : ''}`,
  )
  console.log(
    `  fitProp note       ${
      facesForward
        ? 'no rotation needed before fitting'
        : `rotate ${thinnest === 0 ? 'y=+90° or -90°' : 'none — check the mesh'} then fit`
    }`,
  )
}
