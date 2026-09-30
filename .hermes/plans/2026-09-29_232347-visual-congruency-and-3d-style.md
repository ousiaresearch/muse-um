# MUSE-UM Visual Congruency Implementation Plan
### Translating the cosmic-mythic graphic-novel exhibit idiom into three dimensions

> **For Hermes:** Use the `subagent-driven-development` skill to implement this task-by-task. Pause for
> operator review at every phase gate. Generate nothing that spends credits or publishes publicly
> without explicit approval at that gate.

**Goal:** Make the MUSE-UM pavilion read as the same world as its own exhibit paintings — a hand-drawn
cosmic-mythic graphic-novel idiom reconstructed in navigable 3D — and make that congruency measurable
rather than a matter of taste.

**Architecture:** Five layers, of which only two are currently missing and both are decisive. The
generators (Codex image_gen, Meshy text-to-3D) supply *things*: tokens, geometry, material maps. They
do not supply *style*, because the idiom lives in the renderer, not in the objects. So the plan derives
an explicit style-token set from the approved artwork, then rebuilds the WebGL pipeline as a stylized
renderer (cel ramp + ink outline + palette lock + atmosphere) that all rooms and props inherit. A prop
cannot drift from the palette if the renderer snaps it to the palette.

**Tech stack:** React 18, Vite 6, three 0.160, @react-three/fiber 8, @react-three/drei 9, plus
`@react-three/postprocessing`. Meshy text-to-3D and multi-image-to-3D for props and characters, through
the existing vetted `scripts/meshy-*.mjs` pipeline. Headless Chrome for capture verification.

---

## 0a. Operator decisions recorded 2026-09-29

These three rulings answer the forks in §10 and supersede anything in this plan that contradicts them.

1. **Stylization variant: painterly.** Not graphic-novel, not woodcut. This confirms the measurement
   reading — the exhibits are painterly-with-ink, not cel — and it sets the whole Phase 1 parameter
   block: soft ramp, restrained ink, moderate palette lock. Task 1.7's three-variant comparison still
   runs, but painterly is now the target and the other two become reference points rather than
   candidates.
2. **Luma and the Muse companions ARE to be generated.** This overrides the earlier blanket refusal in
   this plan. See **§2 Layer F** and **Phase 3B**. The refusal was correct about *text-only* generation
   and wrong as a general rule: Meshy's **multi-image-to-3D** endpoint accepts 1–4 images of one object,
   which is the technique that makes a canon-preserving character generation possible. The identity risk
   is managed by conditioning on the canonical art and gating acceptance on measured identity, not by
   declining to build it.
3. **Orbit is the interaction.** No first-person walk. The original "walk through" brief is satisfied by
   orbiting and moving between connected rooms; the walk track is dropped from Phase 4.

---

## 0. The measured diagnosis

I sampled all eight approved exhibit PNGs before writing any of this. The numbers say something
specific and it is not what the current room assumes.

| exhibit | canvas | mean lum | mean sat | edge density | dominant tones |
|---|---|---|---|---|---|
| broadcast-room | 1536×1024 | 85.8 | 118.2 | 32.4 | `#5b3c28` `#40291f` `#7f5638` `#9e704c` |
| fossil-wall | 1536×1024 | 74.8 | 104.8 | 30.3 | `#8b644d` `#2f1f1c` `#4e362b` `#71503e` |
| keepers-room | 1536×1024 | 90.9 | 125.6 | 25.8 | `#bd8b61` `#583a2a` `#694b3b` `#352722` |
| lake-at-dawn | 1536×1024 | 111.3 | 61.3 | **44.5** | `#413b34` `#b09e94` `#6a5b4e` `#74737b` |
| matching-signal | 1536×1024 | 81.7 | 97.1 | 26.9 | `#553d2f` `#916a4f` `#423533` `#5f4b44` |
| observatory | 1536×1024 | 74.3 | 113.5 | 30.4 | `#4c3224` `#836050` `#3a2b28` `#6d4a37` |
| porch-at-three-bells | **1024×1536** | 80.9 | 114.4 | 29.6 | `#4d3425` `#32211b` `#a47560` `#d8a273` |
| threshold | 1536×1024 | 81.2 | 91.9 | 29.7 | `#4d372c` `#373135` `#93705b` `#342520` |

**Finding 1 — the room is the wrong temperature.** Every exhibit is dominated by warm umber, amber and
muted bone: `#4d3425`, `#5b3c28`, `#8b644d`, `#bd8b61`, `#b09e94`. The WebGL room today renders
cool violet-indigo: floor `#3b3150`, wall `#241c33`, ambient `#9e92c4`, fill lights `#4a6baf` and
`#805186`. That is not a subtle mismatch — the room and its own paintings sit on opposite sides of the
colour wheel. This, more than any missing asset, is why the scene reads as layered rather than unified.

**Finding 2 — it is warm, not blue.** "Blue shingles" is an *accent*, not a field tone. Blue appears
nowhere in any exhibit's top five. A palette built around blue-shingle blue is a misreading of the art.

