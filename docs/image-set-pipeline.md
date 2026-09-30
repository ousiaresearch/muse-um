# The image-set pipeline: exhibit art → turnaround → 3D module

How a generated prop gets from a painting to a placed object in the pavilion, and what
the first end-to-end run measured. Rules here were paid for; each one is followed by the
observation that produced it.

## Why modular objects and not generated rooms

Multi-image-to-3D reconstructs **one object**. It is silhouette-driven reconstruction, not
photogrammetry and not scene reconstruction. Feeding it four interior views of a room does
not produce a room; it produces a blob. The pavilion therefore gets its depth from a **kit of
congruent objects** composed into rooms, not from generated interiors.

The division of labour that follows from that:

- **Structural shell — code.** Walls, floor, ceiling, arch openings, wall-to-floor junctions.
  Exact, aligned, trivially adjustable, free. Generated architecture would make the room's
  own geometry unaligned and unaffordable to iterate.
- **Detail — generated meshes.** Lanterns, furniture, instruments, relics, ornaments. The
  parts that carry character and hand-made irregularity, which code draws badly.

## The request has no prompt

`POST /openapi/v1/multi-image-to-3d` accepts no `prompt` field. It is image-only conditioning.
This is the single most consequential fact in this pipeline: **the images are not a guide to
the style, they are the entire style**. Text cannot rescue a bad image set.

Which is why the brief that produces those images is the real work, and why it is anchored to
the pavilion's own exhibit paintings rather than to a written style description.

## Rule: draw a sheet, then cut it up

An image model asked for "the same lantern from three angles" in three separate calls produces
three similar but different lanterns. Reconstruction then averages three different objects into
one mush.

The fix: request **all views inside a single image**, and slice it afterwards. Views drawn in one
pass are the same object because the model drew one object.

`scripts/slice-turnaround.py` cuts on runs of background columns. The background is **detected
from the image border**, never assumed from the brief, and the run is reported as magenta or not,
because "the model probably used the colour I asked for" is the exact assumption that produces
silently wrong slices.

## Rule: brief two views, not three

Measured on attempt 1: a 1774 px sheet split three ways gave views ~300–340 px wide, which had to
be upscaled to 1024. The roof and band ornament came back visibly smeared — consistent with
reconstructing from ~300 px source.

Two views give each roughly half the sheet width. And the three-view sheet only ever yielded
**two distinct angles** anyway (panels 1 and 2 trimmed to an identical 337×799; panel 3 was
289×799). So three views cost resolution without adding information.

The slicer now measures this: it reports each view's trimmed size and the pairwise mean pixel
difference, so a duplicated angle is caught **before** it reaches a paid reconstruction.

## Rule: glazing must be opaque

Transparency is invisible in a still image. Ask for translucent or clear glass and the model
draws an open frame; reconstruction then has no surface to build and produces a hole.

Attempt 1 failed exactly here and nowhere else. Geometry, roof, finial, hanging ring, brass
patina and the absence of invented lettering all passed. The glazing arrived as open air.

The correction is not a better prompt for transparency — it is to stop asking for transparency.
Brief **opaque frosted glass, drawn as a solid matte surface with its own sheen**, and let the
engine supply the glow.

## Rule: bold ornament, not filigree

Fine detail smears in reconstruction. Broad readable shapes survive. Attempt 1's fine scrollwork
on the roof and upper band is the visible casualty.

## Rule: strip baked lighting

`remove_lighting: true`. The turnaround is drawn with its own shading; the pavilion relights
everything with its own toon ramp. Leaving baked light in fights the room's lighting and makes
the prop read as pasted in.

## Rule: spec metadata must never become a request field

Attempt 1's dry run shipped a `viewSelection` note as a request field. The API happened to ignore
it. It will not always happen to ignore it.

`meshy-submit.mjs` now validates the payload against `API_FIELDS` and **throws** on anything
unknown, with the message telling you whether to move it to the spec root or add it as a real
field. Failing loudly is the point: a typo in a real field now surfaces immediately instead of
being sent as junk.

## Cost, measured

| stage | credits |
|---|---|
| multi-image build, mesh + fused texture (`should_texture`, `enable_pbr`) | 30 |
| armillary, text path, 7 passes (preview + refine cycles, several rejected) | 90 |
| **balance before this work** | 3310 |
| **balance after the lantern attempt 1** | 3280 |

At 30 credits per textured module, the kit is affordable at a scale of dozens of objects. The
binding constraint is **review attention**, not credits: attempt 1 needed one rejection and one
re-run to close a single material defect.

## Kit plan

Ordered by how much depth each contributes per credit, not by difficulty.

1. **Pavilion lantern** — validated here. Repeated through rooms, gives pooled warm light and
   immediate depth. *(attempt 2 in flight)*
2. **Timber-framed wall bay** — French Tudor post-and-beam with a shingled head. The single
   largest gain to how architectural the rooms read.
3. **Stone arch / doorway surround** — creates openings and sightlines between spaces.
4. **Display cabinet or open shelf** — museum furniture; holds relics and gives scale cues.
5. **Reading table and bench** — human-scale furniture in the middle of rooms.
6. **Wall sconce** — secondary light source at eye height.
7. **Per-room relic** — the seven remaining exhibits' instruments.

## Not yet proven

- The pipeline is proven **sheet → sliced views → placed module for one object**. It is not yet
  proven across a set, and no module is yet composed into the room and captured.
- Generated architecture pieces are an open risk. Large open structures reconstruct worse than
  compact solid ones, so the timber bay in step 2 is the real test of whether the kit scales to
  architecture at all.
