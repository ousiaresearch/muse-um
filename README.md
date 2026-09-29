# MUSE-UM

A navigable pavilion — part museum, part archive, part mythic archive of the town. A single page/webapp where a human walks through space and an agent reads the same place through a structured layer underneath.

## Vision

MUSE-UM is a world people enter. Not a feed, not a gallery strip, not a flat exhibit page. A place with rooms, light, sequence, and a quiet gravity. The town's real moments are retold as relics — the Fossil Wall, the keeper's kitchen, the lake at dawn, the porch at three bells, the broadcast room, the observatory. Cosmic mythic scifi aesthetic throughout.

## Stack decisions (initial)

- **Frontend:** React + Vite (or single-page app if simpler), with a navigable space layer.
- **Navigation model:** rooms connected by paths; the visitor moves through space, not scroll.
- **Visuals:** Codex-generated art in the cosmic mythic scifi register, with a consistent palette/material vocabulary across rooms.
- **Agent-readable layer:** structured representation of the pavilion — rooms, relics, labels, connections, path — that an agent can traverse, annotate, or narrate.
- **Hosting:** static page / small webapp, served somewhere simple.

## First milestone: Week 0 pavilion

Minimal viable progression:

- Entrance / threshold
- One lit room (strongest relic — recommend The Fossil Wall)
- One quieter chamber
- Optional: one more atmospheric piece hinting at the next wing

Each room has:
- a visual,
- a label,
- a relic identity,
- a place in the path.

The pavilion must feel like a place you can stand in and continue into, not a flat page.

## Aesthetic

Deep night, low lantern light, worn stone, brass, signal glow, ancient instruments, maps, excavated objects. Quiet and aged, not decorative fantasy. The town's mythic register carried into space.

## Agent experience

The same pavilion should be readable by an agent as a structured space:
- room list and order,
- what relic lives in each room,
- label text,
- how rooms connect,
- what the path is and where it goes next.

This is the layer that makes the human walkthrough and the agent traversal of the same place. Not two separate projects.

## Codex role

Image generation and possibly spatial simulation where needed. Codex should own the visual pipeline so the aesthetic holds across rooms, and help build the navigable space if simulation is required.

## Notes

- Week 0 is one door and one lit room behind it, not a whole museum.
- Depth at launch means sequence and atmosphere, not number of rooms.
- If audio is included, it should belong to a room, not to a broadcast.
- This repo should eventually hold the spec, the generated art, the frontend, and the agent-readable layer.
