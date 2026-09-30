#!/usr/bin/env node
/**
 * Register the second kit wave (table, sconce, three relics) in assets.json.
 *
 * Triangle counts and delivered byte sizes are read from the GLB files themselves
 * rather than copied from a console log, so the registry records what actually
 * shipped. Run scripts/check-asset-registry.mjs afterwards to confirm agreement.
 */
import fs from 'node:fs'

function readGlbJson(file) {
  const buf = fs.readFileSync(file)
  let offset = 12
  const total = buf.readUInt32LE(8)
  while (offset < total) {
    const length = buf.readUInt32LE(offset)
    const type = buf.readUInt32LE(offset + 4)
    if (type === 0x4e4f534a) return JSON.parse(buf.subarray(offset + 8, offset + 8 + length).toString('utf8'))
    offset += 8 + length + ((4 - (length % 4)) % 4)
  }
  return null
}

function triangleCount(file) {
  const json = readGlbJson(file)
  let tris = 0
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const acc = json.accessors?.[prim.indices]
      if (acc?.count) tris += acc.count / 3
      else {
        const pos = json.accessors?.[prim.attributes?.POSITION]
        if (pos?.count) tris += pos.count / 3
      }
    }
  }
  return Math.round(tris)
}

const ENTRIES = [
  {
    id: 'reading-table',
    room: 'all',
    role: 'recurring furniture — a long trestle reading table standing on the floor of every room',
    acceptedTask: { build: '01a0f2bb-338b-7464-a400-5f149c267535' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/reading-table-sheet.png',
      brief: 'assets/meshy/briefs/reading-table-turnaround.txt',
      views: ['assets/meshy/turnarounds/reading-table/01.jpg', 'assets/meshy/turnarounds/reading-table/02.jpg'],
      styleAnchor: 'public/art/keepers-room.png — the exhibits’ own oak and brass, so the furniture shares the art’s material language',
      note: 'First module wider than it is tall (trimmed 1031x341, aspect 3.511). The brief asked for a single plank deliberately: repeated planks pose a segmentation ambiguity that reconstruction resolves unpredictably.',
    },
    acceptedProperties: [
      'Tabletop reconstructs as a SINGLE continuous plank — no panel breaks or seams, verified before and after reconstruction.',
      'Two trestle end supports, the long stretcher and the central drawer all survive as separate connected geometry; the base stays open underneath.',
      'Brass ring pull on the drawer front reads as metal, not as a painted patch.',
      'Aged oak with visible grain; no magenta contamination in the texture.',
    ],
    knownLimitations: [
      'At its placed size the table occupies the lower-left of the frame, which is where the room’s wall-label panel sits — measured as covering 62% of canvas width and 69% of height. The table is therefore largely hidden in the running app until either its position or the label changes.',
      'Distressed top edge is baked into the texture rather than modelled.',
    ],
    reviewNote:
      'Sheet reviewed before spending: single plank, strong third dimension in the turn, no fused parts. Preview reviewed against the same criteria; passed both. One slicer experiment was reverted here — aspect-matched canvas squashed the second view from 997x439 to 1024x339, which is distortion, so the per-view square was restored.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Pavilion furniture, not a claim about any recorded artifact. Asserts nothing historical.',
    },
  },
  {
    id: 'wall-sconce',
    room: 'all',
    role: 'recurring wall fitting — mounted either side of the framed exhibit in every room',
    acceptedTask: { build: '01a0f2af-ff68-77c6-9e92-b98b912537e4' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/wall-sconce-sheet.png',
      brief: 'assets/meshy/briefs/wall-sconce-turnaround.txt',
      views: ['assets/meshy/turnarounds/wall-sconce/01.jpg', 'assets/meshy/turnarounds/wall-sconce/02.jpg'],
      styleAnchor: 'public/art/keepers-room.png — the exhibits’ own lantern form',
      note: 'The critical instruction was that glazing be drawn as an opaque frosted surface. The lantern’s original failure was briefed translucency, which reconstructs as open air because transparency is invisible in a still.',
    },
    acceptedProperties: [
      'Glazing reconstructed as SOLID OPAQUE frosted panels — the specific failure this module was briefed to avoid did not occur.',
      'Back plate, curved arm, brass ring and lantern body all present and connected; the three-quarter view confirms they stay distinct rather than fusing.',
      'Recognisable lantern form: tapered roof, hexagonal body, finials. Warm brass, no magenta.',
    ],
    knownLimitations: [
      'Depth axis is x, not z — this is the only module in the kit that does not arrive facing the camera, so it requires an explicit y-rotation to sit against a wall. Recorded on the KIT entry.',
      'At the placed 0.6m height it renders small (aspect 0.316, ~0.19m wide unwrapped) and is easily lost against the wall.',
    ],
    reviewNote:
      'Sheet and preview both reviewed. The glazing question was asked directly of both, because it is the one failure mode that hides in a still and only surfaces as missing geometry after reconstruction.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Pavilion fitting, not a claim about any recorded artifact. Asserts nothing historical.',
    },
  },
  {
    id: 'fossil-slab',
    room: 'fossil_wall',
    role: 'room relic — the Fossil Wall’s sourced motif as a physical object, standing on that room’s floor',
    acceptedTask: { build: '01a0f2b2-0a35-7565-a76c-7ec64f49c063' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/fossil-slab-sheet.png',
      brief: 'assets/meshy/briefs/fossil-slab-turnaround.txt',
      views: ['assets/meshy/turnarounds/fossil-slab/01.jpg', 'assets/meshy/turnarounds/fossil-slab/02.jpg'],
      styleAnchor: 'public/art/fossil-wall.png — the room’s own exhibit, so the relic carries the same motif the artwork does',
      sourceRoom: 'fossil_wall',
      sourcePost: 119311,
      note: 'The spiral fossil is the motif of musebook post 119311, which the room already attaches as a source. The relic renders that sourced motif as an object; it does not assert that such an object was recorded.',
    },
    acceptedProperties: [
      'Spiral fossil readable as raised relief after reconstruction — the detail survived rather than smearing into a lump.',
      'Slab reads as THICK stone with real edge and side faces; stands on its foot.',
      'Shallow chevron border preserved. Warm limestone against dark basalt.',
      'Lowest keyed fraction of any module (2.5% and 5.0%): a thick closed slab shows almost no backdrop through it.',
    ],
    knownLimitations: [
      'Deliberately a generic spiral shell, not a species-specific reconstruction.',
      'The room’s exhibit is wall-mounted while the relic stands on the floor; they share a motif rather than a layout.',
    ],
    reviewNote:
      'Sheet allowed to finish writing before slicing — its process was still alive when the file first appeared, which is the exact hazard that produced the pink lantern. Both the sheet and the preview passed on the spiral question.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Carries the room’s own source (musebook 119311) as the motif it renders, but the object itself is an artistic interpretation, not a record of a town artifact. The room’s source attachment is unaffected.',
    },
  },
  {
    id: 'three-bells',
    room: 'porch_at_three_bells',
    role: 'room relic — the Porch’s three-bell motif as a physical frame standing on that room’s floor',
    acceptedTask: { build: '01a0f2b0-ab72-7666-9041-8d1b243b5737' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/three-bells-sheet.png',
      brief: 'assets/meshy/briefs/three-bells-turnaround.txt',
      views: ['assets/meshy/turnarounds/three-bells/01.jpg', 'assets/meshy/turnarounds/three-bells/02.jpg'],
      styleAnchor: 'public/art/porch-at-three-bells.png — the room’s own exhibit',
      sourceRoom: 'porch_at_three_bells',
      note: 'The widest object in the kit (sheet 1942x809, trimmed views 940px and 801px — the most pixels per view of any module).',
    },
    acceptedProperties: [
      'Reconstructed as a genuinely OPEN frame: the backdrop is visible beneath the beam and between the bells. Open structures were the kit’s least certain case.',
      'Three separate bells, each with a domed top and flared mouth, none fused.',
      'Wooden beam and posts present and connected.',
      'Highest keyed fraction of any module (22.8% and 26.8%) — that number IS the open frame; the closed cabinet keys 4.9-6.9%, so the fraction is a usable diagnostic for whether a structure closed up.',
    ],
    knownLimitations: [
      'Wider than it is tall (x is the widest axis), so it does not satisfy a naive “y should be tallest” orientation check. That check was corrected rather than the mesh rotated.',
    ],
    reviewNote:
      'Sheet and preview both reviewed explicitly on whether the frame stayed open — the opposite risk to every other module, where the danger was transparency creating holes.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Renders the room’s own motif as an object; the object is an interpretation, not a record. The room’s source attachment is unaffected.',
    },
  },
  {
    id: 'broadcast-transmitter',
    room: 'broadcast_room',
    role: 'room relic — the Broadcast Room’s transmitter motif as a physical object standing on that room’s floor',
    acceptedTask: { build: '01a0f2bc-d709-7144-becc-7adbdbbad811' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/broadcast-transmitter-sheet.png',
      brief: 'assets/meshy/briefs/broadcast-transmitter-turnaround.txt',
      views: ['assets/meshy/turnarounds/broadcast-transmitter/01.jpg', 'assets/meshy/turnarounds/broadcast-transmitter/02.jpg'],
      styleAnchor: 'public/art/broadcast-room.png — the room’s own exhibit',
      sourceRoom: 'broadcast_room',
      sourcePosts: [107549, 107551],
      note: 'The room attaches musebook posts 107549 and 107551 as sources; the relic renders that sourced broadcast motif as an object without asserting the object was recorded.',
    },
    acceptedProperties: [
      'The horn reconstructed as a real hollow dish with rim thickness and a visible concave interior — not a flat disc. This was the decisive risk: a circle drawn well still reconstructs as a circle if the depth cues are absent.',
      'Horn attached to its yoke, stem and wooden base; no floating parts.',
      'Two brass knobs survive on the base. Warm brass with patina, dark wood.',
      'Reviewed with an explicit depth read before submitting, because a flat disc and a dish are near-identical in a single flat-lit view.',
    ],
    knownLimitations: [
      'Texture softness typical of a two-view reconstruction.',
      'The horn is decorative apparatus, not a working device; no grille or mesh was modelled across the mouth.',
    ],
    reviewNote:
      'The depth question was put to the sheet twice — once on the full view and once as a focused analysis of highlight placement, interior tonal bands and rim curvature — before any credits were spent on reconstruction.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Renders the room’s own sourced motif as an object; the object is an interpretation, not a record of a town artifact. The room’s source attachments are unaffected.',
    },
  },
]

const registryPath = 'public/agent/assets.json'
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))

for (const entry of ENTRIES) {
  const file = `public/models/${entry.id}.glb`
  if (!fs.existsSync(file)) throw new Error(`refusing to register ${entry.id}: ${file} does not exist`)
  const rawCandidates = [`artifacts/meshy/${entry.id}-raw.glb`]
  const raw = rawCandidates.find((p) => fs.existsSync(p))
  registry.assets.push({
    ...entry,
    file,
    served: `models/${entry.id}.glb`,
    spec: `assets/meshy/${entry.id}.json`,
    inspection: {
      rawBytes: raw ? fs.statSync(raw).size : null,
      deliveredTriangles: triangleCount(file),
      deliveredBytes: fs.statSync(file).size,
      optimization:
        'gltf-transform optimize — simplify, quantization, textures resized to 1024 and converted to webp. Lossy: the delivered mesh is not vertex-identical to the generated one.',
      note: 'Triangle count and byte size are read from the delivered GLB, not copied from a log.',
    },
  })
}

registry.assets.sort((a, b) => a.id.localeCompare(b.id))
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`)
console.log(`registered ${ENTRIES.length} assets; registry now lists ${registry.assets.length}`)
