import tokens from '../style.tokens.json'

/**
 * The three stylization presets under comparison.
 *
 * They differ only in parameters, on purpose: the same mechanisms with different
 * settings, so the choice is about how hard the stylization is pushed rather than
 * about three unrelated looks. `rampSize` is the main dial — a small texture with
 * nearest sampling gives hard bands, a large one with linear sampling gives the
 * painterly gradient the exhibits actually have.
 *
 * The exhibit set measures mean luminance 74-111, saturation 60-130 and edge
 * density 26-45. Every preset is graded toward that band and then measured, so
 * the comparison is not a matter of taste alone.
 */
export const VARIANTS = {
  painterly: {
    label: 'Painterly',
    note: 'CHOSEN 2026-09-30 by operator ruling. Smooth token ramp, restrained ink, moderate lock.',
    ramp: {
      stops: ['shadow_warm', 'mid_warm', 'brass_lit', 'highlight'],
      size: 48,
    },
    outline: { width: 2.0, color: 'ink', strength: 2.8, blur: true },
    paletteLock: 0.45,
    grain: 0.10,
    exposure: 2.55,
    vignette: { offset: 0.3, darkness: 0.55 },
  },

  'graphic-novel': {
    label: 'Graphic novel',
    note: 'Reference point only, not a candidate. Four hard steps, firm pen line, stronger lock.',
    ramp: {
      stops: ['shadow_warm', 'mid_warm', 'bone', 'highlight'],
      size: 4,
    },
    outline: { width: 2.6, color: 'ink', strength: 3.4 },
    paletteLock: 0.7,
    grain: 0.08,
    exposure: 2.15,
    vignette: { offset: 0.3, darkness: 0.6 },
  },

  woodcut: {
    label: 'Woodcut',
    note: 'Reference point only, not a candidate. Two steps, heavy line, full lock.',
    ramp: {
      stops: ['ink', 'mid_warm'],
      size: 2,
    },
    outline: { width: 4.0, color: 'ink', strength: 5.0 },
    paletteLock: 1.0,
    grain: 0.14,
    exposure: 2.55,
    vignette: { offset: 0.28, darkness: 0.7 },
  },
}

export const DEFAULT_VARIANT = 'painterly'
export const VARIANT_NAMES = Object.keys(VARIANTS)

export function resolveVariant(name) {
  return VARIANTS[name] || VARIANTS[DEFAULT_VARIANT]
}

export { tokens }
