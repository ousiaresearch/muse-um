import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/**
 * Readiness signal for the capture harness.
 *
 * A timer is the wrong instrument for deciding when a WebGL scene is ready: the
 * page can finish loading long before a model has been decoded and a frame drawn,
 * and it can also still be grinding frames long after a timer fires. The scene
 * itself knows, so it says so.
 *
 * Diagnostics are collected here too, on purpose. When a capture comes back blank
 * the useful question is "did the page error, or did it render nothing?", and
 * that is only answerable if the errors were being recorded the whole time.
 */
if (typeof window !== 'undefined') {
  window.__museDiagnostics = window.__museDiagnostics || { errors: [], ready: false }
  window.__museReady = window.__museReady === true

  const record = (entry) => {
    if (window.__museDiagnostics.errors.length < 25) {
      window.__museDiagnostics.errors.push(entry)
    }
  }

  window.addEventListener('error', (event) => {
    record(`${event.message || 'error'} @ ${event.filename || '?'}:${event.lineno || 0}`)
  })
  window.addEventListener('unhandledrejection', (event) => {
    record(`unhandled rejection: ${String(event.reason)}`)
  })
}

export function ReadySignal({ frames = 4 }) {
  const drawn = useRef(0)
  const { gl } = useThree()

  useFrame(() => {
    drawn.current += 1
    if (drawn.current !== frames) return

    const context = gl.getContext()
    window.__museDiagnostics.canvas = `${gl.domElement.width}x${gl.domElement.height}`
    window.__museDiagnostics.webgl = context ? context.getParameter(context.VERSION) : 'no context'
    window.__museDiagnostics.framesRendered = frames
    window.__museDiagnostics.errorsAtReady = window.__museDiagnostics.errors.length
    window.__museReady = true
  })

  return null
}
