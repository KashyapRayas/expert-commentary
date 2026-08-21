/**
 * Rewrite the roman numeral on the spine so a companion volume reads as II or
 * III. Returns a canvas, or null if the numeral could not be located.
 *
 * Only Volume I exists as artwork, so rather than redraw the numeral in an
 * approximated typeface, this restamps the cover's own glyph: II and III are
 * literally the I repeated, so copying those pixels keeps the real face,
 * weight, colour and print texture exactly. Nothing is synthesised.
 *
 * Because it only repeats an existing glyph, it cannot express numerals that
 * need a new letterform — IV and beyond would require a V that the artwork does
 * not contain.
 */
export function restampNumeral(image, count) {
  const w = image.width
  const h = image.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0)

  const limit = Math.floor(h * 0.32)
  const { data } = ctx.getImageData(0, 0, w, limit)
  const lit = (i) => data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11 > 90

  // Collect the runs of rows containing artwork: logo, then VOL, then numeral.
  const runs = []
  for (let y = 0; y < limit; y++) {
    let on = false
    for (let x = 0; x < w; x++) {
      if (lit((y * w + x) * 4)) { on = true; break }
    }
    if (on) {
      const last = runs[runs.length - 1]
      if (last && last[1] === y - 1) last[1] = y
      else runs.push([y, y])
    }
  }

  // The masthead — logo, VOL, numeral — sits as a tight cluster at the head of
  // the spine, then there is a long blank before the rotated title. Cut at that
  // first big gap and take the last line of the cluster: that is the numeral.
  // (Taking simply the last run in the band would pick up the title instead.)
  const gap = h * 0.05
  let end = 1
  while (end < runs.length && runs[end][0] - runs[end - 1][1] < gap) end++
  const cluster = runs.slice(0, end)
  if (cluster.length < 3) return null

  const [top, bottom] = cluster[cluster.length - 1]
  let x0 = w
  let x1 = 0
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < w; x++) {
      if (lit((y * w + x) * 4)) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
      }
    }
  }

  const gw = x1 - x0 + 1
  const gh = bottom - top + 1
  const pad = 3
  // Clear the old numeral using the spine's own background from beside it.
  const bg = ctx.getImageData(1, top, 1, 1).data
  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`
  ctx.fillRect(0, top - pad, w, gh + pad * 2)

  const tracking = Math.round(gw * 0.42)
  const span = count * gw + (count - 1) * tracking
  // Re-centre on the original numeral so it stays aligned under VOL.
  const start = Math.round((x0 + x1 + 1) / 2 - span / 2)
  for (let i = 0; i < count; i++) {
    ctx.drawImage(image, x0, top, gw, gh, start + i * (gw + tracking), top, gw, gh)
  }

  return canvas
}

/** Load an image and return spine data URLs keyed by volume number. */
export async function buildSpines(src, volumes) {
  const image = new Image()
  image.src = src
  await image.decode()

  const out = {}
  for (const volume of volumes) {
    if (volume <= 1) {
      out[volume] = src
      continue
    }
    const canvas = restampNumeral(image, volume)
    out[volume] = canvas ? canvas.toDataURL('image/png') : src
  }
  return out
}
