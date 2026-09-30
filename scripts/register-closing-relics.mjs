#!/usr/bin/env node
/**
 * Register the closing three relics (ledger, matching pair, basin) in assets.json.
 *
 * Read back with scripts/check-asset-registry.mjs, which fails if the registry and the
 * shipped models disagree.
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
    }
  }
  return Math.round(tris)
}

const ENTRIES = [
  {
    id: 'threshold-key',
    room: 'threshold',
    role: 'room relic — the Threshold motif as a physical object: the thing that permits entry, rather than a door',
    acceptedTask: { build: '01a0f31a-cae1-77e9-89c8-6853827f2c38' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/threshold-key-sheet.png',
      brief: 'assets/meshy/briefs/threshold-key-turnaround.txt',
      views: ['assets/meshy/turnarounds/threshold-key/01.jpg', 'assets/meshy/turnarounds/threshold-key/02.jpg'],
      styleAnchor: 'public/art/threshold.png — the room’s own exhibit',
      note: 'Tall narrow views (375x975 and 355x985). Thickness was specified explicitly in the brief because a key is the least volumetric object in the kit.',
    },
    acceptedProperties: [
      'Survived as THICK, chunky forged metal with a substantial faceted shank — it does not read as wire or a flat cutout, which was the stated risk.',
      'The bow is an actual open ring with the backdrop visible through it.',
      'The bit is broad and its square wards are present as real stepped geometry rather than drawn lines.',
      'Dark pitted iron against warm brass at the bow and collar. No lettering.',
    ],
    knownLimitations: [
      'The stone block from the turnaround sheet did NOT survive reconstruction: the mesh ends in a finial with nothing beneath it. Accepted rather than regenerated because the volume, bow and wards — the three things that mattered — all came through, and a stone block is exact simple structure that code draws more precisely than generation does. The pavilion supplies it in-engine: this is the one relic with a `plinth` entry in the kit, and the plinth is a token-graded box.',
    ],
    reviewNote:
      'Sheet reviewed before spending on the thin-silhouette question, and the preview reviewed again after. The missing base was confirmed by checking a zoomed crop of the mesh bottom rather than inferring it from one review comment.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Renders the room’s own motif as an object; the object is an interpretation, not a record. The room’s source attachment is unaffected.',
    },
  },
  {
    id: 'keepers-ledger',
    room: 'keeper_room',
    role: 'room relic — the Keeper’s Room motif as a physical object: the record itself, deliberately closed',
    acceptedTask: { build: '01a0f31b-adc0-7517-9856-09c55a0e2e04' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/keepers-ledger-sheet.png',
      brief: 'assets/meshy/briefs/keepers-ledger-turnaround.txt',
      views: ['assets/meshy/turnarounds/keepers-ledger/01.jpg', 'assets/meshy/turnarounds/keepers-ledger/02.jpg'],
      styleAnchor: 'public/art/keepers-room.png — the room’s own exhibit',
      note: 'Near-square views (755x729 and 805x797), the largest of any module, which suits a chunky box-like object. Closed rather than open because the room is about what is kept, not what is shown.',
    },
    acceptedProperties: [
      'Closed and thick, with genuinely thick boards; the book does not read as a flat slab.',
      'Two brass clasps across the fore-edge and brass corner-pieces survive reconstruction.',
      'The wooden reading stand survives as a separate structure beneath the book rather than fusing into it.',
      'NO lettering, numerals or invented inscription anywhere — the check this asset was most likely to fail, since a book is the most tempting surface for it in this pipeline.',
      'No magenta contamination.',
    ],
    knownLimitations: [
      'The layered page block along the fore-edge resolved as a solid, indistinct edge rather than distinct page layers.',
      'At its placed scale the object is small in the room, so the clasps are the main thing that reads.',
    ],
    reviewNote:
      'Sheet and preview both reviewed explicitly on the inscription question. Both came back clean, which is the outcome that mattered for an object whose whole point is holding a record honestly.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Pavilion furniture rendering the room’s own motif as an object; it asserts nothing about any recorded town artifact. The room’s source attachments are unaffected.',
    },
  },
  {
    id: 'matching-pair',
    room: 'matching_signal',
    role: 'room relic — the Matching Signal motif as a physical object: two plates turned toward one another',
    acceptedTask: { build: '01a0f31b-bb92-710b-a5cb-311f2854f929' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/matching-pair-sheet.png',
      brief: 'assets/meshy/briefs/matching-pair-turnaround.txt',
      views: ['assets/meshy/turnarounds/matching-pair/01.jpg', 'assets/meshy/turnarounds/matching-pair/02.jpg'],
      styleAnchor: 'public/art/matching-signal.png — the room’s own exhibit',
      note: 'Keyed 27.1% and 32.0%, the highest two-view keying in the kit, consistent with an open assembly of plates on posts rather than a solid mass.',
    },
    acceptedProperties: [
      'Two plates, both present, mounted on their posts with the base and cross-member intact.',
      'Dished faces with raised rims and a central motif; the plates read as receivers rather than flat coins.',
      'Tilted inward toward one another, which is the arrangement the room’s idea depends on.',
      'The wooden base survives beneath them. No magenta contamination.',
    ],
    knownLimitations: [
      'BRIEF DEVIATION, recorded rather than treated as specified: the plates reconstructed as a pointed-leaf / mandorla outline rather than the circular disc the brief asked for. Accepted because the form is identical on both plates, dished with raised rims and the same motif, so the matching criterion — the whole point — still holds.',
      'The generator also added an eight-pointed star motif to the faces, which the brief did not request. Accepted as simple geometric ornament, identical on both plates, and not the invented lettering this pipeline rejects.',
    ],
    reviewNote:
      'A vision review of the reconstructed mesh reported the left plate as "smaller, shorter and less detailed" than the right, which would have failed the matching criterion. That was checked rather than acted on: a side-by-side crop comparison found the two plates share the same outline, rim, dished centre and motif, and that the apparent difference was perspective on one more oblique view. Recorded because it is the second time in this kit that a review of a perspective render nearly produced a false defect on a correct mesh.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Renders the room’s own motif as an object; the object is an interpretation, not a record. The room’s source attachment is unaffected.',
    },
  },
  {
    id: 'lake-basin',
    room: 'lake_at_dawn',
    role: 'room relic — the Lake at Dawn motif as a physical object: a vessel that holds water, echoing the lake’s proportion',
    acceptedTask: { build: '01a0f31c-784e-748f-b3df-22ff46eb80c7' },
    inputLineage: {
      route: 'multi-image-to-3D, fused texture (should_texture with texture_image_urls)',
      sheet: 'assets/meshy/turnarounds/lake-basin-sheet.png',
      brief: 'assets/meshy/briefs/lake-basin-turnaround.txt',
      views: ['assets/meshy/turnarounds/lake-basin/01.jpg', 'assets/meshy/turnarounds/lake-basin/02.jpg'],
      styleAnchor: 'public/art/lake-at-dawn.png — the room’s own exhibit',
      note: 'Wide-and-shallow views (935x429 and 885x485), the widest in the kit, which is the object shape rather than a slicing artefact.',
    },
    acceptedProperties: [
      'Reconstructed as a broad OPEN bowl, markedly wider than tall; the mouth is open and the interior readable.',
      'The chevron band below the rim survives intact.',
      'The stone foot survives and is narrower than the bowl, so the bowl overhangs it. Sits level.',
      'No magenta contamination, no holes, no doubled shells.',
    ],
    knownLimitations: [
      'TEXTURE ARTEFACT: part of the bowl’s interior is painted a uniform pale colour, reading as a flat patch whose edge does not follow the bowl’s curvature. Checked at the mesh level rather than assumed — the GLB is a single primitive with TEXCOORD_0 present and no unmapped geometry, so this is a texture region, not a stray plane clipping through the bowl. Visible only from an elevated angle looking into the mouth, which is why the capture shows it and a normal eye-level view largely does not.',
      'The stone foot reads as an ornate integrated support rather than a plain separate block.',
    ],
    reviewNote:
      'Proportion was the acceptance criterion and it passed on both the sheet and the preview. The interior artefact was investigated rather than waved through once it was spotted, and the file was inspected to establish what it actually is.',
    evidenceStatus: {
      status: 'artistic interpretation',
      note: 'Renders the room’s own motif as an object; the object is an interpretation, not a record. The room’s source attachment is unaffected.',
    },
  },
]

const registryPath = 'public/agent/assets.json'
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
const existing = new Set(registry.assets.map((a) => a.id))

for (const entry of ENTRIES) {
  if (existing.has(entry.id)) {
    console.log(`skipped ${entry.id} (already registered)`)
    continue
  }
  const file = `public/models/${entry.id}.glb`
  if (!fs.existsSync(file)) throw new Error(`refusing to register ${entry.id}: ${file} does not exist`)
  const raw = `artifacts/meshy/${entry.id}-raw.glb`
  registry.assets.push({
    ...entry,
    file,
    served: `models/${entry.id}.glb`,
    spec: `assets/meshy/${entry.id}.json`,
    inspection: {
      rawBytes: fs.existsSync(raw) ? fs.statSync(raw).size : null,
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
console.log(`registry now lists ${registry.assets.length} assets`)
