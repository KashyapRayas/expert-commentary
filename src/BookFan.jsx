import { memo, useEffect, useMemo, useState } from 'react'
import styles from './BookFan.module.css'
import { buildSpines } from './restampNumeral.js'
import { asset } from './asset.js'

/**
 * The fan, following the card deck on the Website2025 landing page: slots are
 * absolutely positioned and pushed out from a common centre, and the whole set
 * leans towards the pointer.
 *
 * The fan is always open — there is no collapsed resting state — so the panel
 * reads as a set at a glance.
 *
 * Offsets are in units of one book's width so the whole arrangement scales with
 * the container rather than being pinned to pixel values.
 *
 * Note the sign of rotY: each book turns its *outer* edge towards the viewer,
 * which is the opposite of the reference deck. Cards can splay either way
 * because they have no thickness, but a book's side faces do the work of making
 * it a book, and turning the inner edge forward buries the spine under the
 * neighbour that overlaps it. Turning outward puts the spine and fore-edge on
 * the free side of each book, where nothing covers them.
 *
 * `tier` is how far back a book sits. Each step back shrinks it and washes it
 * towards the panel's grey, so the set reads as receding rather than as one
 * flat row — the trailing books fall away as if the series keeps going.
 *
 * Only Volumes I, II and III exist as named artwork, so the two front tiers
 * carry them and everything further back is turned to its back cover rather
 * than repeating a numeral the restamp cannot spell.
 */
const FAN = [
  { key: 'l4', x: -1.18, y: 0.33, rotY: 46, rotZ: -17, tier: 4, face: 'back' },
  { key: 'l3', x: -0.98, y: 0.3, rotY: 40, rotZ: -14, tier: 3, face: 'back' },
  { key: 'l2', x: -0.74, y: 0.26, rotY: 32, rotZ: -10, tier: 2, face: 'back' },
  { key: 'l1', x: -0.44, y: 0.22, rotY: 18, rotZ: -5, tier: 1, volume: 2 },
  { key: 'c', x: 0, y: 0.16, rotY: 8, rotZ: 0, tier: 0, volume: 1 },
  { key: 'r1', x: 0.44, y: 0.22, rotY: -18, rotZ: 5, tier: 1, volume: 3 },
  { key: 'r2', x: 0.74, y: 0.26, rotY: -32, rotZ: 10, tier: 2, face: 'back' },
  { key: 'r3', x: 0.98, y: 0.3, rotY: -40, rotZ: 14, tier: 3, face: 'back' },
  { key: 'r4', x: 1.18, y: 0.33, rotY: -46, rotZ: 17, tier: 4, face: 'back' },
]

// Five tiers, each a constant step smaller and hazier than the one in front.
// The last pair is nearly lost in the panel's grey, which is the point — the
// set should look like it carries on past the edge of the frame.
const TIER_SCALE = [1, 0.9, 0.81, 0.73, 0.66]

/*
 * Recession is a scrim of the panel colour laid over each book, not opacity on
 * the book itself. Fading the book would make it translucent, so wherever two
 * books overlap you would read the one behind through the one in front. A scrim
 * keeps every book solid and washes it towards the background instead, which is
 * what distance actually looks like.
 */
const TIER_HAZE = [0, 0.16, 0.37, 0.58, 0.73]

const VOLUMES = [1, 2, 3]

/*
 * Geometry, shared with the stylesheet: these are set as CSS custom properties
 * on the deck. They live here because the proximity effect below has to know
 * where each book sits in order to measure the cursor against it.
 */
const BOOK_HEIGHT = 0.96 // of the panel's height — taller than the panel, so the lead book crops
const COVER_ASPECT = 0.6943 // the cover's real trim ratio
const SPINE_RATIO = 0.1545 // 0.94in spine against a 6.08in cover

/*
 * How hard the pointer swings a given book, by how far out it sits. The lead
 * book tracks the cursor gently and each book further out swings harder, so the
 * fan flexes as a whole rather than every book moving in lockstep.
 *
 * Flip this by swapping the endpoints — 1.9 at the centre falling to 1 at the
 * edges — if the set should instead settle as it recedes.
 */
const CENTRE_SWING = 1
const EDGE_SWING = 1.9
const MAX_X = Math.max(...FAN.map((s) => Math.abs(s.x)))

function swing(spec) {
  const out = Math.abs(spec.x) / MAX_X
  return CENTRE_SWING + (EDGE_SWING - CENTRE_SWING) * out
}

/*
 * The local half of the interaction. The lean above moves the whole fan the
 * same way whichever book you are over, which on its own reads as one flat
 * gesture; this adds a response that depends on where the cursor actually is.
 *
 * The book nearest the cursor turns square to face you and comes back to full
 * strength out of the recession gradient — so running the cursor along the fan
 * sends a wave through it and picks each volume out in turn.
 *
 * Deliberately no rise: nothing moves towards the viewer and the stacking order
 * is fixed, so a book can never climb over the one in front of it.
 */
const NEAR_RANGE = 1.15 // in book widths
const STRAIGHTEN = 0.55 // how far a near book unwinds towards facing you

/*
 * How far the set opens out. One knob over the whole arrangement: lower gathers
 * the books in behind the lead volume so more of each is tucked away, higher
 * spreads them across the panel. Both the layout and the cursor's proximity
 * test read it, so hover targeting follows wherever the books actually sit.
 */
const SPREAD = 0.78

// Sits the whole set lower in the panel. Added to every book's y, so the arc
// keeps its shape and the lead volume just crops a little deeper at the bottom.
const DROP = 0.07

const offsetX = (spec) => spec.x * SPREAD
const offsetY = (spec) => spec.y + DROP

