import React from 'react'
import './Scene.css'
import SceneCanvas from './SceneCanvas'
import manifest from './pavilion.manifest.json'

// Pavilion-relative paths in the manifest are resolved against the hosting prefix.
const BASE = import.meta.env.BASE_URL

export default function App() {
  // A room can be linked directly: ?room=fossil_wall. Unknown values fall back to
  // the entry room rather than rendering an empty pavilion.
  const requested = new URLSearchParams(window.location.search).get('room')
  const entryRoomId = manifest.rooms.some((r) => r.id === requested)
    ? requested
    : manifest.rooms[0].id
  const [currentRoomId, setCurrentRoomId] = React.useState(entryRoomId)
  const [showAgentTrail, setShowAgentTrail] = React.useState(false)

  React.useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('room', currentRoomId)
    window.history.replaceState({}, '', url)
  }, [currentRoomId])

  const roomMap = React.useMemo(() => {
    const map = {}
    for (const room of manifest.rooms) map[room.id] = room
    return map
  }, [])

  const currentRoom = roomMap[currentRoomId] || manifest.rooms[0]
  const roomIds = manifest.rooms.map((r) => r.id)
  const otherRoomIds = roomIds.filter((id) => id !== currentRoomId)
  const prev = roomIds.indexOf(currentRoomId) - 1
  const next = roomIds.indexOf(currentRoomId) + 1

  return (
    <div className="app">
      <div className="title-bar">
        <div className="title-bar-name">{manifest.building.name}</div>
        <div className="title-bar-note">{manifest.building.openingNote.split('\n')[0]}</div>
      </div>

      <div className="luma-presence" aria-label="Luma, the MUSE-UM guide, curator, and companion">
        <img src={`${BASE}${manifest.building.guide.canonicalReference}`} alt="Luma, the MUSE-UM guide" />
        <div>
          <div className="luma-presence-name">{manifest.building.guide.name}</div>
          <div className="luma-presence-role">{manifest.building.guide.role.join(' · ')}</div>
        </div>
      </div>

      <article className="scene">
        <div className="scene-inner">
          <div className="scene-canvas-wrap">
            <SceneCanvas room={currentRoom} />
          </div>
          <div className="scene-label">
            <div className="scene-label-name">{currentRoom.name}</div>
            <div className="scene-label-text">
              {currentRoom.label.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {i > 0}<br />
                  {line}
                </React.Fragment>
              ))}
            </div>
            {currentRoom.relic && (
              <div className="scene-label-relic">relic · {currentRoom.relic}</div>
            )}
            {currentRoom.provenance && (
              <div className={`scene-label-prov is-${currentRoom.provenance.kind}`}>
                <span>
                  {currentRoom.provenance.kind === 'source-attached'
                    ? `${currentRoom.provenance.prefix} · musebook ${currentRoom.provenance.ids.length > 1 ? 'posts' : 'post'} `
                    : `${currentRoom.provenance.prefix} `}
                </span>
                {currentRoom.provenance.ids.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {i > 0 && ', '}
                    <a href={s.url} target="_blank" rel="noreferrer">{s.id}</a>
                  </React.Fragment>
                ))}
                {currentRoom.provenance.authors && (
                  <span className="prov-author"> · {currentRoom.provenance.authors}</span>
                )}
                <span className="prov-note"> — {currentRoom.provenance.note}</span>
              </div>
            )}
          </div>
        </div>
      </article>

      <div className="controls">
        <div className="controls-left">
          <div className="path-hint">
            {manifest.paths
              .filter((p) => p.from === currentRoomId)
              .map((p) => p.label)
              .join(' · ') || 'no path from here'}
          </div>
          <div className="path-tabs">
            {otherRoomIds.map((id) => {
              const room = roomMap[id]
              const connected = currentRoom.connections.includes(id)
              return (
                <button
                  key={id}
                  className={`path-tab ${connected ? 'active' : ''}`}
                  disabled={!connected}
                  onClick={() => setCurrentRoomId(id)}
                  title={
                    connected
                      ? `${room.name} — ${manifest.paths.find((p) => p.from === currentRoomId && p.to === id)?.label || ''}`
                      : 'not connected'
                  }
                >
                  {room.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="controls-right">
          <button
            className="nav-btn"
            disabled={prev < 0}
            onClick={() => setCurrentRoomId(roomIds[prev])}
          >
            ← back
          </button>
          <button
            className="nav-btn"
            disabled={next >= roomIds.length}
            onClick={() => setCurrentRoomId(roomIds[next])}
          >
            next →
          </button>
          <label className="agent-trail-toggle">
            <input
              type="checkbox"
              checked={showAgentTrail}
              onChange={(e) => setShowAgentTrail(e.target.checked)}
            />
            show agent layer
          </label>
        </div>
      </div>

      {showAgentTrail && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 4,
            background: 'rgba(10, 10, 18, 0.15)',
          }}
        />
      )}

      {showAgentTrail && (
        <div
          style={{
            position: 'absolute',
            top: '2.2rem',
            right: '2.5rem',
            maxWidth: 320,
            background: 'rgba(10, 10, 18, 0.85)',
            border: '1px solid rgba(150, 140, 180, 0.2)',
            padding: '0.9rem 1.2rem',
            zIndex: 5,
            fontFamily: "'Courier New', monospace",
            fontSize: '0.72rem',
            lineHeight: 1.5,
            color: '#c0b8d0',
            overflow: 'auto',
          }}
        >
          <div style={{ color: '#9a8fb0', marginBottom: '0.5rem' }}>
            agent layer — {currentRoom.id}
          </div>
          <div style={{ color: '#e8e4dc' }}>
            <div>connections: {currentRoom.connections.join(', ') || 'none'}</div>
            {currentRoom.relic && (
              <div>relic: {currentRoom.relic}</div>
            )}
            <div style={{ color: '#b8aec8', marginTop: '0.4rem' }}>
              paths from here:
            </div>
            {manifest.paths
              .filter((p) => p.from === currentRoomId)
              .map((p) => (
                <div key={p.to} style={{ color: '#c0b8d0' }}>
                  → {roomMap[p.to].name} — {p.label}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
