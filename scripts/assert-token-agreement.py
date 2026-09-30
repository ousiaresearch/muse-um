#!/usr/bin/env python3
"""
Guard the style tokens against the artwork they claim to describe.

Every token in src/style.tokens.json is supposed to be measured from the
approved exhibits. If a token is actually invented, nothing downstream notices:
the 3D room gets graded to a colour that does not exist in any painting, and the
palette-lock pass snaps the room toward a fiction.

So this walks the real pixels of every exhibit and asks, for each token, how much
of the artwork actually sits near it in perceptual space. A token with no
representation is a token somebody made up.

    npm run art:tokens        # report
    npm run art:tokens -- --assert   # exit non-zero if a token is unsupported
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

_palette = import_module("art-palette-report")
EXCLUDE = _palette.EXCLUDE

TOKENS_PATH = "src/style.tokens.json"
# A token must cover at least this share of sampled exhibit pixels, or it is
# decoration rather than measurement. ink and sky_deep are legitimately sparse —
# they live in shadow and night field — so the bar is deliberately low.
MIN_SHARE = 0.0005
# ...but a token must at least exist: everything within this distance counts.
NEAR_DELTA_E = 12.0


def srgb_to_lab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    def linear(channel: float) -> float:
        c = channel / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (linear(c) for c in rgb)
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx, fy, fz = f(x / 0.95047), f(y), f(z / 1.08883)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def exhibit_pixels(size: int = 192):
    """Yield sampled pixels from every exhibit, skipping character references.

    Downscaled first: a full-resolution sweep is ~12M pixels and the perceptual
    comparison is O(pixels x tokens) in pure Python. 192x192 per exhibit is
    ~36k samples each and the nearest-token distance is not sensitive to the
    difference.
    """
    for path in sorted(glob.glob("public/art/*.png")):
        if any(token in os.path.basename(path) for token in EXCLUDE):
            continue
        im = Image.open(path).convert("RGB").resize((size, size), _palette.RESAMPLE_LANCZOS)
        for pixel in list(im.getdata()):
            yield pixel


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assert", dest="do_assert", action="store_true")
    args = parser.parse_args()

    with open(TOKENS_PATH) as handle:
        tokens = json.load(handle)["palette"]

    samples = list(exhibit_pixels())
    print(f"Sampled {len(samples):,} exhibit pixels across the set.\n")

    sample_lab = [srgb_to_lab(p) for p in samples]
    token_lab = {name: srgb_to_lab(hex_to_rgb(value)) for name, value in tokens.items()}

    print(f"{'token':14} {'hex':9} {'nearestΔE':>10} {'share':>8}  verdict")
    failures = []
    for name, value in tokens.items():
        target = token_lab[name]
        nearest = min(delta_e(target, lab) for lab in sample_lab)
        share = sum(1 for lab in sample_lab if delta_e(target, lab) <= NEAR_DELTA_E) / len(sample_lab)
        if share < MIN_SHARE:
            verdict = "UNSUPPORTED"
            failures.append(f"{name} ({value}): only {share * 100:.3f}% of exhibit pixels near it")
        else:
            verdict = "supported"
        print(f"{name:14} {value:9} {nearest:10.2f} {share * 100:7.3f}%  {verdict}")

    if args.do_assert and failures:
        print("\nUNSUPPORTED TOKENS:")
        for line in failures:
            print(f"  {line}")
        print("\nA token that does not exist in the artwork is a token somebody invented.")
        return 1

    print("\nEvery token is present in the artwork.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
