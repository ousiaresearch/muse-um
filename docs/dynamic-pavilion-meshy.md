# Dynamic pavilion and the Meshy asset pipeline

## What is dynamic now

MUSE-UM's room surface is a WebGL gallery built with React Three Fiber. Visitors orbit and zoom inside each room while the framed exhibit remains the room's canonical PNG. WebGL is the spatial layer, not a replacement for the artwork.

An optional generated GLB may stand on the room floor as an environmental artifact. Every such asset is registered in `public/agent/assets.json` with its generator lineage and acceptance review, carries artistic-interpretation status, and never replaces framed art or upgrades a room's `evidenceStatus`.

## Credential boundary

The Meshy key lives in the Hermes secrets file (`~/.hermes/.env`, or `$HERMES_HOME/.env` under a profile) as `MESHY_API_KEY`. It is server-side operational material:

- never put it in `VITE_*`, source, JSON contracts, or Git;
- never paste it into chat or a commit message;
- `scripts/meshy-lib.mjs` resolves it from the process environment first, then the secrets file, and prints only a masked form.

A key is read at call time by `scripts/meshy-*.mjs`. No per-session `export` is needed.

## The two-stage generation contract

Meshy Text to 3D is two billed requests:

1. **preview** — geometry only, no texture. 20 credits at `meshy-7.1` / `standard`. The render comes back untextured grey; that is normal and is not a style failure.
2. **refine** — texture applied to an accepted preview mesh, via `preview_task_id`. 10 credits at 2K. Optionally 5 more for `geometry_resolution: "2k"` on the preview.

`assets/meshy/style.json` carries a shared suffix for each stage, so every prop inherits one material and form language. `scripts/meshy-submit.mjs` composes the asset's own text with the correct suffix and refuses to send a payload over Meshy's 800-character limits.

## Review-before-spend workflow

```sh
node scripts/meshy-submit.mjs assets/meshy/<asset>.json --stage preview           # dry run
node scripts/meshy-submit.mjs assets/meshy/<asset>.json --stage preview --submit  # spends 20
node scripts/meshy-poll.mjs <taskId> --spec assets/meshy/<asset>.json             # poll, download nothing
# review the rendered preview against the asset's own tiered criteria
node scripts/meshy-submit.mjs assets/meshy/<asset>.json --stage refine --submit   # spends 10
node scripts/meshy-poll.mjs <taskId> --spec assets/meshy/<asset>.json --download  # fetch GLB
```

A dry run makes no network request. `--download` is the only path that writes a GLB.

## Hard-won generator behaviour

These were found by generating, not by reading the docs. They are recorded in `style.json` invariants so they carry to every future asset.

- **Invented pseudo-inscriptions are a default.** Plinth-like forms come back with lettering that is not requested: the first armillary passes read `ΠΙ` and `HULAST`, and a re-refine returned `IU` and `RILAST`. The generator adds writing unless explicitly forbidden in both the prompt and the negative prompt.
- **That lettering lives in the geometry, not the texture.** Re-refining the same mesh kept it. Clearing it required a new preview whose base had no flat panel or banded tier for writing to occupy.
- **Removing the lettering removed the form.** The base fix made the model build two concentric nested rings joined by a drum of struts, so the four armillary rings stopped crossing on different axes. Form and negative space must be specified in the same breath: name the openness, negate the cage.
- **`target_polycount` is ignored unless it can act.** On a `standard` model it only applies with `should_remesh: true`; otherwise the model decides. Raw output was 388,978 triangles at 19.2 MB.
- **Finished brass still comes back semi-gloss.** The material stage will not deliver a matte museum finish. Apply it in-engine from the asset's own roughness map instead of regenerating.
- **Signed asset URLs expire.** Never store `thumbnail_url` or `model_urls` truncated at the `?` — that strips the signature and the download 403s. Re-read the task to get a fresh signed URL.

## Local optimization step

Raw GLBs are far too heavy for a museum page. Optimization is local and free:

```sh
npx gltf-transform optimize <raw>.glb public/models/<name>.glb \
  --compress quantize --simplify true --simplify-error 0.001 \
  --texture-size 1024 --texture-compress webp
```

The first armillary went 20.14 MB → 597 KB, 388,978 → 11,996 triangles, using only `EXT_texture_webp` and `KHR_mesh_quantization` — both natively supported by three's loader, so no extra decoder is needed. This step is **lossy** and is disclosed in the asset registry; the delivered mesh is not presented as the generator's raw output.

## In-engine material handling

The GLB's own PBR maps are used; the pavilion then raises roughness, caps metalness, and sets `envMapIntensity`. Reflections come from a locally generated environment (`RoomEnvironment` through `PMREMGenerator`) — no HDRI download. Without an environment map a metal surface renders black no matter how many lights are added.

Note for three r155+: light intensities are physically correct and fall off with distance squared, so intensities are an order of magnitude higher than legacy values would suggest.

## Verification

The room is verified by real rendered capture, not by asset presence:

```sh
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new \
  --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1440,900 --virtual-time-budget=30000 --hide-scrollbars \
  --screenshot=/tmp/room.png 'http://127.0.0.1:5173/muse-um/?room=observatory'
```

An HTTP 200 on a `.glb` proves the file is served, not that it draws. A capture proves it draws.

## Explicit non-goals

- Do not replace framed exhibit PNGs with generated scenes.
- Do not generate canonical characters; Luma's body is fixed by `public/art/luma-canon.json`.
- Do not expose the Meshy key to visitors or agents.
- Do not treat a `SUCCEEDED` task, or a live URL, as curatorial acceptance.

## Current status

- WebGL pavilion: implemented; production build passes.
- Credential: secured in the Hermes secrets file; authorization confirmed against the Meshy balance endpoint.
- Assets accepted: 1 — the Observatory armillary, integrated into its room and verified by rendered capture.
- Assets rejected: 5 passes, each logged with its failing defect in the asset spec.
