import * as THREE from 'three'

/**
 * Fit a generated prop into the pavilion at a declared real-world size.
 *
 * Generated meshes arrive at an arbitrary scale and an arbitrary origin: Meshy
 * normalises its output, not ours. Hand-tuning each one's scale and offset in the
 * scene would mean every new module needed a human in the loop, and a prop that
 * looked right in one room would sit at the wrong size in another.
 *
 * So props are measured on load and scaled to a declared height, with a declared
 * anchor placed at the scene origin:
 *
 *   anchor 'top'    — hangs. The origin sits at the object's top, which is where
 *                     the ceiling fixing goes.
 *   anchor 'bottom' — stands. The origin sits at the object's base, which is
 *                     where the floor or plinth is.
 *
 * The declared height is the contract; the mesh is made to honour it. This is
 * also how a bad reconstruction announces itself: a prop whose proportions are
 * wrong for its target height shows up as wrong width, not as a silent scale drift.
 */
export function fitProp(object, { targetHeight, anchor = 'bottom', onMeasure } = {}) {
  if (!targetHeight || !Number.isFinite(targetHeight)) {
    throw new Error(`fitProp needs a finite targetHeight, got ${targetHeight}`)
  }

  object.updateWorldMatrix(true, true)
  const measured = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  measured.getSize(size)

  if (!Number.isFinite(size.y) || size.y <= 0) {
    throw new Error(
      `fitProp: prop has no measurable height (size ${size.x}, ${size.y}, ${size.z}). ` +
        'A generated mesh with zero height is empty or degenerate.',
    )
  }

  const scale = targetHeight / size.y
  object.scale.multiplyScalar(scale)
  object.updateWorldMatrix(true, true)

  const scaled = new THREE.Box3().setFromObject(object)
  const center = new THREE.Vector3()
  scaled.getCenter(center)

  const anchorY = anchor === 'top' ? scaled.max.y : scaled.min.y
  object.position.x -= center.x
  object.position.y -= anchorY
  object.position.z -= center.z
  object.updateWorldMatrix(true, true)

  const after = new THREE.Box3().setFromObject(object)
  const finalSize = new THREE.Vector3()
  after.getSize(finalSize)

  const report = {
    scale,
    sourceSize: { x: size.x, y: size.y, z: size.z },
    finalSize: { x: finalSize.x, y: finalSize.y, z: finalSize.z },
    aspect: finalSize.x / finalSize.y,
    anchor,
    targetHeight,
  }

  if (onMeasure) onMeasure(report)
  return report
}

/**
 * Traverse a loaded scene and hand back the meshes with the scene's own
 * transforms baked in, so the geometry can be measured and moved as one object.
 */
export function flattenProp(scene) {
  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return scene
}
