import React, { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture, useGLTF } from '@react-three/drei'
import { Selection, Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import StylePass from './style/StylePass'
import { captureFlags } from './style/captureFlags'
import { rampFor } from './style/toonRamp'
import { resolveVariant, tokens } from './style/variants'
import { fitProp } from './props/fitProp'
import { ReadySignal } from './style/captureReadiness'

// The framed exhibit is always the room's canonical PNG. WebGL supplies the
// living gallery around it. An optional generated prop stands on the gallery
// floor as an environmental artifact; it never replaces the framed art or
// alters a room's evidence status.
const BASE = import.meta.env.BASE_URL

const ART = {
  threshold: 'art/threshold.png',
  fossil_wall: 'art/fossil-wall.png',
  keeper_room: 'art/keepers-room.png',
  matching_signal: 'art/matching-signal.png',
  lake_at_dawn: 'art/lake-at-dawn.png',
  porch_at_three_bells: 'art/porch-at-three-bells.png',
  observatory: 'art/observatory.png',
  broadcast_room: 'art/broadcast-room.png',
}

// Generated, curator-accepted environmental props, each registered with its
// lineage in public/agent/assets.json.
const PROP = {
  observatory: 'models/observatory-armillary.glb',
}

const FLOOR_Y = -1.5

// The pavilion's own hanging fittings, identical in every room. A real building
// has uniform fixtures; it is the exhibits that differ, and that uniformity is
// what makes eight rooms read as one building rather than eight sets.
//
// Two pairs at two different depths, which is the cheapest honest depth cue
// available: the near pair renders roughly twice the size of the far pair from
// the room's own camera, so the space reads as having volume before any exhibit
// is examined.
const LANTERN = 'models/pavilion-lantern.glb'
const LANTERN_HEIGHT = 0.66
const CEILING_Y = 2.9
const LANTERNS = [
  { position: [-3.0, 1.62, -0.12] },
  { position: [3.0, 1.62, -0.12] },
  { position: [-1.5, 1.06, 3.0] },
  { position: [1.5, 1.06, 3.0] },
]

// The rest of the kit. Each entry is measured and fitted on load, so a module's
// declared height is the contract and the mesh is made to honour it — which is
// also why a badly reconstructed prop shows up as wrong WIDTH instead of as a
// silent scale drift.
//
// Placed so nothing collides: the archway and the panel flank the exhibit at
// different heights, and the cabinet stands in the near right, clear of both the
// near lanterns and the standing relic.
const KIT = [
  {
    id: 'stone-archway',
    room: 'all',
    path: 'models/stone-archway.glb',
    position: [-3.05, FLOOR_Y, -0.25],
    height: 2.4,
  },
  {
    id: 'timber-panel',
    room: 'all',
    path: 'models/timber-panel.glb',
    position: [3.05, FLOOR_Y, -0.33],
    height: 2.2,
  },
  {
    id: 'display-cabinet',
    room: 'all',
    path: 'models/display-cabinet.glb',
    position: [2.3, FLOOR_Y, 1.5],
    height: 1.7,
    rotation: -0.38,
  },
]
// Props stand right of centre, clear of the wall label panel.
const PROP_X = 1.45
const PROP_Z = 0.95
const ART_Y = 1.5

// Layer the outline pass watches. Keeping it explicit means a surface is inked
// only because it was put on the layer, never by accident.
const INK_LAYER = 10

function ResetCamera({ roomId }) {
  const { camera } = useThree()
  useEffect(() => {
    // Angled and elevated rather than straight-on: this is what reveals the
    // floor, the wall junction, and the depth of the room.
    camera.position.set(1.1, 1.55, 7.2)
    camera.lookAt(0.05, 0.15, -0.2)
  }, [camera, roomId])
  return null
}

/**
 * A locally generated studio environment.
 *
 * Metal reflects its surroundings; with no environment map a brass surface
 * renders black no matter how many lights are added. This builds the map on
 * the GPU from three's RoomEnvironment — no network fetch, no HDRI asset.
 */
function GalleryEnvironment({ intensity = 1 }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    const previous = scene.environment
    scene.environment = env.texture
    return () => {
      scene.environment = previous
      env.dispose()
      pmrem.dispose()
      room.dispose?.()
    }
  }, [gl, scene, intensity])
  return null
}

/**
 * Everything that must carry a drawn line.
 *
 * The artwork itself is deliberately NOT inked — it is a canonical image, and an
 * outline drawn around its subject would be the room drawing on the painting.
 * Only the frame is a room object.
 */
function Inked({ children }) {
  return <Select enabled>{children}</Select>
}

