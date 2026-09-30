#!/usr/bin/env python3
"""
Recalibrate the palette and ink gates from the artwork itself.

The first draft of the congruency contract set `paletteShare >= 92%` and
`edge_density 24-46` by eye. Both are the wrong kind of number: they describe the
exhibits as if a painting and a rendered room had comparable pixel statistics.

A painting has texture in every square inch; a rendered room has large flat
surfaces. Mean edge density therefore falls out of geometry, not style, and no
amount of ink will lift a room to a painting's value. What is actually
comparable is how much of the frame sits in the palette, and how much of it is
INk — a line colour the artwork genuinely uses and a room can genuinely acquire.

So measure both directly, on the exhibits, and take those as the target.
"""
from __future__ import annotations

import glob
import json
import math
import os
import sys

from PIL import Image, ImageFilter, ImageStat

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

_palette = import_module("art-palette-report")

TOKENS_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "style.tokens.json")
NEAR_DELTA_E = 12.0
INK_DELTA_E = 8.0


def srgb_to_lab(rgb):
    def linear(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (linear(c) for c in rgb)
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx, fy, fz = f(x / 0.95047), f(y), f(z / 1.08883)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a, b):
    return math.sqrt(sum((u - v) ** 2 for u, v in zip(a, b)))


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def stats(image: Image.Image, token_labs, ink_lab):
    small = image.convert("RGB").resize((192, 192), _palette.RESAMPLE_LANCZOS)
    labs = [srgb_to_lab(p) for p in small.convert("RGB").getdata()]
    palette_share = sum(1 for l in labs if min(delta_e(l, t) for t in token_labs) <= NEAR_DELTA_E) / len(labs)
    ink_share = sum(1 for l in labs if delta_e(l, ink_lab) <= INK_DELTA_E) / len(labs)
    luminance = ImageStat.Stat(image.convert("L")).mean[0]
    saturation = ImageStat.Stat(small.convert("HSV")).mean[1]
    edge = ImageStat.Stat(image.convert("L").filter(ImageFilter.FIND_EDGES)).mean[0]
    return palette_share, ink_share, luminance, saturation, edge


def main() -> int:
    with open(os.path.abspath(TOKENS_PATH)) as handle:
        tokens = json.load(handle)
    token_labs = [srgb_to_lab(hex_to_rgb(v)) for v in tokens["palette"].values()]
    ink_lab = srgb_to_lab(hex_to_rgb(tokens["palette"]["ink"]))

    print(f"{'source':26} {'palshare':>9} {'inkshare':>9} {'lum':>7} {'sat':>7} {'edge':>7}")

    exhibit_pal, exhibit_ink = [], []
    for path in sorted(glob.glob("public/art/*.png")):
        if any(t in os.path.basename(path) for t in _palette.EXCLUDE):
            continue
        image = Image.open(path)
        pal, ink, lum, sat, edge = stats(image, token_labs, ink_lab)
        exhibit_pal.append(pal)
        exhibit_ink.append(ink)
        print(f"{os.path.basename(path):26} {pal:8.1%} {ink:8.1%} {lum:7.1f} {sat:7.1f} {edge:7.1f}")

    n = len(exhibit_pal)
    mean_pal = sum(exhibit_pal) / n
    mean_ink = sum(exhibit_ink) / n
    print()
    print(f"EXHIBIT MEAN (the honest target)   palette {mean_pal:.1%}   ink {mean_ink:.1%}")
    print(f"exhibit range                      palette {min(exhibit_pal):.1%}-{max(exhibit_pal):.1%}"
          f"   ink {min(exhibit_ink):.1%}-{max(exhibit_ink):.1%}")

    print()
    for path in sys.argv[1:]:
        if not os.path.exists(path):
            continue
        image = Image.open(path)
        pal, ink, lum, sat, edge = stats(image, token_labs, ink_lab)
        print(f"{os.path.basename(path):26} {pal:8.1%} {ink:8.1%} {lum:7.1f} {sat:7.1f} {edge:7.1f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
