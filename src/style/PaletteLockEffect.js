import { Effect } from 'postprocessing'
import { Color, Uniform, Vector3 } from 'three'
import tokens from '../style.tokens.json'

/**
 * Palette lock: snap every rendered pixel to the nearest measured style token.
 *
 * This is the mechanism that makes congruency a property of the pipeline rather
 * than something a prompt or a material setting has to achieve. A generated
 * prop whose brass drifts toward chrome, or a wall that picks up a cool bounce
 * light, still lands inside the family because the renderer moves it there.
 *
 * The `strength` uniform exists because a full lock bands: `mix` at 0.45 keeps
 * the shading and pulls the hue, while 1.0 flattens to the palette outright —
 * which is the woodcut read, and is why it is a parameter rather than a given.
 *
 * Known limitation: the nearest-token search runs in the buffer's own space, so
 * the comparison is only perceptually reasonable to the extent that space is.
 * It is deliberately a weighted RGB distance rather than a full Lab conversion,
 * because 12 candidates in a fragment shader is not the place for the expensive
 * form — and the gate measures whether palette share actually improves, so a
 * wrong space shows up as a failing number rather than silently.
 */
const palette = Object.values(tokens.palette).map((hex) => {
  // LINEAR, deliberately. The effect runs on the composer's buffer before output
  // encoding, so the values it compares against must be linear too. Feeding it
  // sRGB values snapped a linear buffer toward sRGB numbers, which after encoding
  // landed nowhere near the tokens — palette share fell the harder the lock was
  // pushed, which is how the mistake was caught.
  const colour = new Color(hex).convertSRGBToLinear()
  return new Vector3(colour.r, colour.g, colour.b)
})

const fragmentShader = /* glsl */ `
uniform float strength;
uniform vec3 palette[${palette.length}];

// Rec. 601 luma weights: a cheap stand-in for perceptual distance.
const vec3 WEIGHTS = vec3(0.30, 0.59, 0.11);

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 source = inputColor.rgb;
  vec3 nearest = source;
  float best = 1e9;

  for (int i = 0; i < ${palette.length}; i++) {
    vec3 delta = source - palette[i];
    float distance = dot(delta * delta, WEIGHTS);
    if (distance < best) {
      best = distance;
      nearest = palette[i];
    }
  }

  outputColor = vec4(mix(source, nearest, strength), inputColor.a);
}
`

export class PaletteLockEffect extends Effect {
  constructor({ strength = 0.5 } = {}) {
    super('PaletteLockEffect', fragmentShader, {
      uniforms: new Map([['strength', new Uniform(strength)]]),
    })

    // A uniform array has to be uploaded as an array of the same objects, every
    // frame, or three drops the binding and the effect silently no-ops.
    this.uniforms.set('palette', new Uniform(palette))
  }
}
