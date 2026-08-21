import { Suspense, useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Book from './Book.jsx'

/**
 * The arrangement. Volume I leads, front-on; the later volumes step back and to
 * the right, turned far enough that what faces the viewer is their spine.
 *
 * That turn is the whole point. Seen front-on the companions would just be
 * three copies of the same cover, and the volume number — the one thing that
 * distinguishes them — lives on the spine. Turned ~68 degrees the spines read
 * clearly, the covers fall away to a grazing sliver, and the set runs I, II,
 * III left to right.
 */
const BOOKS = [
  { volume: 1, position: [-1.1, 0, 0.35], rotation: [0, 0, 0] },
  { volume: 2, position: [0.95, 0, -0.35], rotation: [0, 0.95, 0] },
  { volume: 3, position: [2.45, 0, -1.05], rotation: [0, 1.1, 0] },
]

// The default point the camera orbits and frames.
const PIVOT = new THREE.Vector3(0.05, 0, -0.77)

/*
 * Camera presets. `offset` is the camera's position relative to the point it
 * aims at, so the framing survives any change to the arrangement above; `aim`
 * overrides that point when a view needs to be centred on something other than
 * the default pivot.
 *
 * Spine is not simply "the left side" any more. Each volume is turned, so their
 * spine normals point in different directions; that offset sits on the average
 * of the three, which is the one angle where all of I, II and III read at once.
 *
 * Back looks along the set rather than at it, so it is centred on the true
 * middle of the three back covers instead of the default pivot.
 */
const VIEWS = {
  front: { offset: [-1.1, 0.95, 7.0] },
  spine: { offset: [-5.45, 1.0, 4.55] },
  back: { offset: [1.1, 0.95, -7.0], aim: [0.46, 0, -0.77] },
}

function resolve(name) {
  const { offset, aim } = VIEWS[name]
  const target = aim ? new THREE.Vector3(...aim) : PIVOT.clone()
  const position = new THREE.Vector3(...offset).add(target)
  return { position, target }
}

const TWO_PI = Math.PI * 2

/** Wrap an angle delta into [-PI, PI] so the camera always swings the short way. */
function shortestAngle(delta) {
  return ((delta % TWO_PI) + TWO_PI * 1.5) % TWO_PI - Math.PI
}

/**
 * Glides the camera to a preset view. The move is interpolated in spherical
 * space rather than as a straight line: a straight lerp cuts a chord through
 * the orbit sphere, which OrbitControls then reads back as a smaller radius and
 * the two end up settling short of the preset. Orbiting keeps the radius exact
 * and matches what the controls would do themselves. Any manual drag cancels
 * the glide so the controls never fight the user for the camera.
 */
function CameraRig({ view, onArrive, controls }) {
  const { camera } = useThree()
  const goal = useRef(new THREE.Spherical())
  const now = useRef(new THREE.Spherical())
  const offset = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const ctl = controls.current
    if (!view || !ctl) return

    // Frame-rate independent: the same 9%-per-60Hz-frame pull on any display.
    const ease = 1 - Math.pow(1 - 0.09, Math.min(delta, 0.1) * 60)

    // Drift the orbit centre too, so presets can aim at different points.
    ctl.target.lerp(view.target, ease)
    const pivot = ctl.target

    goal.current.setFromVector3(offset.current.copy(view.position).sub(pivot))
    now.current.setFromVector3(offset.current.copy(camera.position).sub(pivot))

    const dTheta = shortestAngle(goal.current.theta - now.current.theta)
    const dPhi = goal.current.phi - now.current.phi
    const dRadius = goal.current.radius - now.current.radius

    const settled =
      Math.abs(dTheta) < 0.004 &&
      Math.abs(dPhi) < 0.004 &&
      Math.abs(dRadius) < 0.01 &&
      pivot.distanceTo(view.target) < 0.01

    if (settled) {
      ctl.target.copy(view.target)
      camera.position.copy(view.position)
      camera.lookAt(ctl.target)
      onArrive()
      return
    }

    camera.position
      .setFromSphericalCoords(
        now.current.radius + dRadius * ease,
        now.current.phi + dPhi * ease,
        now.current.theta + dTheta * ease,
      )
      .add(pivot)
    camera.lookAt(pivot)
  })

  return null
}

function Lights() {
  return (
    <>
      {/* Ambient-dominant so the flat cover art keeps close to its printed value
          from any angle. Against a near-white page the near-white cover needs the
          directionals to carry more weight than they would on a dark background:
          the falloff across the three visible faces is what separates the book
          from the paper behind it. */}
      <ambientLight intensity={1.5} />
      <directionalLight
        position={[-3.5, 8.5, 5.5]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-9, 9, 9, -9, 0.1, 30]} />
      </directionalLight>
      <directionalLight position={[6, 3, -6]} intensity={1.05} />
      <directionalLight position={[0, -5, 2]} intensity={0.22} />
    </>
  )
}

const SHOTS = [
  ['front', 'Front'],
  ['spine', 'Spine'],
  ['back', 'Back'],
]

export default function Viewer3D() {
  const controls = useRef()
  const [view, setView] = useState(() => resolve('front'))
  const [active, setActive] = useState('front')
  const [spin, setSpin] = useState(false)

  const goTo = useCallback((name) => {
    setView(resolve(name))
    setActive(name)
  }, [])
  const arrive = useCallback(() => setView(null), [])
  // A manual orbit ends the glide and clears the highlight: the camera is no
  // longer at a preset, so nothing should claim to be selected.
  const release = useCallback(() => {
    setView(null)
    setActive(null)
  }, [])

  return (
    <div className="app">
      <header className="bar">
        <div className="mark">
          <span className="kicker">The Practitioner&rsquo;s Library</span>
          <h1>Small Business Concessions</h1>
        </div>
        <p className="meta">
          Volume I<span className="dot" />Adrian Cartland<span className="dot" />First Edition
        </p>
      </header>

      <main className="stage">
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          camera={{ position: resolve('front').position.toArray(), fov: 35 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
        >
          <Lights />

          <Suspense fallback={null}>
            {BOOKS.map((book) => (
              <Book key={book.volume} {...book} spin={book.volume === 1 && spin} />
            ))}

            {/*
              A real shadow-catching floor rather than drei's ContactShadows.
              These books are thin plates, so their footprint on the ground is a
              narrow line; a blurred contact-shadow pass smears that line away to
              nothing and leaves only the blurred edge of its own plane as a
              stray dark blob. A plane receiving the key light's shadow map keeps
              the shadows tight, correctly angled, and free of edge artefacts.
            */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[PIVOT.x, -1.501, PIVOT.z]}
              receiveShadow
            >
              <planeGeometry args={[40, 40]} />
              <shadowMaterial transparent opacity={0.17} color="#141821" />
            </mesh>
          </Suspense>

          <CameraRig view={view} onArrive={arrive} controls={controls} />
          <OrbitControls
            ref={controls}
            onStart={release}
            target={PIVOT}
            enablePan
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={18}
          />
        </Canvas>
      </main>

      <footer className="controls">
        <div className="segment">
          {SHOTS.map(([name, label]) => (
            <button
              key={name}
              className={active === name ? 'on' : ''}
              onClick={() => goTo(name)}
            >
              {label}
            </button>
          ))}
        </div>

        <button className={`toggle ${spin ? 'on' : ''}`} onClick={() => setSpin((s) => !s)}>
          {spin ? 'Stop' : 'Spin'}
        </button>

        <p className="hint">Drag to rotate · scroll to zoom · right-drag to pan</p>
      </footer>
    </div>
  )
}
