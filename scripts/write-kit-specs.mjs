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
  {
    id: 'reading-table',
    asset: 'The reading table',
    room: 'all',
    role: 'museum furniture — a long trestle table giving the room a working centre at human height',
    name: 'muse-um-reading-table-v1',
    purpose:
      'Fifth kit module. The kit\'s first object wider than it is tall, which is a different reconstruction problem from every upright module so far.',
    reject: [
      'Top reads as a flat plane with no thickness.',
      'Trestle ends fused into a solid slab instead of splayed legs with a stretcher.',
      'Legs floating, detached, or not reaching the floor plane.',
      'Any lettering, numerals, or invented inscription.',
      'Proportions that could not stand — top much wider than the leg span.',
    ],
    accept: [
      'One table: thick top plank on two trestle ends with splayed legs and a long stretcher.',
      'A drawer and brass pull readable in the apron.',
      'Warm aged oak with visible grain, splits and tool marks.',
      'Clearly longer than wide or tall.',
      'Legs splayed so it reads as standing solidly.',
    ],
    note:
      'Placed across the room clear of the exhibit and the cabinet, at table height. A low wide object reads as furniture scale rather than as clutter.',
  },
  {
    id: 'wall-sconce',
    asset: 'The wall sconce',
    room: 'all',
    role: 'architecture fitting — a wall-mounted lantern on a brass arm, second light source at eye height',
    name: 'muse-um-wall-sconce-v1',
    purpose:
      'Sixth kit module. Tests a compound silhouette — a bracket with a hanging body — which is neither a closed solid like the lantern nor an open frame like the panel.',
    reject: [
      'Glazing open, transparent or absent — the panes must be opaque frosted surfaces.',
      'Arm and lantern fused into one undifferentiated mass.',
      'Lantern body larger than the arm could plausibly carry.',
      'Any lettering, numerals, or invented inscription.',
      'No readable wall plate, or an arm that attaches to nothing.',
    ],
    accept: [
      'A wall plate, a curved arm, and a lantern suspended from it.',
      'Opaque frosted panes drawn as solid surfaces with their own sheen.',
      'Hexagonal lantern with tapered roof and finial, matching the pavilion fittings.',
      'Brass ring where the lantern meets the arm.',
      'Warm aged brass with patina.',
    ],
    note:
      'Mounted on the wall at eye height, at a different height from the hanging fittings so the room gains a second light level.',
  },
  {
    id: 'fossil-slab',
    asset: 'The fossil slab',
    room: 'fossil_wall',
    role: 'the Fossil Wall\'s relic — a spiral fossil in raised relief on a stone slab, on a low stand',
    name: 'muse-um-fossil-slab-v1',
    purpose:
      'Seventh kit module, and the first relic. Carries the room\'s own recorded motif (Musebook post 119311) as an object rather than only as a painting.',
    reject: [
      'The spiral not readable as a spiral, or lost entirely.',
      'Slab reads as a thin card rather than thick stone.',
      'Any lettering, numerals, or invented inscription.',
      'Relief so shallow it vanishes at display size.',
      'Stand and slab fused into one lump.',
    ],
    accept: [
      'One thick stone slab standing upright on a small foot.',
      'A single bold ribbed spiral fossil cast prominently in raised relief.',
      'Shallow carved chevron border around the face.',
      'Chipped weathered edges and visible side faces.',
      'Warm dark stone, no key-colour contamination.',
    ],
    note:
      'Stands in the Fossil Wall room. Its spiral is the room\'s own sourced motif, so this relic is source-attached rather than invented — the attachment lives on the room, and this object renders it.',
  },
  {
    id: 'three-bells',
    asset: 'The three bells',
    room: 'porch_at_three_bells',
    role: 'the Porch\'s relic — three brass bells hung in an oak frame',
    name: 'muse-um-three-bells-v1',
    purpose:
      'Eighth kit module. The kit\'s first genuinely OPEN object: you must be able to see the background between the posts under the beam.',
    reject: [
      'The frame closed in — infilled, panelled or webbed between the posts.',
      'Bells fused into the beam or into each other.',
      'No visible clappers below the rims.',
      'Any lettering, numerals, or invented inscription.',
      'Three bells not distinguishable as three.',
    ],
    accept: [
      'A beam on two short posts, open beneath, with the background visible through it.',
      'Three cast bells in a row, largest in the middle, each with a visible clapper.',
      'Bells hung from the beam by small brass loops.',
      'Warm brass bells and dark oak posts.',
      'Reads as a frame that could be walked past.',
    ],
    note:
      'Stands in the Porch room. The open frame is the point — a closed version would defeat the room\'s motif.',
  },
  {
    id: 'broadcast-transmitter',
    asset: 'The broadcast transmitter',
    room: 'broadcast_room',
    role: 'the Broadcast Room\'s relic — a brass horn transmitter on an oak cabinet, the town\'s voice',
    name: 'muse-um-broadcast-transmitter-v1',
    purpose:
      'Ninth kit module. Carries the Broadcast Room\'s sourced motif (Musebook posts 107549 and 107551) as a physical apparatus rather than only as a painting.',
    reject: [
      'Grille, mesh or cloth drawn across the horn mouth.',
      'Horn and column fused into a single mass.',
      'Horn unreadably small relative to its base.',
      'Any lettering, numerals, or invented inscription.',
      'Cannot stand — base narrower than the overhanging horn.',
    ],
    accept: [
      'A dark oak cabinet base with a brass column and a large horn or dish facing forward, angled up.',
      'Horn mouth clear and open, with a rolled rim and nothing across it.',
      'Brass dials readable on the oak front.',
      'Warm brass and aged oak; no key-colour contamination.',
      'Stable silhouette — a heavy base carrying a lighter apparatus.',
    ],
    note:
      'Stands in the Broadcast Room. Its horn is the room\'s sourced motif rendered as an object, so it is source-attached rather than invented.',
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
