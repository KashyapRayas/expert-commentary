# Expert Commentary

The "Exclusive Expert Commentary" section of the SavvyWise site, recreated in
code from Figma (node `149:1507`), with a fan of the *Small Business
Concessions* volumes filling the panel that is empty in the design
(node `149:1635`). Vite + React, CSS 3D transforms, no WebGL and no shaders.

```bash
npm install
npm run dev
```

| Route | What it renders |
| --- | --- |
| `/` | The full section, fan in the panel |
| `/?fan` | The panel on its own, filling the viewport — for exporting a still at 676 x 326 |
| `/?3d` | The earlier orbitable WebGL viewer |

## The section

Built from `get_design_context`, adapted to the project's plain CSS / CSS
modules rather than the Tailwind the reference code returns. Geist and IBM Plex
Serif come from Google Fonts; the photo and the message-square icon are the
exported Figma assets, committed to `public/`.

The two-column heights resolve on their own — heading 42 + 24 + copy 84 + 24,
against a right column of photo 380.25 + 18 + quote 102 — so the panel lands at
exactly **676 x 326.25**, matching the frame. That is asserted in the browser,
not eyeballed. The panel keeps the design's `#E4E4E4` fill, border and 8px
radius; the fan takes it edge to edge rather than sitting inside the frame's
24px padding, since the two share a background and the composition needs the
width.

## The fan

Composition and hover follow the card deck on the Website2025 landing page:
absolutely positioned slots pushed out from a common centre, leaning towards the
pointer, with a CSS glimmer sweep. The reference's shader passes are not used.

Two things differ, both because these are books rather than cards:

- **Each book is a real box.** Every face is centred on the block and pushed out
  along its own normal, so `backface-visibility` can hide whichever side is
  round the back. Hinging a side face off an edge instead leaves its normal
  pointing inward, so it renders as a backface and the cover paints over it.
- **Each book turns its outer edge forward** — the opposite of the reference.
  Cards can splay either way because they have no thickness, but turning the
  inner edge forward buries the spine under the neighbour that overlaps it.

Nine books, in five depth tiers. Each step back is scaled down and washed hard
towards the panel's grey — `TIER_SCALE` and `TIER_HAZE` in `src/BookFan.jsx` —
so the set recedes rather than reading as one flat row — the trailing books fall away as if the series keeps going. Slots
scale from their top edge, so a tier's y offset stays its actual top however far
back it sits.

`DROP` sits the whole set lower in the panel, added to every book's y so the arc
keeps its shape and the lead volume just crops a little deeper at the bottom.

`SPREAD` is the one knob over how far the set opens out — lower gathers the
books in behind the lead volume so more of each is tucked away, higher spreads
them across the panel. Both the layout and the cursor's proximity test read it,
so hover targeting follows wherever the books actually sit.

The whole composition is sized past the panel deliberately: the lead book is
taller than the frame and runs off the bottom edge, the way the reference deck's
cards do, so the set fills the panel instead of floating in the middle of it.
The spread has to account for `rotateZ` — splaying a book widens its bounding box
well beyond its own width, and ignoring that throws the outer tiers off the
sides.

The fan is always open — there is no collapsed resting state — so the panel
reads as a set at a glance.

Hover has two halves, because either on its own reads as one flat gesture.

**The lean** is a single pointer shared across the deck, measured against the
panel so a book only half in frame leans by the same rule as the rest. Every
book responds, and how hard it swings scales with how far out it sits, so the
fan flexes as a whole. Swapping the endpoints of `CENTRE_SWING` / `EDGE_SWING`
inverts that.

**The proximity response** is local: the book nearest the cursor unwinds towards
square-on, straightens out of the arc, and is pulled back to full strength out
of the recession gradient — its scrim clears to nothing. Running the cursor along the fan sends a wave through
it and picks each volume out in turn. `NEAR_RANGE` and `STRAIGHTEN` tune it.

Deliberately nothing rises: no book moves towards the viewer and the stacking
order is fixed, so a book can never climb over the one in front of it.