**Finding 3 — the exhibits are genuinely dim.** Mean luminance 74–111 out of 255. The dying-sun
reading is real and measurable. A room rendered brighter than its art will always look like a different
place; the target is *dark, warm, and glowing* rather than *bright*.

**Finding 4 — there is real ink.** Edge density 26–45 means meaningful linework, not soft painterly
wash. The idiom is ink-with-painterly-fill, which is exactly what cel shading plus outline approximates.
Lake-at-dawn is the outlier (brightest, least saturated, edgiest) and the plan must not flatten it.

**Finding 5 — one canvas is portrait.** Porch-at-three-bells is 1024×1536. The current art-plane sizing
rule (`Math.min(3.9, 3.2 * ratio)`) has no height cap, so that room will render its exhibit visibly
smaller or oddly proportioned against the other seven. A known, specific defect.

**Conclusion.** Congruency is not an asset problem. It is a *rendering* problem with a measurable
target. The eight paintings already agree with each other; the room is what disagrees.

---

## 1. The congruency contract

These are the checkable criteria. A room passes or fails; "looks nice" is not a criterion.

**Palette tokens (derived from measurement, not invention).**

```
ink            #1b1512   near-black warm, for outlines and deepest shadow
shadow_warm    #2f1f1c   from fossil-wall
mid_warm       #4d3425   the modal tone across the set
stone          #5b3c28   from broadcast-room
brass_mid      #8b644d   from fossil-wall
brass_lit      #bd8b61   from keepers-room
bone           #b09e94   from lake-at-dawn
highlight      #d8a273   from porch-at-three-bells
accent_cool    #74737b   from lake-at-dawn (the only sanctioned cool, and it is grey-violet)
glow_gold      #e0b75b   dying-sun emission
sky_deep       #232030   night field behind the sun
```

**Numeric gates, per captured room:**

