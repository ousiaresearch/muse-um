#!/usr/bin/env python3
"""
Measure a room capture against the MUSE-UM congruency contract.

Scoping matters more than the metrics. A 1440x900 screenshot is mostly page
chrome: dark DOM, label panel, navigation. Measuring the whole frame reports the
chrome's luminance and the chrome's edge density, which is how a first pass at
this reported luminance 31.6 against a band of 70-115 and looked like a much
worse failure than it was. Every gate is measured inside the WebGL canvas only.

Modes:

    measure-capture.py <capture.png> --canvas x0,y0,x1,y1
        Contract gates for one capture, inside the given canvas rect.

    measure-capture.py <a.png> <b.png>
        Derive the canvas rect by diffing two captures that differ only in the
        stylization pass (which is exactly what a full-screen pass changes), then
        report the gates for the second capture inside that rect.

    measure-capture.py <a.png> <b.png> --radial
        Radial falloff profile, as a ratio. The correct test for a multiplicative
        effect: an absolute delta just tracks how bright the content underneath was.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

from PIL import Image, ImageChops, ImageFilter, ImageStat

# Pillow moved these into enums; fall back for older versions.
RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

TOKENS_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "style.tokens.json")
EDGE_THRESHOLD = 4
NEAR_DELTA_E = 12.0
INK_DELTA_E = 8.0
INK_LUM_MAX = 70
INK_EDGE_MIN = 25


def load_rgb(path: str) -> Image.Image:
    return Image.open(path).convert("RGB")


def srgb_to_lab(rgb):
    def linear(channel):
        c = channel / 255.0
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


def derive_canvas(a: Image.Image, b: Image.Image):
    """The canvas is the region a full-screen pass can change."""
    mask = ImageChops.difference(a, b).convert("L").point(
        lambda v: 255 if v > EDGE_THRESHOLD else 0
    )
    return mask.getbbox()


def metrics(image: Image.Image, canvas, palette) -> dict:
    """Contract metrics for one capture region.

    Shared by the single-capture CLI and the room sweep, so a number reported by
    one cannot disagree with the number reported by the other.
    """
    region = image.crop(canvas)
    small = region.resize((192, 192), RESAMPLE_LANCZOS)

    luminance = ImageStat.Stat(region.convert("L")).mean[0]
    saturation = ImageStat.Stat(small.convert("HSV")).mean[1]
    grey = region.convert("L")
    edge_density = ImageStat.Stat(grey.filter(ImageFilter.FIND_EDGES)).mean[0]

    # Ink is a LINE, not a dark AREA. Counting pixels near the ink colour alone
    # reported 20%+ for a room whose frame is mostly dark fog and shadow against
    # an exhibit range of 4-14%. What makes a drawn line is that the dark pixel
    # sits ON an edge, so both conditions are required.
    sampled = 192
    grey_small = grey.resize((sampled, sampled), RESAMPLE_LANCZOS)
    edge_small = grey.filter(ImageFilter.FIND_EDGES).resize((sampled, sampled), RESAMPLE_LANCZOS)
    grey_values = list(grey_small.getdata())
    edge_values = list(edge_small.getdata())
    ink_line_share = sum(
        1
        for g, e in zip(grey_values, edge_values)
        if g < INK_LUM_MAX and e > INK_EDGE_MIN
    ) / len(grey_values)

    token_labs = [srgb_to_lab(hex_to_rgb(v)) for v in palette.values()]
    ink_lab = srgb_to_lab(hex_to_rgb(palette["ink"]))
    labs = [srgb_to_lab(p) for p in small.convert("RGB").getdata()]
    palette_share = sum(
        1 for lab in labs if min(delta_e(lab, t) for t in token_labs) <= NEAR_DELTA_E
    ) / len(labs)
    ink_share = sum(1 for lab in labs if delta_e(lab, ink_lab) <= INK_DELTA_E) / len(labs)

    quant = small.quantize(colors=6).convert("RGB")
    dominant = [
        "#%02x%02x%02x" % rgb
        for _, rgb in sorted(quant.getcolors(192 * 192) or [], reverse=True)[:4]
    ]

    return {
        "luminance": luminance,
        "saturation": saturation,
        "edge_density": edge_density,
        "ink_line_share": ink_line_share,
        "ink_share": ink_share,
        "palette_share": palette_share,
        "dominant": dominant,
        "canvas_pixels": region.size[0] * region.size[1],
    }


def gates(image: Image.Image, canvas, label: str) -> int:
    with open(os.path.abspath(TOKENS_PATH)) as handle:
        tokens = json.load(handle)
    palette, contract = tokens["palette"], tokens["contract"]

    m = metrics(image, canvas, palette)
    luminance = m["luminance"]
    saturation = m["saturation"]
    edge_density = m["edge_density"]
    ink_line_share = m["ink_line_share"]
    ink_share = m["ink_share"]
    palette_share = m["palette_share"]
    dominant = m["dominant"]

    def row(key, low, high, value, as_percent=False):
        ok = low <= value <= high
        shown = f"{value:.1%}" if as_percent else f"{value:.1f}"
        band = f"{low:.1%}-{high:.1%}" if as_percent else f"{low}-{high}"
        return ok, f"{'PASS' if ok else 'FAIL':4} {key:16} {shown:>7}  band {band}"

    print(f"capture: {label}")
    print(f"canvas : {canvas}  ({canvas[2] - canvas[0]}x{canvas[3] - canvas[1]})")
    print()
    print("CONTRACT GATES (canvas only)")
    lum_band = contract["luminance"]
    sat_band = contract["saturation"]
    ink_band = contract["inkLineShare"]
    results = [
        row("luminance", lum_band[0], lum_band[1], luminance),
        row("saturation", sat_band[0], sat_band[1], saturation),
        row("palette_share", contract["paletteShare"], 1.0, palette_share, True),
        row("ink_line_share", ink_band[0], ink_band[1], ink_line_share, True),
    ]
    for _, line in results:
        print("  " + line)
    print()
    print(f"  dominant tones: {' '.join(dominant)}")
    print(f"  edge density (informational, no gate): {edge_density:.1f}")
    print(f"  ink-area share (informational): {ink_share:.1%}")
    print(f"  measured on {m['canvas_pixels']:,} canvas pixels "
          f"of {image.size[0] * image.size[1]:,} in frame")

    failures = [line for ok, line in results if not ok]
    print()
    if failures:
        print(f"{len(failures)} gate(s) failing. A failing gate is a job, not a note.")
        return 1
    print("All reported gates pass.")
    return 0


def radial(path_a: str, path_b: str) -> int:
    a, b = load_rgb(path_a), load_rgb(path_b)
    canvas = derive_canvas(a, b)
    if canvas is None:
        print("The two captures are identical; no canvas can be derived.")
        return 0

    x0, y0, x1, y1 = canvas
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    max_r = math.hypot(x1 - cx, y1 - cy)
    bins = 6
    before = [0.0] * bins
    after = [0.0] * bins
    counts = [0] * bins
    grey_a, grey_b = a.convert("L"), b.convert("L")

    for y in range(y0, y1):
        for x in range(x0, x1):
            index = min(bins - 1, int(math.hypot(x - cx, y - cy) / max_r * bins))
            before[index] += grey_a.getpixel((x, y))
            after[index] += grey_b.getpixel((x, y))
            counts[index] += 1

    print(f"canvas {x1 - x0}x{y1 - y0}, {bins} radial bins, centre to corner")
    print(f"{'bin':>4} {'radius':>12} {'ratio':>8} {'change':>9}")
    ratios = []
    for i in range(bins):
        if not counts[i]:
            ratios.append(None)
            continue
        mean_before = before[i] / counts[i]
        mean_after = after[i] / counts[i]
        ratio = mean_after / mean_before if mean_before else float("nan")
        ratios.append(ratio)
        print(f"{i:>4} {f'{i / bins:.2f}-{(i + 1) / bins:.2f}':>12} {ratio:8.3f} {ratio - 1:+8.1%}")

    valid = [r for r in ratios if r is not None]
    print()
    if len(valid) >= 2 and valid[-1] < valid[0]:
        print("Monotonic outward falloff: the effect behaves multiplicatively as intended.")
        return 0
    print("No outward falloff: the effect is not behaving as a vignette.")
    return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("captures", nargs="+")
    parser.add_argument("--canvas", help="x0,y0,x1,y1 for single-capture mode")
    parser.add_argument("--radial", action="store_true")
    args = parser.parse_args()

    if len(args.captures) == 1:
        if not args.canvas:
            print("Single-capture mode needs --canvas x0,y0,x1,y1, or pass two captures", file=sys.stderr)
            print("so the canvas can be derived by diffing them.", file=sys.stderr)
            return 2
        canvas = tuple(int(v) for v in args.canvas.split(","))
        return gates(load_rgb(args.captures[0]), canvas, args.captures[0])

    a, b = load_rgb(args.captures[0]), load_rgb(args.captures[1])
    if args.radial:
        return radial(args.captures[0], args.captures[1])

    canvas = derive_canvas(a, b)
    if canvas is None:
        print("The two captures are identical, so the canvas cannot be derived. Pass --canvas.")
        return 2
    return gates(b, canvas, args.captures[1])


if __name__ == "__main__":
    raise SystemExit(main())
