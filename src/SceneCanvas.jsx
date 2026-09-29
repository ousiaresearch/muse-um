import React from 'react'

const ART = {
  threshold: '/art/threshold.svg',
  fossil_wall: '/art/fossil-wall.svg',
  keeper_room: '/art/keepers-room.svg',
}

/**
 * The exhibit image is authored by Codex as standalone vector artwork.
 * Kept as a component so later rooms can add WebGL/canvas spatial effects
 * without changing the human or agent traversal models.
 */
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