function Exhibit({ room, variant, exposure }) {
  const texture = useTexture(`${BASE}${ART[room.id]}`)
  const ratio = texture.image?.width && texture.image?.height
    ? texture.image.width / texture.image.height
    : 1
  // Both caps matter: one exhibit in the set is portrait (1024x1536) while the
  // rest are landscape, and a width-only rule frames it visibly smaller.
  const artWidth = Math.min(3.9, 3.2 * ratio, 3.9)
  const artHeight = Math.min(3.4, artWidth / ratio)
  const frameRamp = rampFor('frame', variant)

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  return (
    <group position={[0, ART_Y, -0.18]}>
      <Inked>
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[artWidth + 0.34, artHeight + 0.34, 0.14]} />
          <meshToonMaterial color="#ffffff" gradientMap={frameRamp} />
        </mesh>
      </Inked>
      <mesh>
        <planeGeometry args={[artWidth, artHeight]} />
        {/* Unlit and untonemapped on purpose: this IS the artwork. */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, artHeight / 2 + 0.5, 1.2]}
        color={tokens.palette.glow_gold}
        intensity={26 * exposure}
        distance={5}
      />
    </group>
  )
}

function GalleryProp({ path, variant, scale = 0.85, spin = 0.045 }) {
  const group = useRef()
  const { scene } = useGLTF(`${BASE}${path}`)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      const source = Array.isArray(node.material) ? node.material[0] : node.material
      // The generator's own maps are kept — the brass is textured, not tinted —
      // but shading is quantised into the token ramp so the artifact resolves
      // into the same tones as the room around it.
      node.material = new THREE.MeshToonMaterial({
        map: source.map ?? null,
        normalMap: source.normalMap ?? null,
        gradientMap: rampFor('frame', variant),
        color: new THREE.Color(0xffffff),
      })
      node.material.needsUpdate = true
    })
    const box = new THREE.Box3().setFromObject(clone)
    return { object: clone, minY: box.min.y }
  }, [scene, variant])

  const placedY = FLOOR_Y - scale * model.minY

  useFrame((_, delta) => {
    if (group.current && captureFlags.animate) group.current.rotation.y += delta * spin
  })

  return (
    <group ref={group} position={[PROP_X, placedY, PROP_Z]} scale={scale}>
      <Inked>
        <primitive object={model.object} />
      </Inked>
    </group>
  )
}

/**
 * A warm key light aimed at the standing artifact.
 *
 * A spotlight needs its target object in the graph and its matrix updated
 * before assignment; a declarative `target-position` prop does not exist.
 */
function PropSpot({ exposure }) {
  const light = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    target.position.set(PROP_X, FLOOR_Y + 0.6, PROP_Z)
    target.updateMatrixWorld()
    if (light.current) light.current.target = target
  }, [target])

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={[PROP_X - 0.5, FLOOR_Y + 3.6, PROP_Z + 1.7]}
        angle={0.6}
        penumbra={0.9}
        color="#ffffff"
        intensity={190 * exposure}
        distance={18}
      />
    </>
  )
}

function Plinth({ variant, exposure, withProp = false }) {
  const stoneRamp = rampFor('dado', variant)
  return (
    <>
      {/* A generated artifact carries its own base, so the generic plinth is
          only drawn for rooms that have no prop. */}
      {!withProp && (
        <mesh position={[PROP_X, FLOOR_Y + 0.32, PROP_Z]}>
          <cylinderGeometry args={[0.62, 0.78, 0.64, 6]} />
          <meshToonMaterial color="#ffffff" gradientMap={stoneRamp} />
        </mesh>
      )}
      <pointLight
        position={[PROP_X, FLOOR_Y + (withProp ? 2.0 : 1.2), PROP_Z + 0.6]}
        color="#ffffff"
        intensity={(withProp ? 46 : 14) * exposure}
        distance={withProp ? 7 : 3}
      />
      {withProp && <PropSpot exposure={exposure} />}
    </>
  )
}

/**
 * The pavilion's repeating hanging fittings.
 *
 * The prop is measured and fitted once, then cloned for each position — fitting
 * four times would be four boxes measured for one answer, and the generator's
 * output scale is arbitrary, so the fit is the only thing standing between a
 * lantern that hangs and one that intersects the floor.
 */
