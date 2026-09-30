#!/usr/bin/env node
/**
 * Write the module specs for the pavilion kit.
 *
 * Specs are structurally identical and differ only in subject, role and curation
 * tiers, so they are generated rather than hand-copied: three near-identical JSON
 * files maintained by hand drift, and a drifted spec silently stops matching the
 * submitter's guards.
 *
 * Existing specs are left alone unless --force, so a spec carrying a real
 * reviewLog is never clobbered by a regeneration.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const force = process.argv.includes('--force')

const MODULES = [
  {
    id: 'timber-panel',
    asset: 'The timber-framed wall panel',
    room: 'all',
    role: 'wall architecture — French Tudor framing mounted beside each exhibit, giving the wall structure instead of surface',
    name: 'muse-um-timber-panel-v1',
    purpose:
      'Second kit module. The test of whether an open structural frame survives reconstruction — the lantern was a compact solid, and this is not.',
    reject: [
      'Timbers read as flat painted stripes rather than solid members with thickness.',
      'Plaster infill missing, transparent, or absent as a surface.',
      'The diagonal braces do not connect to the stud — floating or broken joinery.',
      'Any lettering, numerals, or invented inscription.',
      'Silhouette unreadable at wall scale.',
    ],
    accept: [
      'One panel: outer rectangle of thick timbers, central stud, two diagonal braces reaching it.',
      'Plaster infill present as an opaque matte surface between the timbers.',
      'Shingled head on top, with a capping rail beneath it.',
      'Warm aged oak with visible grain and tool marks.',
      'Rectangular and taller than wide, reading as part of a building rather than a picture.',
    ],
    note:
      'Mounted flat on the room wall beside the exhibit. Because it is architecture it must not compete with the framed art: it is graded by the same ramp as the wall it sits on.',
  },
  {
    id: 'stone-archway',
    asset: 'The stone doorway surround',
    room: 'all',
    role: 'architecture — a doorway at the room edge giving the space a way out and a sightline through it',
    name: 'muse-um-stone-archway-v1',
    purpose:
      'Third kit module. Tests a through-hole silhouette, which is the opposite reconstruction problem from the lantern\'s closed form.',
    reject: [
      'The opening is filled — door, panel, glazing, or webbing across the void.',
      'Masonry reads as a thin flat card rather than thick blocks.',
      'Arch stones not separable as voussoirs, or no keystone.',
      'Any lettering, numerals, or invented inscription.',
      'Opening too small to read as a doorway.',
    ],
    accept: [
      'Two jambs, a semicircular arch of separate voussoirs, and a keystone.',
      'A true through-hole, cleanly open, with the opening readable as a way through.',
      'Stone reads as thick masonry with worn and chipped edges.',
      'Carved chevron band on the arch face.',
      'A low threshold step between the jambs.',
    ],
    note:
      'Stands at the room edge as a doorway. If it reads as a hole in the wall rather than a frame around one, it fails.',
  },
  {
    id: 'display-cabinet',
    asset: 'The relic cabinet',
    room: 'all',
    role: 'museum furniture — a closed oak cabinet giving human scale and somewhere for relics to live',
    name: 'muse-um-display-cabinet-v1',
    purpose:
      'Fourth kit module. Straightforward solid furniture, included because a room of nothing but wall fittings still has no furniture in it.',
    reject: [
      'Doors glazed, transparent, or open — the brief specifies solid panelled oak.',
      'Carcass reads as a flat slab with no depth or plinth.',
      'Doors not distinguishable as two leaves with a central stile.',
      'Any lettering, numerals, or invented inscription.',
      'Sits implausibly — proportions that cannot stand.',
    ],
    accept: [
      'One closed cabinet: rectangular carcass on a plinth base with a projecting cornice.',
      'Two full-height doors divided into panels by raised mouldings, with a central stile.',
      'Brass ring pulls and visible hinges.',
      'Solid opaque panelled oak with visible grain; no glass anywhere.',
      'Wider across the front than it is deep.',
    ],
    note:
      'Angled against the wall clear of the exhibit. Its joinery is what has to survive reconstruction; the brass pulls are the detail that tells you whether the texture pass worked.',
  },
]

const dir = path.join(ROOT, 'assets/meshy')
let written = 0

for (const module of MODULES) {
  const target = path.join(dir, `${module.id}.json`)
  if (fs.existsSync(target) && !force) {
    console.log(`kept    ${module.id}.json (already exists; use --force to overwrite)`)
    continue
  }

  const spec = {
    id: module.id,
    asset: module.asset,
    kind: 'images',
    room: module.room,
    role: module.role,
    endpoint: '/openapi/v1/multi-image-to-3d',
    note:
      'Multi-image conditioning, NOT text. This request has no prompt field: the turnaround views carry the entire style, so the brief and the anchor image are part of this asset\'s provenance.',
    stages: {
      build: {
        ai_model: 'latest',
        should_texture: true,
        enable_pbr: true,
        remove_lighting: true,
        should_remesh: true,
        target_polycount: 12000,
        topology: 'triangle',
        name: module.name,
        image_files: [`assets/meshy/turnarounds/${module.id}/01.jpg`, `assets/meshy/turnarounds/${module.id}/02.jpg`],
        texture_image_files: [
          `assets/meshy/turnarounds/${module.id}/01.jpg`,
          `assets/meshy/turnarounds/${module.id}/02.jpg`,
        ],
      },
    },
    curation: {
      purpose: module.purpose,
      tiers: { reject: module.reject, accept: module.accept },
      reviewLog: [],
    },
    placement: { note: module.note },
  }

  fs.writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`)
  console.log(`wrote   ${module.id}.json`)
  written += 1
}

console.log(`\n${written} spec(s) written, ${MODULES.length - written} kept.`)
