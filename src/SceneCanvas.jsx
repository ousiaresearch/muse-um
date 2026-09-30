import React, { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

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
// Props stand right of centre, clear of the wall label panel.
const PROP_X = 1.45
const PROP_Z = 0.95
const ART_Y = 1.5

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
function GalleryEnvironment() {
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
  }, [gl, scene])
  return null
}

function Exhibit({ room }) {
  const texture = useTexture(`${BASE}${ART[room.id]}`)
  const ratio = texture.image?.width && texture.image?.height
    ? texture.image.width / texture.image.height
    : 1
  const artWidth = Math.min(3.9, 3.2 * ratio)
  const artHeight = artWidth / ratio

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])

  return (
    <group position={[0, ART_Y, -0.18]}>
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[artWidth + 0.34, artHeight + 0.34, 0.14]} />
        <meshStandardMaterial color="#2d2119" roughness={0.4} metalness={0.3} envMapIntensity={0.3} />
      </mesh>
      <mesh>
        <planeGeometry args={[artWidth, artHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <pointLight position={[0, artHeight / 2 + 0.5, 1.2]} color="#e9c978" intensity={26} distance={5} />
    </group>
  )
}

function GalleryProp({ path, scale = 0.85, spin = 0.045 }) {
  const group = useRef()
  const { scene } = useGLTF(`${BASE}${path}`)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      const materials = Array.isArray(node.material) ? node.material : [node.material]
      for (const material of materials) {
        // The generator returns brass about as glossy as it likes. The
        // pavilion's matte museum finish is applied here from the asset's own
        // roughness map rather than fought for in the prompt.
        material.roughness = Math.min(1, (material.roughness ?? 0.5) + 0.2)
        material.metalness = Math.min(0.78, material.metalness ?? 0.75)
        material.envMapIntensity = 1.15
        material.needsUpdate = true
      }
    })
    const box = new THREE.Box3().setFromObject(clone)
    return { object: clone, minY: box.min.y }
  }, [scene])

  const placedY = FLOOR_Y - scale * model.minY

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * spin
  })

  return (
    <group ref={group} position={[PROP_X, placedY, PROP_Z]} scale={scale}>
      <primitive object={model.object} />
    </group>
  )
}

/**
 * A warm key light aimed at the standing artifact.
 *
 * A spotlight needs its target object in the graph and its matrix updated
 * before assignment; a declarative `target-position` prop does not exist.
 */
function PropSpot() {
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
        color="#ffe3ae"
        intensity={190}
        distance={18}
      />
    </>
  )
}

function Plinth({ withProp = false }) {
  return (
    <>
      {/* A generated artifact carries its own base, so the generic plinth is
          only drawn for rooms that have no prop. */}
      {!withProp && (
        <mesh position={[PROP_X, FLOOR_Y + 0.32, PROP_Z]}>
          <cylinderGeometry args={[0.62, 0.78, 0.64, 6]} />
          <meshStandardMaterial color="#4a3d35" roughness={0.55} metalness={0.15} envMapIntensity={0.4} />
        </mesh>
      )}
      <pointLight
        position={[PROP_X, FLOOR_Y + (withProp ? 2.0 : 1.2), PROP_Z + 0.6]}
        color="#f0cd84"
        intensity={withProp ? 46 : 14}
        distance={withProp ? 7 : 3}
      />
      {withProp && <PropSpot />}
    </>
  )
}

function Pavilion({ room }) {
  const propPath = PROP[room.id]
  return (
    <>
      <color attach="background" args={['#07060d']} />
      <fog attach="fog" args={['#0d0a16', 14, 30]} />
      <GalleryEnvironment />
      {/* three r155+ uses physically-correct light units: intensities scale
          with distance squared, so these read far lower than legacy values. */}
      <ambientLight color="#9e92c4" intensity={0.6} />
      <directionalLight position={[-4, 5, 5]} color="#d8b365" intensity={1.6} />
      <pointLight position={[-3.3, -0.6, 2]} color="#4a6baf" intensity={16} distance={10} />
      <pointLight position={[3.3, -0.6, 2]} color="#805186" intensity={11} distance={10} />
      <Stars radius={28} depth={16} count={900} factor={1.7} saturation={0.35} fade speed={0.22} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#3b3150" roughness={0.82} metalness={0.06} envMapIntensity={0.5} />
      </mesh>
      <mesh position={[0, 1.2, -0.55]}>
        <boxGeometry args={[8.6, 7.1, 0.35]} />
        <meshStandardMaterial color="#241c33" roughness={0.82} envMapIntensity={0.45} />
      </mesh>
      {/* Dado rail: a visible line where wall meets floor, so the room reads as
          architecture rather than an empty void. */}
      <mesh position={[0, FLOOR_Y + 0.12, -0.36]}>
        <boxGeometry args={[8.6, 0.24, 0.06]} />
        <meshStandardMaterial color="#584a6e" roughness={0.6} metalness={0.1} envMapIntensity={0.6} />
      </mesh>

      <Exhibit room={room} />

      {propPath ? (
        <Suspense fallback={<Plinth withProp />}>
          <GalleryProp path={propPath} />
          <Plinth withProp />
        </Suspense>
      ) : (
        <Plinth />
      )}
    </>
  )
}

export default function SceneCanvas({ room }) {
  return (
    <Canvas
      camera={{ fov: 44, position: [0, 0.55, 7.6] }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label={`${room.name}, an explorable MUSE-UM gallery room`}
    >
      <Suspense fallback={null}>
        <ResetCamera roomId={room.id} />
        <Pavilion room={room} />
        <OrbitControls
          enablePan={false}
          minDistance={4.8}
          maxDistance={10}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.68}
          target={[0, 0.35, 0]}
        />
      </Suspense>
    </Canvas>
  )
}