function Lanterns({ variant, exposure }) {
  const { scene } = useGLTF(`${BASE}${LANTERN}`)

  const models = useMemo(() => {
    const build = (source) => {
      const clone = source.clone(true)
      clone.traverse((node) => {
        if (!node.isMesh) return
        const material = Array.isArray(node.material) ? node.material[0] : node.material
        // The generator's own maps are kept — the brass is textured, not tinted.
        // A small emissive lift stands in for the flame the reconstruction could
        // not carry: the panes are opaque, so the glow has to come from the
        // material and the light below it rather than from anything modelled.
        node.material = new THREE.MeshToonMaterial({
          map: material.map ?? null,
          normalMap: material.normalMap ?? null,
          gradientMap: rampFor('brass', variant),
          color: new THREE.Color(0xffffff),
          // The panes are opaque — the reconstruction could not carry glass, so
          // there is nothing to see through and the glow has to be in the
          // material. This is what makes a lantern read as lit rather than as a
          // dark brass cage.
          emissive: new THREE.Color(tokens.palette.glow_gold),
          emissiveIntensity: 0.22,
        })
        node.material.needsUpdate = true
      })
      return clone
    }

    const first = build(scene)
    const fit = fitProp(first, { targetHeight: LANTERN_HEIGHT, anchor: 'top' })
    if (import.meta.env.DEV) {
      // Surfaces a bad reconstruction: a lantern far wider than it is tall is
      // a blob, and it should say so rather than silently ship.
      console.info(
        `[lantern] fitted to ${LANTERN_HEIGHT}m — aspect ${fit.aspect.toFixed(2)} ` +
          `(source ${fit.sourceSize.y.toFixed(2)}m tall, scale x${fit.scale.toFixed(3)})`,
      )
    }
    return LANTERNS.map(() => first.clone(true))
  }, [scene, variant])

  return (
    <>
      {LANTERNS.map((lantern, index) => {
        const [x, y, z] = lantern.position
        const rodHeight = Math.max(0.02, CEILING_Y - y)
        return (
          <group key={index} position={[x, y, z]}>
            <Inked>
              <primitive object={models[index]} />
            </Inked>
            {/* Suspension. Without it the lantern floats, which reads as a bug
                rather than as an object hanging from something. */}
            <mesh position={[0, rodHeight / 2, 0]}>
              <cylinderGeometry args={[0.021, 0.021, rodHeight, 6]} />
              <meshToonMaterial color="#ffffff" gradientMap={rampFor('brass', variant)} />
            </mesh>
            {/* The lamp's own spill, placed BELOW the body. A point light inside
                the cage illuminates only inner faces — the panes are opaque, so
                the lantern's own exterior would stay unlit and the room would get
                no pool of light. Below the body is where a real lamp throws. */}
            <pointLight
              position={[0, -LANTERN_HEIGHT - 0.05, 0.02]}
              color={tokens.palette.glow_gold}
              intensity={7 * exposure}
              distance={5.5}
            />
          </group>
        )
      })}
    </>
  )
}

/**
 * A generated kit module placed in the room.
 *
 * Materials are rebuilt as token-ramped toon rather than used as delivered: the
 * generator's own map keeps its colour — the oak stays dark, the plaster stays
 * pale — while the ramp quantises the lighting into the same tonal stops the
 * walls and frames use. That is what makes a generated object belong to the room
 * instead of sitting on top of it.
 */
function KitProp({ entry, variant }) {
  const { scene } = useGLTF(`${BASE}${entry.path}`)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((node) => {
      if (!node.isMesh) return
      const material = Array.isArray(node.material) ? node.material[0] : node.material
      node.material = new THREE.MeshToonMaterial({
        map: material.map ?? null,
        normalMap: material.normalMap ?? null,
        gradientMap: rampFor('prop', variant),
        color: new THREE.Color(0xffffff),
      })
      node.material.needsUpdate = true
    })

    const fit = fitProp(clone, { targetHeight: entry.height, anchor: 'bottom' })
    if (import.meta.env.DEV) {
      console.info(
        `[kit] ${entry.id} fitted to ${entry.height}m — aspect ${fit.aspect.toFixed(3)} ` +
          `(source ${fit.sourceSize.y.toFixed(2)} tall, scale x${fit.scale.toFixed(4)})`,
      )
    }
    return clone
  }, [scene, variant, entry])

  return (
    <group position={entry.position} rotation={[0, entry.rotation ?? 0, 0]}>
      <Inked>
        <primitive object={model} />
      </Inked>
    </group>
  )
}

