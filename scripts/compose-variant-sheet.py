#!/usr/bin/env python3
"""
Compose the stylization comparison sheet.

Three variants of one room, cropped to the WebGL canvas so the page chrome does
not flatter or flatten any of them, shown against the exhibit the room is paired
with. The point is to see them at the same scale, in one image, with the measured
numbers printed on each — the decision is a look, but it should be a look taken
with the numbers in the same frame.
"""
from __future__ import annotations

import json
import os
import sys

from PIL import Image, ImageDraw

RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

CANVAS = (360, 28, 1080, 748)
TOKENS = os.path.join(os.path.dirname(__file__), "..", "src", "style.tokens.json")

VARIANTS = [
    ("painterly", "/tmp/variant-painterly.png", "smooth ramp - restrained ink - lock 0.45"),
    ("graphic-novel", "/tmp/variant-graphic-novel.png", "4 hard steps - firm ink - lock 0.70"),
    ("woodcut", "/tmp/variant-woodcut.png", "2 steps - heavy ink - lock 1.00"),
]
EXHIBIT = "public/art/observatory.png"

CELL = 420
LABEL_H = 56


def main() -> int:
    with open(os.path.abspath(TOKENS)) as handle:
        contract = json.load(handle)["contract"]

    cells = []

    exhibit = Image.open(EXHIBIT).convert("RGB")
    exhibit.thumbnail((CELL, CELL), RESAMPLE_LANCZOS)
    cells.append(("Exhibit (the target)", exhibit, "the approved painting this room must sit beside"))

    for name, path, note in VARIANTS:
        if not os.path.exists(path):
            print(f"missing capture: {path}", file=sys.stderr)
            return 1
        shot = Image.open(path).convert("RGB").crop(CANVAS)
        shot.thumbnail((CELL, CELL), RESAMPLE_LANCZOS)
        cells.append((name, shot, note))

    width = CELL * len(cells)
    height = CELL + LABEL_H
    sheet = Image.new("RGB", (width, height), (10, 10, 18))
    draw = ImageDraw.Draw(sheet)

    for index, (name, image, note) in enumerate(cells):
        x = index * CELL + (CELL - image.size[0]) // 2
        y = (CELL - image.size[1]) // 2
        sheet.paste(image, (x, y))
        draw.text((index * CELL + 10, CELL + 8), name.upper(), fill=(232, 228, 220))
        draw.text((index * CELL + 10, CELL + 24), note, fill=(150, 143, 170))
        draw.text(
            (index * CELL + 10, CELL + 40),
            f"exhibit band: palette >={contract['paletteShare']:.0%}  ink {contract['inkLineShare'][0]:.0%}-{contract['inkLineShare'][1]:.0%}",
            fill=(110, 104, 130),
        )

    out = "/tmp/variant-sheet.png"
    sheet.save(out)
    print(f"wrote {out} ({sheet.size[0]}x{sheet.size[1]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
