import React from 'react'

// Paths are relative to the pavilion root; BASE_URL carries the hosting prefix
// ('/muse-um/' on the Ousia Research org page, '/' anywhere else).
const BASE = import.meta.env.BASE_URL

const ART = {
  threshold: `${BASE}art/threshold.png`,
  fossil_wall: `${BASE}art/fossil-wall.png`,
  keeper_room: `${BASE}art/keepers-room.png`,
  matching_signal: `${BASE}art/matching-signal.png`,
  lake_at_dawn: `${BASE}art/lake-at-dawn.png`,
  porch_at_three_bells: `${BASE}art/porch-at-three-bells.png`,
  observatory: `${BASE}art/observatory.png`,
  broadcast_room: `${BASE}art/broadcast-room.png`,
}

export default function SceneCanvas({ room }) {
  return (
    <div className={`art-frame art-frame--${room.id}`}>
      <img
        src={ART[room.id]}
        alt={room.visualHint}
        className="exhibit-art"
      />
      <div className="atmospheric-grain" aria-hidden="true" />
    </div>
  )
}