The book width needed for that proximity test is derived from the panel's height
rather than read back per book per frame, which is why `BOOK_HEIGHT`,
`COVER_ASPECT` and `SPINE_RATIO` live in `BookFan.jsx` and are set on the deck as
CSS custom properties — one source of truth instead of the same three ratios
drifting apart across two files.

The glimmer sweeps across all seven together.

Recession is a scrim of the panel's own colour laid over every face of a book,
not opacity on the book itself. Fading the book would make it translucent, so
wherever two books overlap you would read the one behind through the one in
front; a scrim keeps every book solid and washes it towards the background
instead, which is what distance actually looks like. It also sidesteps a trap —
the book is `preserve-3d`, and opacity below 1 anywhere on it would force it
flat and collapse the box back into a card.

It is sized to drop into the empty `Frame 3202` of the SavvyWise website file —
676 x 326.25 on `#E4E4E4` — and scales to any container via container query
units.

## Controls

The fan is always open. Moving the pointer across the panel leans the whole
set towards it, the outer books swinging hardest.

The WebGL viewer at `/?3d` has its own controls:

| Action | Input |
| --- | --- |
| Rotate | drag |
| Zoom | scroll / pinch |
| Pan | right-drag (or two-finger drag) |
| Snap to a view | **Front** / **Spine** / **Back** buttons |
| Turntable (Volume I) | **Spin** |

Each preset has its own aim point, so **Spine** sits on the average of the three
spine normals — the one angle where I, II and III all read at once — while
**Back** centres on the middle of the three back covers.

## How the cover is applied

`CartlandSavvy-SBC-Vol1-Cover-PrintPreset-1.pdf` is a single wrap laid out
`back cover | spine | front cover` with a 45 pt bleed on every side. The PDF's
TrimBox gives the printable area; the dark spine panel sits dead centre and is
found by scanning for near-black columns. That yields three panels in
`public/`: `front.jpg`, `spine.jpg`, `back.jpg`.

Those map one-to-one onto a `BoxGeometry`, whose material order is
`[+X, -X, +Y, -Y, +Z, -Z]`:

- **+Z** front cover, **−X** spine, **−Z** back cover
- **+X, ±Y** a procedurally generated page block (see `makePageTexture`)

Because three.js unwraps each box face in the same direction the wrap is
printed, the artwork stays continuous around both folds — no mirroring or
per-face UV fixes needed.

Physical proportions come from the trim geometry, so the book's aspect is the
real one:

| | inches |
| --- | --- |
| Cover width | 6.083 |
| Cover height | 8.770 |
| Spine | 0.940 |

## Companion volumes

Only Volume I exists as artwork. Volumes II and III reuse it, with one change:
the roman numeral on the spine is rewritten at load time by `restampNumeral` in
`src/restampNumeral.js`.

Both the fan and the 3D viewer share it. Rather than redraw the numeral in an
approximated typeface, it restamps the cover's own glyph — II and III are literally the I repeated, so copying those
pixels keeps the real face, weight, colour and print texture. Nothing is
synthesised. The glyph is located by scanning for the masthead cluster (logo,
VOL, numeral) at the head of the spine rather than by hard-coded coordinates.

**What is still Volume I's artwork on those two books:** both covers, the back
blurb and barcode, and the small rotated "VOL. I" in the spine's title line.
In the fan, the two front tiers carry the named volumes and everything further
back is turned to its back cover rather than claiming a volume number the
artwork cannot spell — the restamp can only repeat
the existing I glyph, so IV and beyond would need a V that does not exist in the
file. The 3D viewer's Back preset does show three identical back covers. Dropping in the real PDFs fixes this
— see below.

## Swapping in another volume

```bash
python3 scripts/slice-cover.py path/to/NewCover.pdf
```

This rewrites the three JPEGs in `public/` and prints the trim dimensions it
measured. If they differ from the table above, update `TRIM` in
`src/Book.jsx` so the proportions follow the new book.

Needs macOS `sips` (PDF rasterising) and ImageMagick (`brew install imagemagick`).
