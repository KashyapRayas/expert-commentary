import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { restampNumeral } from './restampNumeral.js'
import { asset } from './asset.js'

/**
 * Physical dimensions, taken from the print-ready wrap PDF.
 *
 * The PDF page is 1033.55 x 721.44 pt with a 45 pt bleed on every side, so the
 * trim area is 943.551 x 631.44 pt. The dark spine panel measures 67.7 pt and
 * sits dead centre, which leaves 437.93 pt for each cover.
 */
const TRIM = {
  coverWidth: 437.93 / 72, // 6.082 in
  coverHeight: 631.44 / 72, // 8.770 in
  spine: 67.7 / 72, // 0.940 in
}

// Scale so the book stands 3 world units tall.
const SCALE = 3 / TRIM.coverHeight
export const BOOK = {
  width: TRIM.coverWidth * SCALE,
  height: TRIM.coverHeight * SCALE,
  depth: TRIM.spine * SCALE,
}

/**
 * A page block seen edge-on: a stack of off-white leaves. `axis` picks whether
 * the leaves run across the texture's u or v, because the fore-edge and the
 * head/tail of a BoxGeometry unwrap along different axes.
 */
function makePageTexture(axis) {
  const long = 1024
  const short = 16
  const canvas = document.createElement('canvas')
  canvas.width = axis === 'u' ? long : short
  canvas.height = axis === 'u' ? short : long
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#efeae0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Deterministic pseudo-random so the leaves look uneven but never re-shuffle.
  let seed = 1337
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }

  for (let i = 0; i < long; i += 2) {
    const shade = 0.72 + rand() * 0.28
    const v = Math.round(shade * 255)
    ctx.fillStyle = `rgb(${v}, ${Math.round(v * 0.985)}, ${Math.round(v * 0.94)})`
    if (axis === 'u') ctx.fillRect(i, 0, 1, canvas.height)
    else ctx.fillRect(0, i, canvas.width, 1)
  }

  // Darken both ends so the block reads as recessed under the cover overhang.
  const grad = axis === 'u'
    ? ctx.createLinearGradient(0, 0, canvas.width, 0)
    : ctx.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, 'rgba(60, 50, 35, 0.55)')
  grad.addColorStop(0.06, 'rgba(60, 50, 35, 0)')
  grad.addColorStop(0.94, 'rgba(60, 50, 35, 0)')
  grad.addColorStop(1, 'rgba(60, 50, 35, 0.55)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function Book({ volume = 1, spin = false, ...props }) {
  const group = useRef()
  const { gl } = useThree()
  const [front, back, spine] = useTexture([asset('front.jpg'), asset('back.jpg'), asset('spine.jpg')])

  const maps = useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy()
    for (const t of [front, back, spine]) {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = aniso
      t.needsUpdate = true
    }

    let spineMap = spine
    if (volume > 1 && spine.image) {
      const canvas = restampNumeral(spine.image, volume)
      if (canvas) {
        const restamped = new THREE.CanvasTexture(canvas)
        restamped.colorSpace = THREE.SRGBColorSpace
        restamped.anisotropy = aniso
        spineMap = restamped
      }
    }
    return { front, back, spine: spineMap }
  }, [front, back, spine, gl, volume])

  const [edgeMap, headMap] = useMemo(
    () => [makePageTexture('u'), makePageTexture('v')],
    [],
  )

  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.35
  })

  /**
   * BoxGeometry material order is [+X, -X, +Y, -Y, +Z, -Z]. The wrap art maps
   * onto it one-to-one: the front cover faces +Z, the spine sits on -X, and the
   * back cover lands on -Z with its artwork already running the right way, so
   * the printed cover stays continuous around every fold.
   */
  return (
    <group ref={group} {...props}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BOOK.width, BOOK.height, BOOK.depth]} />
        <meshStandardMaterial attach="material-0" map={edgeMap} roughness={0.85} />
        <meshStandardMaterial attach="material-1" map={maps.spine} roughness={0.62} />
        <meshStandardMaterial attach="material-2" map={headMap} roughness={0.85} />
        <meshStandardMaterial attach="material-3" map={headMap} roughness={0.85} />
        <meshStandardMaterial attach="material-4" map={maps.front} roughness={0.58} />
        <meshStandardMaterial attach="material-5" map={maps.back} roughness={0.58} />
      </mesh>
    </group>
  )
}
