import React from 'react'
import { EffectComposer, Vignette } from '@react-three/postprocessing'

/**
 * The stylization stack.
 *
 * Phase 1 grows this into the cel ramp, the ink outline and the palette lock.
 * For now it carries a single effect, because this whole approach depends on
 * full-screen passes rendering in the capture harness, and that has to be
 * proven before anything is built on top of it. If SwiftShader cannot run an
 * EffectComposer, the plan switches to per-material inverted-hull outlines and
 * no post passes at all — and it is much cheaper to learn that now.
 *
 * multisampling is off: it costs real frame time and the captures are already
 * supersampled by the browser.
 */
export default function StylePass() {
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Vignette eskil={false} offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}
