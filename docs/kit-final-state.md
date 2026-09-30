# The kit — final state

The pavilion's generated 3D kit is complete. Fourteen models ship, all registered, and
every one of the eight rooms carries a relic of its own.

## What ships

| model | rooms | role |
|---|---|---|
| stone-archway | all | doorway surround |
| timber-panel | all | wall bay |
| pavilion-lantern | all | hanging fitting, four per room |
| reading-table | all | long trestle table |
| wall-sconce | all | wall fitting, either side of the frame |
| display-cabinet | all | relic cabinet |
| threshold-key | threshold | relic |
| fossil-slab | fossil_wall | relic |
| keepers-ledger | keeper_room | relic |
| matching-pair | matching_signal | relic |
| lake-basin | lake_at_dawn | relic |
| three-bells | porch_at_three_bells | relic |
| observatory-armillary | observatory | relic |
| broadcast-transmitter | broadcast_room | relic |

Fittings and furniture are `room: all` because a real building has uniform fixtures, and
that uniformity is part of what makes eight rooms read as one building. A relic is scoped
to one room because it renders that room's own motif; placing the three bells in the
Observatory would assert something the record does not say.

## Cost

22 reconstruction tasks, **550 credits** total. Balance 3410 → 2860.

Per module: 30 credits. The lantern cost 90 because it took three builds (v1 failed on
material, v2 came back pink). Everything after it passed first time.

## Method, and what it actually caught

Generation was never the hard part. **Every real defect was found by measuring, and
several were my own instrument lying to me:**

- A pink lantern. Found by measuring the submitted views (22.3% magenta pixels) after it
  looked merely "off". Root cause was my own slicer flattening a transparent sheet onto
  the briefed magenta.
- A sheet sliced while still being written. Found because the file changed size between
  passes. The slicer now refuses a file modified in the last 12 seconds.
- Props rendered but invisible. Probed with a temporary red material to prove they were
  drawing, then rooted in the toon ramp's ink stop. Fixed with a brass ramp.
- A camera showing 6.8m of an 8.6m room, clipping four props at the frame edges.
- A wall label covering 62% of the canvas width and 69% of the height, hiding the floor
  on the left. Because a floor object's screen position always falls below the panel's top
  edge, the occlusion was structural and placement alone could not fix it.
- **The sweep measuring a stale region**, which reported every room as luminance 46
  against a true 75 and led to a confident, wrong diagnosis that the room could not light
  itself. The region was left over from full-page captures and ran off the edge of the
  canvas-clipped ones; PIL filled the overhang with black.
- **Relics placed behind the display cabinet** — my own regression while fixing the label,
  missed at the time because I did not re-verify what I had moved.

Two review false-positives were caught before they cost anything: the three-bell frame
was called "not upright" and the matched pair "asymmetric", both from perspective on a
single render. The pair was checked with a side-by-side crop and confirmed identical.

The orientation reader produced three false alarms in succession — a wide frame, a flat
bowl, a long table — each because it assumed one shape archetype. It now states what
extents can support and defers to a capture for the rest, which is the honest limit of
reading geometry without a renderer.

## Gates

Measured across all eight rooms, canvas only:

- luminance **75–88**, band 70–115 — passes everywhere
- saturation **65–72**, band 55–130 — passes everywhere
- palette share **79–85%**, floor 77% — passes everywhere
- ink-line share **5.5–7.5%**, band 12–25% — **fails everywhere**

Ink is the one open gate, and it is not a pen-width problem. The rooms are a box with one
decorated face; ink rises from inked geometry, and there is not yet architecture to trace.
That is Phase 2: real side walls, a ceiling, openings.

## Known, recorded rather than hidden

- The threshold key's stone block did not survive reconstruction. The pavilion supplies it
  as an in-engine plinth — a token-graded box — which is the split the kit runs on
  generally: generation supplies the detail code draws badly, code supplies exact simple
  structure.
- The matched pair's plates reconstructed as pointed-leaf outlines rather than the briefed
  circular disc, and the generator added a star motif that was not requested. Both recorded
  as brief deviations in the registry.
- The lake basin's interior has a pale textured patch that does not follow the bowl's
  curvature. Checked at the mesh level: one primitive, UVs present, no stray plane. It is a
  texture region, visible only from an elevated angle looking into the mouth.

Every deviation, rejection and superseded task is in `public/agent/assets.json` and the
per-module specs under `assets/meshy/`. `npm run check:assets` fails the build if the
registry and `public/models/` ever disagree.
