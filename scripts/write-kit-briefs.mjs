#!/usr/bin/env node
/**
 * Write turnaround briefs for the kit from one template.
 *
 * The brief is the real work in this pipeline — multi-image-to-3D takes no prompt,
 * so the images ARE the style, and every hard-won constraint lives in this text.
 * Nine hand-copied briefs would drift, and a drifted brief fails silently: the
 * sheet looks plausible and the reconstruction is wrong.
 *
 * The template carries what the lantern paid for:
 *   - two views, not three (three cost resolution without adding angles)
 *   - opaque surfaces only (translucency is invisible in a still, so it
 *     reconstructs as nothing — this is how the first lantern lost its glazing)
 *   - bold ornament (fine detail smears through reconstruction)
 *   - the largest canvas, so each view gets the most pixels available
 *   - a pure-magenta backdrop, so the slicer can cut on it and key it out
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const force = process.argv.includes('--force')

const SHARED_STYLE = `Style rules: match the attached reference exactly in material language and atmosphere. This is
the MUSE-UM pavilion idiom: hand-drawn European graphic-novel rendering, medieval epic and ancient
sacred architecture, ethereal, a forgotten civilization remembering itself beneath a dying sun. Warm
aged materials with dark patina in the recesses, muted bone and parchment, thin engraved linework.
Matte hand-finished surfaces, no plastic sheen, no chrome, no neon, no glossy highlights.`

const SHARED_TAIL = `Keep the ornament BOLD AND SIMPLE — broad readable shapes with strong silhouettes, not fine filigree
or fussy carving. Fine detail smears when the image is reconstructed into geometry.

Views, left to right, all the same object at the same scale and the same height in frame:
  1. front elevation, looking straight at the object
  2. three-quarter view, turned roughly forty degrees so its thickness and depth are clearly visible

Composition: the two views evenly spaced across one horizontal sheet, separated by a clear empty gap
so they can be cut apart. Identical scale and identical lighting in both views. Each view upright,
fully inside the frame with generous empty margin on all sides. No overlap, no touching edges.

Use the LARGEST canvas you can produce, and make the object as large within the frame as the margins
allow — every extra pixel of the object survives into the reconstruction.

Background: perfectly uniform pure magenta #FF00FF at every pixel outside the object, with no shadow,
no floor, no gradient, no vignette. The object must be cleanly separable from the background.

Constraints: one object only. Absolutely no text, lettering, numerals, labels, arrows, measurement
marks, captions, borders, or watermarks anywhere in the image. No second object, no scenery, no
figures, no ground, no wall behind it.`

const MODULES = [
  {
    id: 'reading-table',
    thing: 'one long trestle reading table',
    anchor: 'public/art/keepers-room.png',
    subject: `The object: a long, heavy reading table of dark aged oak, the kind a keeper would work at. A
single thick rectangular top plank with visible grain, splits and tool marks, carried on two sturdy
trestle ends — each end a pair of splayed legs joined by a thick cross-foot and braced by a single
horizontal stretcher running the length of the table near the floor. There is a narrow drawer in the
apron beneath the top on one long side, with a small patinated brass pull. The table is clearly much
longer than it is wide or tall, and the legs splay outwards so it stands solidly.`,
  },
  {
    id: 'wall-sconce',
    thing: 'one wall-mounted lantern sconce',
    anchor: 'public/art/keepers-room.png',
    subject: `The object: a wall-mounted lantern sconce of warm aged brass. An ornate but simple wall plate at
the back, from which a short curved arm reaches forward and upward, ending in a hanging lantern of the
same hexagonal kind carried through this pavilion: slim brass uprights, a narrow tapered roof, an
octagonal brass base plate, and a small brass finial hanging beneath. A large brass ring sits at the
top of the lantern where it meets the arm. The lantern body is smaller than the arm's reach, so the
silhouette is a hook with a lamp suspended from it.`,
    critical: `CRITICAL — the lantern glazing: the six body panels must be OPAQUE FROSTED GLASS, milky and cloudy,
drawn as SOLID VISIBLE SURFACES with their own soft matte sheen, clearly a different material from the
brass. Do NOT draw them as open frames, bare openings, or clear transparent panes: a still image cannot
show transparency, so transparent or empty glazing is lost entirely when the image is reconstructed
into 3D geometry.`,
  },
  {
    id: 'fossil-slab',
    thing: 'one stone fossil slab on a low stand',
    anchor: 'public/art/fossil-wall.png',
    subject: `The object: a thick rectangular slab of dark hand-cut stone, standing upright on a small low stone
foot, like a specimen mounted for display. Its broad front face carries a single large spiral fossil
cast prominently in raised relief — a ribbed ammonite-style spiral shell, unmistakable and bold,
occupying most of the face. Around the slab's edge runs a shallow carved border of simple repeated
chevrons. The stone is chipped and weathered along the edges, and the slab is clearly thick, with
visible side faces.`,
  },
  {
    id: 'three-bells',
    thing: 'a wooden frame holding three brass bells',
    anchor: 'public/art/porch-at-three-bells.png',
    subject: `The object: a simple dark oak frame holding three warm brass bells. A horizontal oak beam is
carried on two short upright posts, and from the beam hang three bells in a row, the largest in the
middle and smaller ones at either side. Each bell is an open-mouthed cast brass bell with a visible
clapper hanging below its rim, hung from the beam by a small brass loop. The posts sit on plain flat
feet. The structure is open and airy — you can see the background between the posts beneath the beam.`,
  },
  {
    id: 'broadcast-transmitter',
    thing: 'one brass broadcast transmitter apparatus',
    anchor: 'public/art/broadcast-room.png',
    subject: `The object: a standing broadcast transmitter of warm aged brass and dark oak, the kind of apparatus
a town would use to speak to itself. A heavy dark oak cabinet base with a simple moulded foot, and on
top of it a brass assembly: a tall vertical brass column, a large circular brass horn or speaking
dish facing forward and angled slightly upward, mounted on the column by a pivoted yoke, and a pair of
small brass dials set into the front of the oak base. The dish is a broad shallow cone with a rolled
rim and no grille or mesh across its mouth.`,
    critical: `CRITICAL — the dish mouth: the large circular horn must be a solid brass surface with a smooth
rolled rim. Do NOT draw any grille, mesh, cloth, or transparent covering across its opening.`,
  },
]

let written = 0
for (const module of MODULES) {
  const target = path.join(ROOT, 'assets/meshy/briefs', `${module.id}-turnaround.txt`)
  if (fs.existsSync(target) && !force) {
    console.log(`kept    ${module.id}`)
    continue
  }
  const body = `Use case: 3D reconstruction reference sheet. The two views get fed to a multi-image
reconstruction service, so they must be the SAME OBJECT seen from two angles, drawn in one image.

Asset type: an object turnaround sheet — two views of ${module.thing}, in a single row.

${SHARED_STYLE}

${module.subject}

${module.critical ? `${module.critical}\n\n` : ''}${SHARED_TAIL}

Output: save to /Users/johannross/muse-um/assets/meshy/turnarounds/${module.id}-sheet.png
`
  fs.writeFileSync(target, body)
  console.log(`wrote   ${module.id}  (anchor ${path.basename(module.anchor)})`)
  written += 1
}
console.log(`\n${written} brief(s) written, ${MODULES.length - written} kept.`)