1. Capture mean luminance within **70–115** (the exhibits' own band).
2. Mean saturation within **60–130**.
3. Share of pixels within the token set after palette-lock: **≥ 92%**.
4. Mean edge density **24–46** (ink present, not absent, not a wireframe).
5. Nearest-token distance for the room's modal colour: **≤ ΔE 12** from `mid_warm` or `stone`.
6. No cool pixel family exceeds **10%** of frame except in lake_at_dawn.

**Structural gates:**

7. Every room shows: wall, floor, a visible wall/floor junction, one framed exhibit, one standing
   relic-prop, one light source with a visible falloff.
8. Outline continuity: every hero silhouette carries an unbroken ink line at capture resolution.
9. The exhibit PNG is never recoloured, cropped, or overlaid. It is canonical.

**Character identity gates (added per decision 0a.2).** A generated Muse character passes only if all of
these hold, measured against `public/art/luma-canonical.jpg` and `public/art/luma-canon.json`:

10. **Silhouette IoU ≥ 0.80** against the canonical silhouette, at matched normalised scale, from three
    canonical camera angles (front, three-quarter, profile).
11. **Proportion drift ≤ 8%** on body height:width, head-to-body ratio, and limb length, versus canon.
12. **Part inventory complete** — hood fur ring, peach face, two black oval eyes, rosy cheeks, short
    rounded arms, short rounded feet, brass collar with central studs, starlight medallion, brown side
    pouch with lantern. Each is present or absent; a missing part fails the gate. This is a count, not
    an impression.
13. **Accessory palette lock** — collar and medallion brass within ΔE 10 of `brass_lit`/`glow_gold`;
    pouch within ΔE 12 of the brown leather tone; body cream within ΔE 10 of the canonical cream.
14. **Species consistency across the family** — every companion's body silhouette scores IoU ≥ 0.75
    against Luma's *accepted* mesh silhouette, so the family shares one species rather than four
    near-misses. Accessories differ; the body does not.

A character failing any gate is rejected and logged with the failing measurement, exactly like a prop.

---

## 2. Architecture: the five layers

| Layer | Supplies | Today | Verdict |
|---|---|---|---|
| **A. Tokens** | palette, light rig, camera, proportions | invented by prose, contradicts the art | **rebuild from measurement** |
| **B. Shading** | cel ramp, ink outline, palette lock | PBR + ACES, no outline | **missing — decisive** |
| **C. Atmosphere** | fog, glow, motes, grain, vignette | flat fog, stars | **missing** |
| **D. Geometry** | Tudor forms, shingles, stone, arches | generic box + plane | **missing** |
| **E. Props** | one relic-artifact per room | 1 of 8 | **partial, pipeline proven** |
| **F. Characters** | generated Muse figures under an identity gate | not started | **new — per decision 0a.2** |

Layer F is the highest-risk layer, because it is the only one where the generator is asked to reproduce
a specific identity rather than an idiom. It is therefore gated by measurement (§1 gates 10–14) rather
than by approval, and it runs *after* the props, which are a lower-risk rehearsal of the same pipeline.

Layers B and C are where the idiom is won. A photoreal PBR render of a perfect Tudor hall will still
not look like these paintings. Conversely, a mediocre box room under the right ramp, outline and
palette-lock will read as part of the set. Priority follows directly from that.

**The single most important mechanism: palette lock.** A post pass that snaps every rendered pixel to
the nearest entry in the token set guarantees palette congruency by construction. A generated prop
whose material drifts toward chrome still lands inside the family because the renderer moves it there.
This converts congruency from an outcome I hope for into a property of the pipeline.

---

## 3. Phases and gates

Each phase ends at a gate. No commit, no next phase, and no credit spend without operator review at
that boundary.

| Phase | Deliverable | Gate evidence |
|---|---|---|
| **0** | Token set + measurement harness | `scripts/art-palette-report.mjs` output; tokens committed |
| **1** | Stylization pipeline proven on the Observatory | 3 variants captured; one chosen against the exhibits numerically |
| **2** | Room architecture vocabulary, all 8 rooms | Capture sweep; contract gates 1–8 pass |
| **3** | Prop program: 7 remaining relics | Per-asset registry entries + captures |
| **3B** | The Muse characters: Luma, then her companions | Identity-gate table (gates 10–14) + in-room captures |
| **4** | Atmosphere depth + deliberate orbit framing | Default-framing captures for all 8 rooms |
| **5** | Full congruency audit + contact sheet | All 8 rooms pass every gate; publish decision |

---

## 4. Tasks

Tasks are ordered and bite-sized. Visual tasks replace the usual failing-test step with a **capture +
measurement** step, because that is the equivalent verification for this class of work — there is no
unit test that proves a room looks like its painting, but there is a palette distance.

### Phase 0 — Tokens derived from the artwork

#### Task 0.1: Commit the measurement script

**Objective:** Make the diagnosis reproducible rather than a one-off reading.

**Files:**
- Create: `scripts/art-palette-report.mjs`

**Step 1:** Write a script that walks `public/art/*.png`, and for each exhibit reports: canvas size,
mean luminance, mean saturation, mean edge density, and the top-8 quantised colours with shares.

Implementation note: no Pillow in the system Python. Use `uv run --python 3.12 --with pillow
--no-project python <script>` for the analysis path, or port to `sharp`/`jimp` under Node so it runs
without a Python toolchain. Node is preferred so the repo has one runtime.

**Step 2:** Run it.

Run: `node scripts/art-palette-report.mjs`
Expected: one row per exhibit, values matching Table §0 within rounding.

**Step 3:** Save the output to `docs/measured-exhibit-palette.md` so a future change is measured
against a recorded baseline.

**Step 4:** Commit.

#### Task 0.2: Write the token file

**Objective:** One source of truth for colour, shared by the 3D renderer and the Meshy style contract.

**Files:**
- Create: `src/style.tokens.json`
- Modify: `assets/meshy/style.json` (reference the token file rather than restating hexes)

**Step 1:** Encode the §1 palette, the light rig parameters, and the contract thresholds as data.

**Step 2:** Assert it parses and that every token is a valid 6-digit hex.

Run: `node -e "const t=require('./src/style.tokens.json'); const bad=Object.entries(t.palette).filter(([k,v])=>!/^#[0-9a-f]{6}$/.test(v)); if(bad.length) throw new Error(JSON.stringify(bad)); console.log('tokens ok', Object.keys(t.palette).length)"`
Expected: `tokens ok 12`

**Step 3:** Commit.

#### Task 0.3: Prove the tokens match the art

**Objective:** Fail loudly if a token stops representing the artwork.

**Files:**
- Create: `scripts/assert-token-agreement.mjs`

**Step 1:** For each token, find the nearest measured exhibit colour and report its distance.
**Step 2:** Fail if any token's nearest measured colour is further than a stated threshold, so the token
file cannot silently drift away from the art it claims to describe.
**Step 3:** Run and record. **Step 4:** Commit.

### Phase 1 — The stylization pipeline, proven on one room

#### Task 1.1: Add the postprocessing dependency and prove it runs headless

**Objective:** Establish that the chosen technique actually renders in the capture harness *before*
building on it.

**Files:**
- Modify: `package.json`

**Step 1:** `npm install @react-three/postprocessing`
**Step 2:** Add a trivial `EffectComposer` with a single `Vignette` to the Observatory scene.
**Step 3:** Capture with the standing headless command.

```sh
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new \
  --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1440,900 --virtual-time-budget=30000 --hide-scrollbars \
  --screenshot=/tmp/pp-test.png 'http://127.0.0.1:5173/muse-um/?room=observatory'
```

Expected: capture is non-trivial in size (>400 KB) and the vignette is visible.

**Step 4:** If postprocessing does not render under SwiftShader, stop and switch to the fallback plan
(per-material inverted-hull outlines, no full-screen passes) before writing anything else. **Do not
build four features on an unverified technique.** Commit either way, recording which path won.

#### Task 1.2: Port the fixed ASCII textures

**Objective:** A three-step cel ramp built from the token set, not from an imported asset.

**Files:**
- Create: `src/style/toonRamp.js`

**Step 1:** Generate a small `DataTexture` (e.g. 4×1 or 32×1) whose stops are `shadow_warm`, `mid_warm`,
`brass_lit`, `highlight`, so lighting quantises into the artwork's own tones.
**Step 2:** Assert the texture exists with the expected dimensions.
**Step 3:** Commit.

#### Task 1.3: Replace `meshStandardMaterial` with a shared stylized material

**Objective:** Every architectural surface uses one material factory, so no surface can escape the idiom.

**Files:**
- Create: `src/style/useMuseumMaterial.js`
- Modify: `src/SceneCanvas.jsx`

**Step 1:** Build `MeshToonMaterial` (or a custom shader) with the ramp from 1.2, `ink` shadows, and no
specular.
**Step 2:** Swap the floor, wall, dado rail, and frame in `SceneCanvas.jsx` to it.
**Step 3:** Capture and measure luminance/saturation against the §1 band.

Run the capture and then `node scripts/measure-capture.mjs /tmp/room.png`
Expected: luminance drifts toward 70–115, saturation toward 60–130 versus the current values.

**Step 4:** Commit.

#### Task 1.4: Ink outlines on hero silhouettes

**Objective:** The visible pen line the exhibits actually have (edge density 26–45).

**Files:**
- Create: `src/style/InkOutline.jsx`
- Modify: `src/SceneCanvas.jsx`

**Step 1:** Implement the verified technique from 1.1 — `OutlineEffect` with per-object opt-in, or
inverted-hull shells on the prop and exhibit frame.
**Step 2:** Give outlines a constant `ink` colour and a width that survives capture resolution.
**Step 3:** Capture; measure edge density.
Expected: edge density moves into 24–46 without exceeding it (a wireframe is a failure too).
**Step 4:** Commit.

#### Task 1.5: Palette lock pass

**Objective:** Guarantee palette congruency by construction.

**Files:**
- Create: `src/style/PaletteLockPass.jsx`
- Modify: `src/SceneCanvas.jsx`

**Step 1:** Implement a full-screen pass snapping each pixel to the nearest of the 12 tokens in a
perceptual space (OKLab or CIELAB, not raw RGB Euclid).
**Step 2:** Expose a strength uniform, because a fully locked image may band; start near 0.75.
**Step 3:** Capture; measure the share of pixels within the token set.
Expected: ≥ 92%.
**Step 4:** Commit.

#### Task 1.6: Grade the room to the exhibits' exposure

**Objective:** Match the measured dimness instead of fighting it.

**Files:**
- Modify: `src/SceneCanvas.jsx`, `src/style.tokens.json`

**Step 1:** Set tone mapping so a capture lands in 70–115 mean luminance.
**Step 2:** Re-place lights using tokens `glow_gold`, `highlight`, `accent_cool` — no violet.
**Step 3:** Capture and measure. **Step 4:** Commit.

#### Task 1.7: Produce three stylization variants and choose against the art

**Objective:** Resist the temptation to pick a look by feel.

**Files:**
- Create: `docs/phase1-variants.md`
- Modify: `src/style.tokens.json` (record the chosen variant and why)

**Step 1:** Parameterise the pipeline into three levels: **(A) painterly** (soft ramp, thin ink, low
lock), **(B) graphic-novel** (4-step ramp, firm ink, strong lock), **(C) woodcut** (2-step ramp, heavy
ink, full lock).
**Step 2:** Capture all three at identical camera and time.
**Step 3:** For each variant and each of the three exhibits that room most resembles, compute palette
distance and luminance/saturation error. Put both numbers in the table.
**Step 4:** Present all three captures plus the measurements, and **stop**. The operator chooses. My
expectation is B, but that is a hypothesis and the numbers plus the operator's eye decide it.
**Step 5:** Commit the chosen variant's parameters.

> **GATE 1.** No Phase 2 work until the variant is chosen. Everything downstream inherits it.

### Phase 2 — Room architecture, all eight rooms

#### Task 2.1: Author the architectural vocabulary as code

**Objective:** Replace generic box-and-plane with the exhibits' own architecture: French Tudor timber
framing, blue-shingle accents used sparingly, cut stone, arches, deep window reveals.

**Files:**
- Create: `src/rooms/RoomShell.jsx`
- Create: `src/rooms/parts/` (timberFrame, archBay, shingleBand, stoneCourse, windowReveal, lanternJamb)

**Step 1:** Build parametric parts with explicit dimensions in metres, not magic numbers.
**Step 2:** Assert each part's bounding box against its declared size.
**Step 3:** Commit.

#### Task 2.2: Fix the portrait exhibit

**Objective:** Close the known aspect defect before it is visible in seven rooms.

**Files:**
- Modify: `src/SceneCanvas.jsx`

**Step 1:** Size the art plane from both width and height caps derived from the texture aspect, so a
1024×1536 exhibit is framed correctly rather than shrunk.
**Step 2:** Verify by capture on `?room=porch_at_three_bells` against `?room=observatory`.
Expected: both exhibits read at comparable scale and neither distorts.
**Step 3:** Commit.

#### Task 2.3: Per-room variation within the contract

**Objective:** Eight rooms that feel like one building without being one image repeated.

**Files:**
- Modify: `src/pavilion.manifest.json` (add a `shell` block per room)
- Create: `src/rooms/shells.js`

**Step 1:** Give each room its own bay count, window placement, lantern count and waste height, drawn
from the idiom.
**Step 2:** Assert every room id in the manifest resolves to a shell definition (no fallback), because a
missing shell silently renders another room's architecture.
**Step 3:** Commit per room, or in one pass if the diffs stay legible.

#### Task 2.4: Room capture sweep

**Objective:** Measure all eight rooms against gates 1–6 and 7–8.

**Files:**
- Create: `scripts/capture-rooms.mjs`

**Step 1:** Drive the headless capture for every room id at a fixed camera and time.
**Step 2:** Emit a table of the six numeric gates per room, and a pass/fail summary.
**Step 3:** Report the failures; fix them; re-run. **Do not** proceed on a red gate.
**Step 4:** Commit.

> **GATE 2.** Present the eight captures and the gate table.

### Phase 3 — The prop program (seven remaining relics)

The props are the physical relics of the rooms' already-written relics. Each is a single instrument of
the town's keeping, which makes the set cohere as a *collection* rather than eight unrelated objects.

#### Task 3.1: Confirm the prop list and its mapping to declared relics

| room | declared relic | prop to generate |
|---|---|---|
| threshold | *(none declared)* | an unmarked threshold stone, no lettering at all |
| fossil_wall | the filed correction | a stone tablet with a corrected line kept beside the original |
| keeper_room | the keeper's lantern | a brass keeper's lantern with a pocket relic |
| matching_signal | the first matched reply | a matched pair of brass resonance elements |
| lake_at_dawn | the dawn water | a shallow bronze reflecting bowl on a low stand |
| porch_at_three_bells | the three-bell mark | three graduated bells on a timber yoke |
| observatory | a brass sight | *(done)* the armillary |
| broadcast_room | the first kept sending | a brass sending mouthpiece with coiled wire |

**Files:** Create one spec per prop under `assets/meshy/`.

**Step 1:** Write each spec with a prompt, a negative prompt that carries the lettering guard, and
tiered reject/accept criteria. **Step 2:** Dry-run every spec. Verify composed length ≤ 800.
**Step 3:** Commit the specs before generating anything.

#### Task 3.2–3.8: Generate the seven props

**Objective:** One prop per task, through the proven pipeline.

Per prop:
1. Dry-run preview; confirm composed length.
2. Submit preview (20 credits).
3. Poll, download render, review **form** at full frame *and* at a crop of the criteria's named part.
4. If rejected, log the defect in the spec's `reviewLog` and iterate the *prompt*, not the texture.
5. Submit refine (10 credits); review **material**.
6. `gltf-transform optimize` into `public/models/`.
7. Register in `public/agent/assets.json` with task ids, delivered triangle/byte counts, and the lossy
   disclosure.
8. Capture the room with the prop and re-measure the gates.
9. Commit.

**Known pitfalls to apply, from experience:** expect invented inscriptions on any plinth form and forbid
them twice; remember that lettering is usually geometry, so a re-refine cannot remove it; removing a
base's detail can remove the cue for the structure above it, so specify form *and* negative space
together; a prop carries its own base, so the room must not also supply a plinth; treat a `SUCCEEDED`
task as a produced file, never as an accepted artifact.

**Budget guard:** if any single prop exceeds four rejected passes, stop and report rather than continue
— that is a signal about the contract, not about that prop.

> **GATE 3.** Present the seven props, per-asset registry entries, and the updated gate table.

### Phase 3B — The Muse characters: Luma and her companions
*(inserted per decision 0a.2; runs before atmosphere, after the props)*

**Why this is viable.** The earlier refusal was written against *text-to-3D*, where the generator has
only prose and will invent whatever it cannot infer. Meshy also exposes **multi-image-to-3D**
(`POST /openapi/v1/multi-image-to-3d`), which accepts **1–4 images of one object** via `image_urls`
(http(s) URL or data URI) and can reuse a prior image set via `input_task_id`. Conditioning on real views
of the canonical art is a fundamentally different risk profile from describing her in words. Identity
risk is then handled by measurement (gates 10–14), not by declining to build.

#### Task 3B.1: Build the canonical turnaround sheet

**Objective:** Give the mesh generator real views of Luma, not a description of her.

**Files:**
- Create: `public/art/luma-turnaround/{front,three-quarter,profile}.png`
- Create: `assets/meshy/luma-turnaround.md` (the brief and its acceptance note)

**Step 1:** Using Codex `image_gen` with `public/art/luma-canonical.jpg` as the image input, produce
front, three-quarter and profile views of Luma: isolated single figure, flat uniform background, identical
scale and pose family across the three, full accessory set present (brass collar with central studs,
starlight medallion, brown side pouch with glowing lantern).
**Step 2:** This is *anchor to the canonical art*, never to a previous generation of Luma. A turnaround
briefed from an earlier Luma render reproduces that render's drift permanently.
**Step 3:** Review each sheet as an image against the §1 part inventory before use. Regenerate any view
missing a part.
**Step 4:** Commit.

#### Task 3B.2: Teach the Meshy client about multi-image input

**Objective:** One client, both endpoints, same secret discipline and dry-run gate.

**Files:**
- Modify: `scripts/meshy-submit.mjs`, `scripts/meshy-lib.mjs`

**Step 1:** Accept an `image_urls` array in the spec and resolve each local path to a data URI at call
time.
**Step 2:** Guard: refuse fewer than 1 or more than 4 images; assert each source file exists and is
`.png`/`.jpg`/`.jpeg`; fail with the actual byte size if a data URI exceeds the service's input limit
(verify that limit from the docs rather than assuming).
**Step 3:** The dry run prints the image **count and byte sizes**, never the base64 payload — printing a
multi-megabyte data URI into a terminal is its own defect.
**Step 4:** Commit.

#### Task 3B.3: Generate Luma

**Objective:** One canon-preserving character mesh, accepted only on measurement.

**Files:**
- Create: `assets/meshy/luma.json`
- Create: `public/models/luma.glb`

**Step 1:** Submit `multi-image-to-3d` with the turnaround set. Review **form** at full frame and at crops
of the head, the carried set, and the limb structure.
**Step 2:** Refine for material using the canonical palette (`brass_lit`, `glow_gold`, the cream body, the
brown pouch).
**Step 3:** `gltf-transform optimize` into `public/models/luma.glb`.
**Step 4:** Run the identity gate (3B.4). A character that fails is rejected and logged with the failing
measurement — not shipped with a caveat.
**Step 5:** Commit.

#### Task 3B.4: The identity gate (this is the mechanism that makes the override safe)

**Objective:** Turn "does that still look like Luma?" into five numbers.

**Files:**
- Create: `scripts/character-identity-gate.mjs`

**Step 1:** Render the candidate mesh from front, three-quarter and profile at fixed camera and
orthographic scale. Extract each silhouette (alpha or luminance threshold).
**Step 2:** Compute against the canonical art, posed to the same angles: silhouette **IoU** (gate 10).
**Step 3:** Compute **proportion ratios** — body height:width, head-to-body, limb length (gate 11).
**Step 4:** Emit a **part inventory table**: hood fur ring, peach face, two black oval eyes, rosy cheeks,
arms, feet, collar, medallion, pouch with lantern. Each row present/absent from a crop review (gate 12).
**Step 5:** Measure **accessory palette ΔE** against the token set (gate 13).
**Step 6:** Print a single pass/fail table. Exit non-zero on any failure so it can gate a commit.
**Step 7:** Run it against the *current* canon render first, so the harness is proven to pass a known-good
input before it judges anything. A gate that has never passed cannot be trusted to fail correctly.
**Step 8:** Commit.

#### Task 3B.5: Rig, animate — or say why not

**Objective:** Presence, if the body supports it.

**Files:** `assets/meshy/luma-rig.json`, `scripts/rig-and-animate.mjs`

**Step 1:** Meshy offers `POST /openapi/v1/rigging` (auto-rigging) and `POST /openapi/v1/animations`
(apply library actions). Check whether Luma's body qualifies — these target humanoid and quadruped
skeletons, and a small round plush may match neither.
**Step 2:** If it qualifies: rig (5 credits), then one or two idle actions (3 credits each), and play them
in the room.
**Step 3:** If it does not qualify: implement idle presence in the shader instead — a slow breathing
scale, a blink driven by swapping the eye region, a lantern glow pulse. **Do not spend rigging credits to
discover the body doesn't fit;** read the constraint first.
**Step 4:** Capture; record which path was taken and why.

#### Task 3B.6: The companions

**Objective:** A family that shares one species and differs in accessories, per the standing rule.

**Files:** one `assets/meshy/muse-<name>.json` per companion; `public/agent/muse-characters.json`

**Step 1:** For each companion, submit `multi-image-to-3d` with **Luma's accepted turnaround renders in
the image set** as the species anchor, plus that companion's own accessory description and palette.
**Step 2:** Gate 14 requires body-silhouette IoU ≥ 0.75 against Luma's accepted mesh — same creature,
different kit. Accessories are the only sanctioned divergence.
**Step 3:** Count is a gate decision (the earlier guidance was Luma plus 2–4, never a crowd).
**Step 4:** Register every character with its task lineage and gate results.
**Step 5:** Commit.

> **GATE 3B.** Present the identity-gate table for Luma, the companion set, and the captures showing them
> in rooms. No character enters a room on approval alone; the gate numbers come with it.

### Phase 4 — Atmosphere depth and the orbit

*(the walk track is dropped per decision 0a.3)*

#### Task 4.1: Volumetric atmosphere

**Files:** Create `src/style/Atmosphere.jsx`

**Step 1:** Exponential fog tinted `sky_deep`, a dying-sun disc with bloom behind the exhibit wall, and
slow drifting motes as instanced points.
**Step 2:** Assert the mote count is instanced (one draw call), not one mesh per mote.
**Step 3:** Capture and re-measure gates. Commit.

#### Task 4.2: Paper, ink and boil

**Files:** Modify `src/style.tokens.json`, create `src/style/SurfaceGrain.jsx`

**Step 1:** A subtle tiling grain multiplied over the frame, plus a low-amplitude time-varying offset on
the outline threshold so the line breathes the way a drawn line does.
**Step 2:** Prove the boil is present and bounded — capture two frames at different times and assert the
difference is small but non-zero. A static image under a "boil" name is a defect.
**Step 3:** Commit.

#### Task 4.3: Orbit framing, made deliberate

**Objective:** Orbit is the interaction, so the orbit has to be authored rather than merely enabled.

**Files:** Modify `src/SceneCanvas.jsx`

**Step 1:** Set per-room orbit constraints — min/max distance, polar limits, and a target that frames the
exhibit and the relic-prop together — so the default view is the composed view in every room.
**Step 2:** Add a "reset view" affordance, because an unconstrained orbit leaves the room unreadable
after one drag.
**Step 3:** Assert every room's default camera framing puts the exhibit and the prop both fully in frame,
measured from the projection of their bounding boxes, not by eye.
**Step 4:** Capture each room at its default framing. Commit.

> **GATE 4.** Present captures for all eight rooms at default framing, plus the atmosphere and grain
> changes.

### Phase 5 — Congruency audit and publish decision

#### Task 5.1: The contact sheet

**Objective:** One image where the eight exhibits and the eight room captures sit side by side, so
congruency is judged in the only comparison that matters.

**Files:** Create `scripts/congruency-sheet.mjs` → `docs/congruency-sheet.png`

**Step 1:** Compose 8 rows × 2 columns: exhibit PNG | room capture.
**Step 2:** Annotate each row with its six measured gates.
**Step 3:** Commit.

#### Task 5.2: Independent adversarial review

**Objective:** A hostile reader on the congruency claim, per standing practice before any commit that
publishes.

**Step 1:** Dispatch at least two independent reviews: one on aesthetic congruency (given the exhibits
and the sheet, judge *only* in the hand-drawn cosmic-mythic idiom and name every mismatch), one on
integrity (does any room claim more than its evidence supports; does any prop carry
artistic-interpretation status; is the lossy optimization disclosed; does the palette lock hide a
material defect).
**Step 2:** Every reproducible finding gets a fix or a recorded decision.
**Step 3:** Commit.

#### Task 5.3: Publish decision

**Step 1:** Present the sheet, the gate table, the credit ledger, and the bundle size.
**Step 2:** Stop. Publishing to the Ousia Research org page is the operator's call.

---

## 5. Files likely to change

**Create**
```
src/style.tokens.json                    the single source of truth for colour and rig
src/style/toonRamp.js                    token-derived cel ramp
src/style/useMuseumMaterial.js           one material factory for all architecture
src/style/InkOutline.jsx                 the pen line
src/style/PaletteLockPass.jsx            congruency by construction
src/style/Atmosphere.jsx                 fog, sun disc, motes
src/style/SurfaceGrain.jsx               grain and line boil
src/WalkControls.jsx                     first-person traversal
src/rooms/RoomShell.jsx                  parametric room
src/rooms/shells.js                      per-room shell definition
src/rooms/parts/*.jsx                    timber, arch, shingle, stone, window, jamb
assets/meshy/<prop>.json                 seven prop specs
scripts/art-palette-report.mjs           the measurement
scripts/assert-token-agreement.mjs       token drift guard
scripts/measure-capture.mjs              gate measurement on a capture
scripts/capture-rooms.mjs                the sweep
scripts/congruency-sheet.mjs             the side-by-side
docs/measured-exhibit-palette.md         recorded baseline
docs/phase1-variants.md                  the three-variant decision record
docs/congruency-sheet.png                the audit artifact
```

**Modify**
```
src/SceneCanvas.jsx                      the renderer rebuild
src/App.jsx                              walk mode, Luma presentation
src/Scene.css                            label panel, walk HUD
src/pavilion.manifest.json               per-room shell block
public/agent/pavilion.json               renderer description, prop registry links
public/agent/assets.json                 seven new entries
assets/meshy/style.json                  reference tokens rather than restating them
package.json                             postprocessing dependency
```

---

## 6. Verification protocol

For every visual change, in this order:

1. **Build.** `npm run build` — exits 0.
2. **Capture.** Headless Chrome at a fixed camera and time, `--virtual-time-budget=30000`.
3. **Measure.** Luminance, saturation, edge density, palette share, nearest-token distance.
4. **Compare.** Against the exhibit the room is paired with, not against a general impression.
5. **Judge in the idiom.** When using a vision review, instruct it explicitly to judge as a hand-drawn
   cosmic-mythic graphic-novel illustration. A general-purpose reviewer defaults to photorealism and
   will report deliberate stylization as a defect — while reliably catching *design* faults
   (unreadable silhouette, unlit object, collision), which is what to weight.
6. **Re-capture after every composition change.** Read the capture, not the source.

A served asset is not a drawn asset. A `200` on a `.glb` proves reachability and nothing about the
render. Only the capture is evidence.

---

## 7. Budget

**Mesh credits.** 7 props × (20 preview + 10 refine) = 210. The first asset took six passes before
acceptance; with the contract now carrying the lettering and form lessons, assume 1.5–2× on early
props tapering to 1×. **Planning figure: 320–420 credits.** Current balance is ~3310, so this is not a
constraint — the constraint is review attention, not credits.

**Operator attention.** Four gates (1, 2, 3, 4) each need a real look. That is the actual cost.

**Runtime performance.** Postprocessing plus outlines at 1440p is the main risk. Mitigations: outlines
opt-in per hero object rather than global; palette lock as one pass; motes instanced; a `dpr` cap of
1.75 already in place. Measure frame time at 1440×900 and record it; if under 45 fps, degrade the
palette lock to a per-material approximation on props only.

---

## 8. Risks, honest failure modes

| Risk | Why it matters | Mitigation |
|---|---|---|
| Postprocessing doesn't render under SwiftShader | The only verification path goes blind early | Task 1.1 tests it *first*; documented fallback is inverted-hull outlines with no full-screen passes |
| Palette lock bands or looks cheap | A posterised image reads as a compression fault, not a style | Strength uniform, start 0.75, judge at capture resolution, three variants in 1.7 |
| Over-stylizing kills the museum feel | The project is a museum, not a comic | Variant comparison includes a painterly option; the operator picks |
| Toon shading fights the painterly exhibits | Rooms and art could diverge in the opposite direction | The exhibits are never recoloured; the room moves to the art, never the reverse |
| Prop drift across seven assets | The characteristic failure of a generated set | Palette lock plus one style contract plus per-asset review against the token set |
| Scope creep into a full engine rewrite | This is a plan for congruency, not for a game | Phases are gated; each phase ships a visible improvement on its own |
| Character identity drift | A generated Luma that reads as a near-miss damages the canon permanently | Multi-image conditioning on the canonical turnaround; gates 10–14; reject rather than ship-with-a-caveat |
| The body won't rig | Round plushes may match neither the humanoid nor quadruped skeleton | Read the rigging constraint before spending; documented shader-idle fallback |
| Companion set drifts into four species | "Same creature, different accessories" fails silently across separate generations | Each companion conditions on Luma's accepted renders, and gate 14 measures body IoU against her |
| Optimising for a metric over the look | A passing number with a worse image is still a worse image | Numbers gate, the eye decides; measurement cannot rule on whether a room is beautiful, only on whether it matches |

---

## 9. Explicit non-goals

- Do not regenerate or recolour any exhibit PNG. They are canonical and approved.
- Do not generate a canon character **from text alone**, or without a passing identity gate. Multi-view
  conditioning on the canonical art plus gates 10–14 is the minimum bar (Phase 3B). Generating Luma is
  sanctioned; generating *a Luma-shaped object* and calling it Luma is not.
- Do not replace framed exhibits with generated scenes.
- Do not treat a passing gate as a finished room.
- Do not publish, push to `ousiaresearch/muse-um`, or spend beyond the approved prop batch without an
  explicit word at a gate.
- Do not port to a game engine, add physics, or build multiplayer to chase "more 3D".

---

## 10. Open questions for the operator

### Resolved 2026-09-29

1. ~~**Stylization variant.**~~ **Resolved: painterly.** Task 1.7's three-variant comparison still runs,
   but painterly is the target and the other two become reference points. See §0a.1.
2. ~~**Luma in 3D.**~~ **Resolved: Luma and the Muse companions are generated** via multi-image-to-3D
   conditioned on canonical art, admitted only on identity gates 10–14. See §0a.2 and Phase 3B.
3. ~~**Walk vs orbit.**~~ **Resolved: orbit.** The walk track is dropped; orbit framing is authored per
   room instead (Task 4.3). See §0a.3.

### Still open

4. **Palette lock strength.** A hard lock guarantees palette congruency and costs tonal subtlety. Willing
   to lose some gradient range for a guaranteed match? Painterly is the ruling, which argues for a
   *moderate* lock — a hard lock is closer to a woodcut read.
5. **How many companions?** Earlier guidance was Luma plus 2–4, never a crowd. If the answer is per-room,
   that is up to 8 distinct figures to generate, gate and register. Worth the budget, or a smaller
   recurring cast that recurs across rooms?
6. **Rigging.** Meshy can auto-rig and apply library animations. If Luma's body qualifies, an idling Luma
   in the room is a large presence gain. Do we spend the credits to find out, or proceed with shader-based
   idle and revisit?
7. **Does Luma stand in the rooms, or is she a presence?** A generated mesh in every room risks becoming
   furniture. A single Luma who appears in some rooms and is absent from others may hold more weight.
8. **Contingency if the identity gate cannot be met.** If multi-image conditioning cannot hold the canon
   at IoU 0.80, the honest options are: relax the gate *with your ruling and a recorded reason*, carry the
   identity in texture rather than geometry and accept lower fidelity, or fall back to authored geometry.
   Which do you want if we hit that wall?
9. **Prop scale and count.** One relic per room is the plan. Some rooms could carry two or three
   instruments as a small display. Worth it, or does it crowd?
10. **Is `accent_cool` sanctioned at all?** Lake-at-dawn is the only exhibit with a genuinely cool
    register. Should the pavilion hold one cool room as a deliberate contrast, or keep every room warm?

---

## 11. Recommended first move

Execute Phase 0 and Task 1.1 only, then stop and report. That is roughly an hour of work, spends **zero
credits**, and answers the two questions that could invalidate the rest of the plan: whether the
palette measurement reproduces, and whether the postprocessing technique this whole approach depends on
survives the only verification environment available. Everything else is downstream of those two
answers.
