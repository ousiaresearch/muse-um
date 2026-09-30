import * as THREE from 'three'
import tokens from '../style.tokens.json'

/**
 * Build a toon gradient map out of the measured style tokens.
 *
 * MeshToonMaterial samples its gradientMap by N·L across the texture's width,
 * and that sample MULTIPLIES the material's diffuse colour. So pointing the
 * material's colour at white and letting the ramp carry the colour means every
 * lit surface resolves into the exhibits' own tones: the ramp is the palette,
 * and shading is a quantisation of it rather than an arbitrary falloff.
 *
 * That is the mechanism that makes the room congruent by construction. A surface
 * cannot drift out of palette if the only colours available to it are token
 * stops.
 */
const cache = new Map()

/**
 * Per-surface tonal ranges.
 *
 * Every surface draws from the same token palette, so nothing can drift out of
 * the family; what differs between floor, wall and frame is WHICH slice of the
 * palette it is allowed to occupy. That keeps the room legible — a floor that
 * reaches `bone` reads as a lit table, not a floor — without introducing a single
 * colour that is not in the artwork.
 */
export const SURFACE_RAMPS = {
  // The top stop IS the surface's brightness ceiling. Under MeshToonMaterial,
  // light intensity past the point where N·L saturates the top stop changes
  // nothing, so a dark top stop cannot be brightened by turning the lights up —
  // which is why two rooms stayed under the luminance band after a global
  // exposure bump. The floor was the darkest large surface, so it moves up a stop.
  floor: ['shadow_warm', 'mid_warm', 'stone', 'brass_mid'],
  wall: ['shadow_warm', 'stone', 'brass_mid', 'bone'],
  dado: ['stone', 'brass_mid', 'brass_lit'],
  frame: ['ink', 'brass_mid', 'brass_lit', 'highlight'],
  // Small brass fittings need their own slice. On the frame ramp an unlit face
  // falls to `ink`, which against a dark wall is indistinguishable from nothing —
  // four lanterns rendered, measured as red pixels, and were invisible in the
  // room. Starting at `shadow_warm` keeps an unlit face reading as warm dark
  // metal, and the top stops carry the lit brass.
  brass: ['shadow_warm', 'brass_mid', 'brass_lit', 'highlight'],
}

export function rampFor(surface, variant) {
  const stops = SURFACE_RAMPS[surface]
  if (!stops) throw new Error(`No surface ramp named "${surface}"`)
  return buildRamp(stops, variant.ramp.size)
}

function tokenColor(name) {
  const hex = tokens.palette[name]
  if (!hex) throw new Error(`No such style token: ${name}`)
  return new THREE.Color(hex).convertSRGBToLinear()
}

/**
 * @param {string[]} stops  token names, darkest to lightest
 * @param {number} size     texture width; small = hard bands, large = smooth
 */
export function buildRamp(stops, size) {
  const key = `${stops.join('|')}:${size}`
  if (cache.has(key)) return cache.get(key)

  if (stops.length < 2) throw new Error('A ramp needs at least two stops')

  const colors = stops.map(tokenColor)
  const data = new Uint8Array(size * 4)

  for (let i = 0; i < size; i += 1) {
    const t = size === 1 ? 0 : i / (size - 1)
    const scaled = t * (colors.length - 1)
    const index = Math.min(colors.length - 2, Math.floor(scaled))
    const fraction = scaled - index
    const a = colors[index]
    const b = colors[index + 1]

    const r = a.r + (b.r - a.r) * fraction
    const g = a.g + (b.g - a.g) * fraction
    const bl = a.b + (b.b - a.b) * fraction

    data[i * 4 + 0] = Math.round(Math.min(1, Math.max(0, r)) * 255)
    data[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255)
    data[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, bl)) * 255)
    data[i * 4 + 3] = 255
  }

  const texture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat)
  // A ramp is a lookup table, not an image: it must not be colour-managed again
  // on the way in, and hard-banded variants need nearest sampling to stay banded.
  texture.colorSpace = THREE.NoColorSpace
  texture.magFilter = size <= 8 ? THREE.NearestFilter : THREE.LinearFilter
  texture.minFilter = size <= 8 ? THREE.NearestFilter : THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true

  cache.set(key, texture)
  return texture
}
