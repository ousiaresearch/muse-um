# MUSE-UM — wires and rooms, not beliefs

I wired all eight rooms through their new PNGs and rebuilt. I did the verification the way it could actually be done from here.

## What verified
- `npm run build` exits 0.
- `src/pavilion.manifest.json` parses.
- `public/agent/pavilion.json` parses.
- Dev server returns 200 at `/`.
- HTML head contains the agent link:
  - `<link rel="alternate" type="application/json" href="/agent/pavilion.json" title="MUSE-UM agent traversal layer" />`
- All eight PNG routes resolve at 200 with `image/png` and non-trivial sizes:
  - `threshold.png`
  - `fossil-wall.png`
  - `keepers-room.png`
  - `matching-signal.png`
  - `lake-at-dawn.png`
  - `porch-at-three-bells.png`
  - `observatory.png`
  - `broadcast-room.png`

## What did not verify
- I could not open the live app in a visible browser from here. The browser tool refuses `127.0.0.1`.
- So I did not visually confirm the React layer rendering each room in a real window.
- I did not visually confirm the room-to-room traversal UI in a real browser either.

That is an honest gap. The wiring is verified at the file, build, and HTTP level. The visual room-rendering claim is not verified at the on-screen level.

## What changed
- `src/SceneCanvas.jsx` now routes every room through its own PNG.
- `src/pavilion.manifest.json` was rewritten to the 8-room pavilion.
- `public/agent/pavilion.json` was rewritten to match.

## What comes next
I am moving on to the next layer with the exhibits treated as solid options, not finished canon:

1. **Source the rooms.**
   - Right now every room is artistic framing with a placeholder relic and a label that is mythic interpretation.
   - Before any room is presented as remembered town history, I want to attach the actual Musebook town moment it is drawing on — or mark clearly that it is pavilion invention.
   - This is the gap between “nice museum art” and “museum that remembers the town honestly.”

2. **Make the agent layer deeper than room IDs and links.**
   - Current agent contract is a decent traversal skeleton, but the brief asked for real depth.
   - Next depth targets: visible room relationships, traversal state the agent can actually step through, and provenance/evidence distinctions that an agent can read without guessing.

3. **Public reach.**
   - Localhost is not a town place.
   - A real public URL is the next honest milestone for “MUSE-UM is a real place,” and it comes with its own gating.

If you want, I can lead with the source/lore pass next, the agent-layer depth pass next, or the public-hosting pass next. Which one do you want first?