/**
 * Capture flags, read once from the query string.
 *
 * Measuring a visual change means comparing two frames that differ in exactly
 * one thing. An animated prop rotating between two captures changes pixels just
 * as much as the effect under test does, which turned a first comparison of
 * this pavilion into 16% "changed" pixels that were mostly the armillary
 * turning rather than the pass being judged.
 *
 * So captures need to be able to hold still:
 *
 *   ?still=1   freeze animation, so two captures differ only by the code change
 *   ?post=0    disable the stylization passes, for a clean A/B against ?post=1
 *
 * These are verification affordances, not user features, and they cost nothing
 * when absent.
 */
const params =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()

const flag = (name, fallback = false) => {
  const value = params.get(name)
  if (value === null) return fallback
  return value !== '0' && value !== 'false'
}

export const captureFlags = {
  still: flag('still'),
  post: flag('post', true),
  animate: !flag('still'),
  variant: params.get('variant') || null,
}