function Pavilion({ room, variant }) {
  const propPath = PROP[room.id]
  // A room may carry its own exposure. Uniform lighting made room luminance
  // track the displayed painting's own tone, because the painting is unlit and
  // occupies much of the frame; two rooms fell under the band. Lighting a room
  // on its own is ordinary museum practice and the contract is per-room.
  const exposure = room.exposure ?? variant.exposure

  return (
    <>
      <color attach="background" args={[tokens.palette.sky_deep]} />
      <fog attach="fog" args={[tokens.palette.sky_deep, 13, 30]} />
      <GalleryEnvironment />

      {/* Lights are deliberately near-white. MeshToonMaterial's ramp multiplies
          the light, so a tinted light would shift every surface off the token
          palette the ramp exists to enforce. The warmth in the exhibits comes
          from the palette itself, not from coloured lamps.
          three r155+ uses physically-correct units, so these read much lower
          than legacy intensities would suggest. */}
      <ambientLight color="#ffffff" intensity={0.22 * exposure} />
      <directionalLight position={[-4, 5, 5]} color="#ffffff" intensity={2.8 * exposure} />
      <pointLight position={[-3.3, -0.6, 2]} color="#ffffff" intensity={7 * exposure} distance={10} />
      <pointLight position={[3.3, -0.6, 2]} color="#ffffff" intensity={5 * exposure} distance={10} />
      <Stars
        radius={28}
        depth={16}
        count={900}
        factor={1.7}
        saturation={0.35}
        fade
        speed={captureFlags.animate ? 0.22 : 0}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshToonMaterial color="#ffffff" gradientMap={rampFor('floor', variant)} />
      </mesh>
      <mesh position={[0, 1.2, -0.55]}>
        <boxGeometry args={[8.6, 7.1, 0.35]} />
        <meshToonMaterial color="#ffffff" gradientMap={rampFor('wall', variant)} />
      </mesh>
      {/* Dado rail: a visible line where wall meets floor, so the room reads as
          architecture rather than an empty void. */}
      <Inked>
        <mesh position={[0, FLOOR_Y + 0.12, -0.36]}>
          <boxGeometry args={[8.6, 0.24, 0.06]} />
          <meshToonMaterial color="#ffffff" gradientMap={rampFor('dado', variant)} />
        </mesh>
      </Inked>

      <Exhibit room={room} variant={variant} exposure={exposure} />

      {/* Ceiling beams the fittings actually hang from. A rod that terminates in
          nothing reads as a floating object no matter how well the object itself
          is made, so the lamps needed something above them more than they needed
          more detail on themselves. One beam per hanging depth. */}
      <Inked>
        <mesh position={[0, CEILING_Y, -0.12]}>
          <boxGeometry args={[8.4, 0.18, 0.24]} />
          <meshToonMaterial color="#ffffff" gradientMap={rampFor('frame', variant)} />
        </mesh>
      </Inked>
      <Inked>
        <mesh position={[0, CEILING_Y, 3.0]}>
          <boxGeometry args={[8.4, 0.18, 0.24]} />
          <meshToonMaterial color="#ffffff" gradientMap={rampFor('frame', variant)} />
        </mesh>
      </Inked>

      {/* Fittings and furniture carry room 'all' — a real building's fixtures are
          uniform. A RELIC belongs to one room, because it renders that room's own
          motif; showing the three bells in the Observatory would assert that the
          town's bells belong there, which is not something the record says. */}
      {KIT.filter((entry) => !entry.room || entry.room === 'all' || entry.room === room.id).map((entry) => (
        <Suspense key={entry.id} fallback={null}>
          <KitProp entry={entry} variant={variant} />
        </Suspense>
      ))}

      <Suspense fallback={null}>
        <Lanterns variant={variant} exposure={exposure} />
      </Suspense>

      {propPath ? (
        <Suspense fallback={<Plinth variant={variant} exposure={exposure} withProp />}>
          <GalleryProp path={propPath} variant={variant} />
          <Plinth variant={variant} exposure={exposure} withProp />
        </Suspense>
      ) : (
        <Plinth variant={variant} exposure={exposure} />
      )}
    </>
  )
}

export default function SceneCanvas({ room }) {
  const variant = useMemo(() => resolveVariant(captureFlags.variant), [])

  return (
    <Canvas
      camera={{ fov: 48, position: [0, 0.55, 8.0] }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label={`${room.name}, an explorable MUSE-UM gallery room`}
    >
      <Selection>
        <Suspense fallback={null}>
          <ResetCamera roomId={room.id} />
          <ReadySignal />
          <Pavilion room={room} variant={variant} />
          <OrbitControls
            enablePan={false}
            minDistance={4.8}
            maxDistance={10}
            minPolarAngle={Math.PI * 0.3}
            maxPolarAngle={Math.PI * 0.68}
            target={[0, 0.35, 0]}
          />
          {captureFlags.post && <StylePass variant={variant} />}
        </Suspense>
      </Selection>
    </Canvas>
  )
}
