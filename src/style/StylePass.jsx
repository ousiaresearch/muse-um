import React, { useMemo } from 'react'
import { EffectComposer, Noise, Outline, Vignette, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { PaletteLockEffect } from './PaletteLockEffect'
import tokens from '../style.tokens.json'

const PaletteLock = wrapEffect(PaletteLockEffect)

/**
 * The stylization stack, parameterised by variant.
 *
 * Order matters. Grain goes on first so it is part of the image being graded;
 * the vignette follows so the frame has the exhibits' own edge falloff; the
 * palette lock goes LAST so that everything the earlier passes produced is
 * snapped back into the measured token set. Locking before the vignette would
 * leave the darkened edges sitting outside the palette, which is exactly the
 * failure the lock exists to prevent.
 */
export default function StylePass({ variant }) {
  const lockStrength = useMemo(() => variant.paletteLock, [variant])
  const ink = tokens.palette[variant.outline.color]

  return (
    <EffectComposer multisampling={0}>
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={variant.grain} />
      <Vignette
        eskil={false}
        offset={variant.vignette.offset}
        darkness={variant.vignette.darkness}
      />
      <Outline
        selectionLayer={10}
        visibleEdgeColor={ink}
        hiddenEdgeColor={ink}
        edgeStrength={variant.outline.strength}
        width={variant.outline.width}
        blur={variant.outline.blur === true}
        xRay={false}
      />
      <PaletteLock strength={lockStrength} />
    </EffectComposer>
  )
}
