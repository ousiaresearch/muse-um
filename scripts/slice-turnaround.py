#!/usr/bin/env python3
"""
Slice a turnaround sheet into individual views for multi-image-to-3D.

Why a sheet rather than separate generations: an image model asked for "the same
lantern from three angles" in three separate calls produces three similar but
different lanterns. Reconstruction then averages three different objects into one
mush. Drawing all views in ONE image and cutting it up is what guarantees they
are the same object.

Cutting is done on runs of background columns — found in the image, never assumed
from even spacing — and the background is detected from the border rather than
trusted to match the brief, because "the model probably used the colour I asked
for" is exactly the assumption that produces silently wrong slices.

Each surviving view is then trimmed to its own silhouette, composited onto a
neutral studio grey with padding to square, and written as a JPEG. Padding to
square with a consistent margin matters: reconstruction reads framing, and views
crop-tight to different shapes make the silhouette ambiguous.

    python scripts/slice-turnaround.py <sheet.png> <out-dir> [--expect 3]
"""
from __future__ import annotations

import argparse
import os
import sys

from PIL import Image

RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
EDGE = 1024
MARGIN = 0.08
BACKGROUND_TOLERANCE = 42
STUDIO_GREY = (150, 150, 152)
MIN_VIEW_WIDTH = 60


def border_background(image: Image.Image) -> tuple[int, int, int]:
    """Most common colour along the border — the sheet's actual backdrop."""
    width, height = image.size
    samples = []
    for x in range(0, width, max(1, width // 200)):
        samples.append(image.getpixel((x, 1)))
        samples.append(image.getpixel((x, height - 2)))
    for y in range(0, height, max(1, height // 200)):
        samples.append(image.getpixel((1, y)))
        samples.append(image.getpixel((width - 2, y)))
    return max(set(samples), key=samples.count)[:3]


def is_background(pixel, background, tolerance=BACKGROUND_TOLERANCE) -> bool:
    return all(abs(int(a) - int(b)) <= tolerance for a, b in zip(pixel[:3], background))


def column_is_empty(image: Image.Image, x: int, background) -> bool:
    width, height = image.size
    for y in range(0, height, max(1, height // 120)):
        if not is_background(image.getpixel((x, y)), background):
            return False
    return True


def find_runs(image: Image.Image, background):
    """Column index runs that contain the object."""
    width, _ = image.size
    runs = []
    start = None
    for x in range(width):
        empty = column_is_empty(image, x, background)
        if not empty and start is None:
            start = x
        elif empty and start is not None:
            if x - start >= MIN_VIEW_WIDTH:
                runs.append((start, x))
            start = None
    if start is not None and width - start >= MIN_VIEW_WIDTH:
        runs.append((start, width))
    return runs


def trim_to_content(view: Image.Image, background):
    width, height = view.size
    xs, ys = [], []
    for y in range(0, height, 2):
        for x in range(0, width, 2):
            if not is_background(view.getpixel((x, y)), background):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return view.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))


def normalise(view: Image.Image, target: str) -> tuple[tuple[int, int], int]:
    trimmed = view
    width, height = trimmed.size
    longest = max(width, height)
    padded = int(longest * (1 + MARGIN * 2))
    square = Image.new("RGB", (padded, padded), STUDIO_GREY)
    square.paste(trimmed, ((padded - width) // 2, (padded - height) // 2))
    square = square.resize((EDGE, EDGE), RESAMPLE_LANCZOS)
    square.save(target, "JPEG", quality=92, optimize=True)
    return trimmed.size, os.path.getsize(target)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sheet")
    parser.add_argument("out_dir")
    parser.add_argument("--expect", type=int, help="fail if the slice count differs")
    args = parser.parse_args()

    sheet = Image.open(args.sheet).convert("RGB")
    background = border_background(sheet)
    looks_like_magenta = background[0] > 180 and background[1] < 90 and background[2] > 180

    print(f"sheet           {sheet.size[0]}x{sheet.size[1]}")
    print(f"background      {background}  {'(magenta as briefed)' if looks_like_magenta else '(NOT the briefed magenta)'}")

    runs = find_runs(sheet, background)
    print(f"views found     {len(runs)}  " + ", ".join(f"{b - a}px" for a, b in runs))

    if args.expect is not None and len(runs) != args.expect:
        print(
            f"\nFOUND {len(runs)} VIEWS BUT EXPECTED {args.expect}. "
            "A mismatch means the sheet did not follow the brief; report it rather than "
            "shipping a partial set.",
            file=sys.stderr,
        )
        return 1

    os.makedirs(args.out_dir, exist_ok=True)
    for index, (start, end) in enumerate(runs, 1):
        view = sheet.crop((start, 0, end, sheet.size[1]))
        trimmed = trim_to_content(view, background)
        if trimmed is None:
            print(f"view {index}: nothing found after background removal", file=sys.stderr)
            return 1
        target = os.path.join(args.out_dir, f"{index:02d}.jpg")
        size, bytes_written = normalise(trimmed, target)
        print(f"view {index}        {size[0]}x{size[1]} -> {EDGE}x{EDGE}  {bytes_written / 1024:.0f} KB  {target}")

    print(f"\n{len(runs)} views written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
