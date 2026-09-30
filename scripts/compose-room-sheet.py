#!/usr/bin/env python3
"""
Compose every room's sweep capture into one sheet.

Eight rooms side by side is the only way to see whether the pavilion reads as one
building rather than eight unrelated screens — which is the whole point of the
congruency work, and something no per-room measurement can answer.
"""
from __future__ import annotations

import json
import os
import sys

from PIL import Image, ImageDraw

RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
SWEEP_DIR = os.path.join(ROOT, "artifacts", "sweep")
MANIFEST = os.path.join(ROOT, "src", "pavilion.manifest.json")
TOKENS = os.path.join(ROOT, "src", "style.tokens.json")
CANVAS = (360, 28, 1080, 748)

CELL = 330
LABEL_H = 34
COLS = 4


def main() -> int:
    with open(MANIFEST) as handle:
        rooms = json.load(handle)["rooms"]
    with open(TOKENS) as handle:
        variant = json.load(handle)["stylization"]["variant"]

    rows = (len(rooms) + COLS - 1) // COLS
    sheet = Image.new("RGB", (CELL * COLS, (CELL + LABEL_H) * rows), (9, 8, 14))
    draw = ImageDraw.Draw(sheet)

    missing = []
    for index, room in enumerate(rooms):
        path = os.path.join(SWEEP_DIR, f"{room['id']}.png")
        col, row = index % COLS, index // COLS
        x0 = col * CELL
        y0 = row * (CELL + LABEL_H)

        if not os.path.exists(path):
            missing.append(room["id"])
            draw.text((x0 + 10, y0 + 10), f"{room['name']} (no capture)", fill=(200, 90, 90))
            continue

        shot = Image.open(path).convert("RGB").crop(CANVAS)
        shot.thumbnail((CELL, CELL), RESAMPLE_LANCZOS)
        sheet.paste(shot, (x0 + (CELL - shot.size[0]) // 2, y0 + (CELL - shot.size[1]) // 2))
        draw.text((x0 + 8, y0 + CELL + 6), room["name"].upper(), fill=(232, 228, 220))
        kind = room.get("evidenceStatus", {}).get("status", "framing")
        draw.text((x0 + 8, y0 + CELL + 20), kind, fill=(150, 143, 170))

    out = os.path.join(ROOT, "artifacts", "sweep", "all-rooms.png")
    sheet.save(out)
    print(f"wrote {out} ({sheet.size[0]}x{sheet.size[1]}) variant={variant}")
    if missing:
        print("missing captures: " + ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
