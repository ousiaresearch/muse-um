# Verification: the stylization technique, and the room's measured baseline

Date: 2026-09-29
Scope: Phase 0 and Task 1.1 of `.hermes/plans/2026-09-29_232347-visual-congruency-and-3d-style.md`
Credits spent: **0**

## 1. The question Task 1.1 existed to answer

The congruency plan depends on full-screen post-processing passes: the cel ramp, the ink outline and
the palette lock all live in an `EffectComposer`. The only verification environment available is
headless Chrome on SwiftShader, so the plan's own risk table listed "postprocessing doesn't render under
SwiftShader" as the failure that would send the whole approach to a fallback (per-material inverted-hull
outlines, no post passes).

**Answer: it renders, and behaves correctly. No fallback needed.**

Evidence, from three captures of the Observatory with animation frozen:

| comparison | changed pixels | bounding box |
|---|---|---|
| A vs B — same configuration, twice | **0** of 1,296,000 (0.000%) | none — pixel-identical |
| A vs C — `?post=1` enabled | 212,532 (16.399%) | (360, 28, 1080, 748) |

The changed region is exactly the 720×720 WebGL canvas. The control is clean, so the A-vs-C difference
is the pass and nothing else.

## 2. The pass is a real vignette, measured radially

`?post=1` against `?post=0`, luminance ratio bucketed by distance from canvas centre:

| bin | radius | ratio | change |
|---|---|---|---|
| 0 | 0.00–0.17 | 1.032 | +3.2% |
| 1 | 0.17–0.33 | 1.008 | +0.8% |
| 2 | 0.33–0.50 | 0.983 | −1.7% |
| 3 | 0.50–0.67 | 0.913 | −8.7% |
| 4 | 0.67–0.83 | 0.768 | −23.2% |
| 5 | 0.83–1.00 | 0.516 | −48.4% |

Monotonic falloff outward. The vignette is doing what a vignette does.

**Known side effect:** the centre bin is 3.2% *brighter* with the composer on. Adding an
`EffectComposer` changes the render path and shifts values very slightly. It is small, but it has to be
accounted for in Task 1.6, which grades the room against the exhibits' luminance band.

## 3. Two measurement errors worth recording

Both were caught by measuring rather than by reasoning.

**A four-band absolute-delta test gave a nonsense answer.** It reported the left edge darkening by 2.44
and the right by 30.04, which looked asymmetric and wrong. A vignette *multiplies*: the left band sat on
dark stone at luminance ~25 and the right on lit brass at ~85, so identical proportional darkening
produces wildly different absolute deltas. Absolute deltas between bands cannot test a multiplicative
effect. The radial ratio in §2 is the correct form.

**Measuring the whole frame instead of the canvas inflated a failure.** The first contract run reported
luminance 31.6, edge density 8.2 and palette share 90.1%. The dominant tones it printed included
`#0a0a12` — the page background. It was averaging 1,296,000 pixels of page chrome with 518,400 pixels of
render. Canvas-scoped, the real numbers are in §4. Any gate measured on the full screenshot is
measuring the DOM.

## 4. The room's measured baseline (canvas only)

Observatory, canvas 720×720 at (360, 28):

| gate | measured | band | verdict |
|---|---|---|---|
| mean luminance | **58.2** | 70–115 | FAIL — the room is ~20% too dark |
| mean saturation | 84.3 | 55–130 | PASS |
| edge density | **15.5** | 24–46 | FAIL — far less ink than the exhibits (26–45) |
| palette share | **76.3%** | ≥ 92% | FAIL — a quarter of the frame is outside the token set |

Dominant canvas tones: `#0f0e15` `#4a3a39` `#6b5550` `#322625`.

This is the target for Phase 1, and the three failures map exactly onto the three Phase 1 mechanisms:

- **luminance** → Task 1.6, grade the room to the exhibits' exposure.
- **edge density** → Task 1.4, the ink outline. The gap (15.5 against 24–46) is the single clearest
  evidence that the room has no drawn line in it.
- **palette share** → Tasks 1.3 and 1.5, the token-derived material and the palette lock. `#0f0e15` is a
  cool near-black, and the violet floor and wall are the reason a quarter of the frame sits outside a
  deliberately warm palette. This confirms the §0 diagnosis with pixels rather than with hex codes read
  off a stylesheet.

## 5. Infrastructure this produced

Verification-only affordances, free when absent:

- `?still=1` freezes animation. Without it, a rotating prop contributes more changed pixels than the
  pass under test — it did, on the first attempt.
- `?post=0` disables the stylization passes, for a clean A/B from a single build.
- `scripts/capture-room.sh` drives the headless capture with those flags.
- `scripts/measure-capture.py` reports the contract gates inside the canvas, deriving the canvas rect by
  diffing rather than assuming it, and profiles a multiplicative effect radially.
- `npm run capture`, `npm run measure`.

**Deviation from the plan:** these scripts are Python driven through `uv`, not the Node scripts the plan
named. The measurements need real image decoding; Pillow is already proven in this repo and Node would
need a new decoder dependency. The runtime choice is recorded here rather than left implicit.

## 6. What is not established

- Only the Observatory has been captured and measured. The other seven rooms are unmeasured.
- The gates reported are the *current* values, not targets that have been met. Three fail.
- The vignette is a placeholder proving the pipeline. The ramp, the outline and the palette lock — the
  effects the congruency actually depends on — are not built yet.
- The 3.2% centre brightening from the composer has not been corrected.
