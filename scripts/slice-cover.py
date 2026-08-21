#!/usr/bin/env python3
"""Slice a print-ready wrap cover PDF into front / spine / back textures.

The wrap is laid out back-cover | spine | front-cover with a bleed margin on
every side. This reads the PDF's TrimBox to strip the bleed, finds the spine by
looking for the dark panel in the middle of the page, and writes the three
panels into public/.

Usage:  python3 scripts/slice-cover.py path/to/cover.pdf

Requires macOS `sips` (PDF rasterising) and ImageMagick `magick`.
"""

import os
import re
import subprocess
import sys
import tempfile

RENDER_WIDTH = 8000  # rasterise wide, then downsample for clean text
TEXTURE_HEIGHT = 2028
PROBE_WIDTH = 4000  # cheap pass used only to locate the spine
DARK = 100  # 0-255; the spine panel is near-black, the covers are near-white


def run(*cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def boxes(pdf):
    """Return (media, trim) boxes in points, straight out of the PDF source."""
    data = open(pdf, "rb").read()
    media = re.search(rb"MediaBox\s*\[([^\]]*)\]", data)
    trim = re.search(rb"TrimBox\s*\[([^\]]*)\]", data)
    if not media:
        sys.exit("No MediaBox found — is this a PDF?")
    parse = lambda m: [float(v) for v in m.group(1).split()]
    return parse(media), parse(trim) if trim else parse(media)


def find_spine(png, width):
    """Return the (start, end) pixel columns of the dark spine panel."""
    out = subprocess.run(
        ["magick", png, "-colorspace", "gray", "-resize", f"{width}x1!", "txt:-"],
        check=True, capture_output=True, text=True,
    ).stdout
    cols = [
        int(m.group(1))
        for m in re.finditer(r"(\d+),0: \(([\d.]+)", out)
        if float(m.group(2)) < DARK
    ]
    if not cols:
        sys.exit("Could not find a dark spine panel; slice the cover by hand.")
    return min(cols), max(cols) + 1


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pdf = sys.argv[1]
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "public")

    (_, _, mw, mh), (tx0, ty0, tx1, ty1) = boxes(pdf)

    with tempfile.TemporaryDirectory() as tmp:
        probe = os.path.join(tmp, "probe.png")
        big = os.path.join(tmp, "big.png")
        run("sips", "-s", "format", "png", "--resampleWidth", str(PROBE_WIDTH),
            pdf, "--out", probe)
        run("sips", "-s", "format", "png", "--resampleWidth", str(RENDER_WIDTH),
            pdf, "--out", big)

        height = int(subprocess.run(
            ["magick", "identify", "-format", "%h", big],
            check=True, capture_output=True, text=True).stdout)

        sx, sy = RENDER_WIDTH / mw, height / mh
        probe_scale = RENDER_WIDTH / PROBE_WIDTH
        s0, s1 = (round(v * probe_scale) for v in find_spine(probe, PROBE_WIDTH))

        # PDF y runs bottom-up; image y runs top-down.
        top = round((mh - ty1) * sy)
        bottom = round((mh - ty0) * sy)
        left = round(tx0 * sx)
        right = round(tx1 * sx)
        h = bottom - top

        cover_w = s0 - left
        panels = {
            "back": (cover_w, left),
            "spine": (s1 - s0, s0),
            "front": (right - s1, s1),
        }
        for name, (w, x) in panels.items():
            tw = max(1, round(TEXTURE_HEIGHT * w / h))
            run("magick", big, "-crop", f"{w}x{h}+{x}+{top}", "+repage",
                "-resize", f"{tw}x{TEXTURE_HEIGHT}!", "-strip",
                "-quality", "92", os.path.join(out_dir, f"{name}.jpg"))
            print(f"{name}.jpg  {tw}x{TEXTURE_HEIGHT}  (from {w}x{h}px)")

    print(f"\nTrim: cover {cover_w / sx / 72:.3f} in wide, "
          f"spine {(s1 - s0) / sx / 72:.3f} in, "
          f"height {(ty1 - ty0) / 72:.3f} in")
    print("Update TRIM in src/Book.jsx if these differ from the current values.")


if __name__ == "__main__":
    main()
