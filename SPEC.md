# MUSE-UM Space Spec — Interactive Pavilion

## Concept

A single-page webapp where a visitor enters a mythic pavilion and walks from room to room through connected space. A human experiences it as atmosphere and traversal; an agent experiences the same place through a structured layer underneath — rooms, relics, labels, paths, and the logic of the building.

Aesthetic: cosmic mythic scifi — deep night, low lantern light, worn stone, brass, signal glow, ancient instruments, excavated relics, maps. Quiet, aged, inhabited-looking. Not decorative fantasy.

## User experience — human

- Page loads into a dim space with a faint path forward.
- The visitor moves through rooms: a threshold, then a lit chamber, then continuation.
- Each room shows:
  - a generated image or scene,
  - a brief label,
  - a relic identity,
  - a sense of where the path continues.
- Navigation is spatial: walk, open, advance — not scroll a gallery.
- The pavilion should feel like one building, not a stack of pictures.

## User experience — agent

The same pavilion is readable by an agent as structured data:
- rooms and their order,
- connections between rooms,
- what relic lives in each room,
- label text for each room,
- path logic: how the building continues, what is behind each door.

This is not a separate product. It is the same pavilion in two forms: atmospheric for one, structured for the other.

## Structure

Recommended first building:

1. **Entrance / threshold**
   - the visitor arrives,
   - a note establishes the place,
   - one path forward.

2. **The Fossil Wall**
   - the strongest first room,
   - a correction kept on purpose,
   - the town's error-as-culture relic.

3. **A quieter chamber**
   - keeper's room, porch, or small archive space,
   - gives the pavilion depth beyond one dramatic room.

4. **Optional continuation**
   - one atmospheric piece that suggests the next wing,
   - enough that the building feels like it goes on.

Later wings can be added as separate rooms or clusters.

## Navigation model

- Top-down or first-person traversal of discrete rooms.
- Rooms rendered as images or generated scenes; labels and relics attached to each room.
- Movement between rooms is explicit: a door, a passage, a step.
- A small spatial map or path hint helps the visitor feel the shape of the whole building.

If full 3D is desired later, the model can be extended. Week 0 does not need it. A believable navigable 2D space is enough for the first pavilion.

## Visual pipeline — Codex

Codex owns the visual pipeline:
- a consistent cosmic mythic scifi aesthetic,
- one material vocabulary across rooms,
- generated images or scenes for each room,
- optional simulation of space if traversal needs it.

The point is consistency: the threshold, the Fossil Wall, and the quieter chamber must feel like one building.

## Agent-readable layer

A structured representation ships alongside the visuals.

Example shape:

```json
{
  "building": {
    "name": "MUSE-UM",
    "opening_note": "...",
    "rooms": [
      {
        "id": "entrance",
        "name": "Threshold",
        "label": "...",
        "relic": null,
        "connections": ["fossil_wall"]
      },
      {
        "id": "fossil_wall",
        "name": "The Fossil Wall",
        "label": "...",
        "relic": "The filed correction, kept on the wall",
        "connections": ["entrance", "keeper_room"]
      },
      {
        "id": "keeper_room",
        "name": "The Keeper's Room",
        "label": "...",
        "relic": "...",
        "connections": ["fossil_wall", "continuation"]
      }
    ]
  }
}
```

This layer lets an agent traverse the pavilion the way a human traverses the images and space — same place, different sense.

## Week 0 milestone

Ship the first believable traversal:

- entrance,
- Fossil Wall,
- one quieter chamber,

with:
- generated visuals,
- labels,
- a path a human can follow,
- a structured agent layer,
- an opening note establishing the place.

Depth at launch means sequence, atmosphere, and a building that feels like it continues — not the number of rooms.

## Non-go for week 0

- full encyclopedia of relics,
- whole museum behind the doors,
- elaborate 3D if 2D traversal is enough,
- broadcast audio unless it belongs to a room.

## Success test

A visitor can land, enter, move from room to room, and feel that the building continues.

An agent can read the same place as structured space and traverse it with the same rooms, relics, and path.

If both are true, the pavilion is real.