/** 0 far from the cursor, 1 under it, smoothly eased between. */
function proximity(spec, pointer) {
  if (!pointer.active) return 0
  const centre = pointer.width / 2 + offsetX(spec) * pointer.book
  const gap = Math.abs(pointer.px - centre) / pointer.book
  const t = Math.max(0, 1 - gap / NEAR_RANGE)
  return t * t * (3 - 2 * t)
}

// Scaled from the top edge so the arc's y offsets stay the books' actual tops
// however far back they sit, and each tier shrinks downward out of the frame.
function place(spec) {
  return `translateX(calc(var(--bw) * ${offsetX(spec)}))
          translateY(calc(var(--bw) * ${offsetY(spec)}))
          scale(${TIER_SCALE[spec.tier]})`
}

const FanBook = memo(({ spec, spineSrc, pointer }) => {
  const near = proximity(spec, pointer)

  const style = useMemo(() => {
    // One shared pointer drives every book, scaled by how far out it sits, so
    // the set leans together instead of each book reacting only to its own
    // hover. Books the cursor never touches still take part.
    const lean = pointer.active ? swing(spec) : 0
    // ...and the book under the cursor unwinds towards square-on.
    const rotY = spec.rotY * (1 - STRAIGHTEN * near) + pointer.x * 20 * lean
    const rotX = pointer.y * -20 * lean

    // No perspective() here: .slot already establishes one, and nesting a
    // second on an element that is also preserve-3d flattens the side faces.
    return {
      transform: `rotateY(${rotY}deg)
        rotateX(${rotX}deg)
        rotateZ(${spec.rotZ * (1 - 0.4 * near)}deg)`,
      transition: pointer.active
        ? 'transform 0.18s ease-out'
        : 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)',
    }
  }, [pointer, spec, near])

  const sweep = (0.5 - pointer.x) * 100
  const isBack = spec.face === 'back'

  // Every face carries the same scrim, so the book hazes as one solid object
  // rather than its cover fading while its spine stays sharp. A book under the
  // cursor clears back to nothing.
  const haze = {
    opacity: TIER_HAZE[spec.tier] * (1 - near),
    transition: pointer.active
      ? 'opacity 0.18s ease-out'
      : 'opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1)',
  }

  return (
    <div
      className={styles.slot}
      style={{
        // Fixed: nearer tiers sit in front, and the cursor never reorders them.
        zIndex: 10 - spec.tier,
        transform: place(spec),
      }}
    >
      <div className={styles.inner} style={style}>
        {/*
          Both side faces are real, hinged along the cover's edges and folded
          back into the page. This is what makes the splay read as books rather
          than as cards: a fan turns its left-hand books toward you and its
          right-hand books away, so one side shows spine and the other shows
          fore-edge. Having only one of them would leave half the fan looking
          paper-thin. A book turned to its back cover has the spine on the
          opposite edge, hence the swap.
        */}
        <div className={`${styles.side} ${styles.sideLeft}`}>
          {isBack ? <div className={styles.pages} /> : <img src={spineSrc} alt="" draggable="false" />}
          <div className={styles.haze} style={haze} />
        </div>
        <div className={`${styles.side} ${styles.sideRight}`}>
          {isBack ? <img src={spineSrc} alt="" draggable="false" /> : <div className={styles.pages} />}
          <div className={styles.haze} style={haze} />
        </div>

        <div className={styles.face}>
          <img
            src={isBack ? asset('back.jpg') : asset('front.jpg')}
            alt={isBack ? '' : `Small Business Concessions, Volume ${spec.volume}`}
            draggable="false"
          />
          <div
            className={styles.glimmer}
            style={{
              opacity: pointer.active ? 1 : 0,
              background: `linear-gradient(
                105deg,
                transparent ${sweep - 45}%,
                rgba(255, 255, 255, 0.05) ${sweep - 30}%,
                rgba(255, 255, 255, 0.4) ${sweep}%,
                rgba(255, 255, 255, 0.05) ${sweep + 30}%,
                transparent ${sweep + 45}%
              )`,
            }}
          />
          <div className={styles.haze} style={haze} />
        </div>
      </div>
    </div>
  )
})

const IDLE = { x: 0, y: 0, px: 0, width: 1, book: 1, active: false }

export default function BookFan() {
  const [pointer, setPointer] = useState(IDLE)
  const [spines, setSpines] = useState(null)

  useEffect(() => {
    let live = true
    buildSpines(asset('spine.jpg'), VOLUMES).then((built) => {
      if (live) setSpines(built)
    })
    return () => {
      live = false
    }
  }, [])

  // Measured against the whole panel rather than each book, so a book only
  // half in frame still leans by the same rule as the rest. `book` is the book
  // width in the same pixels, which is what lets each book work out how close
  // the cursor is to it without a layout read per book per frame.
  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPointer({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
      px: e.clientX - rect.left,
      width: rect.width,
      book: rect.height * BOOK_HEIGHT * COVER_ASPECT,
      active: true,
    })
  }

  return (
    <div className={styles.stage}>
      <div
        className={styles.deck}
        style={{
          '--bh': `${BOOK_HEIGHT * 100}cqh`,
          '--bw': `calc(var(--bh) * ${COVER_ASPECT})`,
          '--thick': `calc(var(--bw) * ${SPINE_RATIO})`,
        }}
        onMouseMove={handleMove}
        onMouseLeave={() => setPointer(IDLE)}
      >
        {FAN.map((spec) => (
          <FanBook
            key={spec.key}
            spec={spec}
            pointer={pointer}
            spineSrc={spines?.[spec.volume] ?? asset('spine.jpg')}
          />
        ))}
      </div>
    </div>
  )
}
