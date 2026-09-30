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
import time

from PIL import Image, ImageChops

RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
EDGE = 1024
MARGIN = 0.08
BACKGROUND_TOLERANCE = 42
STUDIO_GREY = (150, 150, 152)
MIN_VIEW_WIDTH = 60
MAGENTA_SPREAD = 48


def is_magenta_family(r: int, g: int, b: int, spread: int = MAGENTA_SPREAD) -> bool:
    """A saturated magenta pixel, including the colours a key bleeds into edges.

    Pure-magenta matching is not enough on its own. An anti-aliased edge between a
    magenta backdrop and the subject, or a region whose alpha was partly
    transparent, lands on a magenta *variant* — and those variants survive a
    tight tolerance, stay in the image, and get baked into the reconstructed
    material. That is not hypothetical: it turned a brass lantern pink.
    """
    return r > 110 and b > 90 and (r - g) > spread and (b - g) > spread


def threshold(level: int):
    """Binary point transform; a named helper keeps the types honest."""

    def apply(value: int) -> int:
        return 255 if value > level else 0

    return apply


def key_out_magenta(image: Image.Image) -> tuple[Image.Image, float]:
    """Replace any magenta-family pixel with the studio backdrop.

    The palette this pavilion draws from contains no magenta at all, so a
    magenta-family pixel is always key residue rather than subject colour.

    Implemented as channel arithmetic rather than a per-pixel Python loop: for a
    1024 square that is 1M iterations of attribute lookup, and this runs on every
    view of every module.
    """
    r, g, b = image.split()
    # r - g and b - g, clamped at zero; a magenta pixel has both clearly positive.
    spread_rg = ImageChops.subtract(r, g).point(threshold(MAGENTA_SPREAD))
    spread_bg = ImageChops.subtract(b, g).point(threshold(MAGENTA_SPREAD))
    bright_r = r.point(threshold(110))
    bright_b = b.point(threshold(90))

    # darker() is a logical AND for binary masks.
    mask = ImageChops.darker(ImageChops.darker(spread_rg, spread_bg), ImageChops.darker(bright_r, bright_b))

    keyed = mask.histogram()[255]
    total = image.size[0] * image.size[1]
    out = image.copy()
    out.paste(STUDIO_GREY, mask=mask)
    return out, keyed / max(1, total)


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


def normalise(view: Image.Image, target: str) -> tuple[tuple[int, int], int, float]:
    trimmed = view
    width, height = trimmed.size
    longest = max(width, height)
    padded = int(longest * (1 + MARGIN * 2))
    square = Image.new("RGB", (padded, padded), STUDIO_GREY)
    square.paste(trimmed, ((padded - width) // 2, (padded - height) // 2))
    square = square.resize((EDGE, EDGE), RESAMPLE_LANCZOS)

    square, keyed_fraction = key_out_magenta(square)
    square.save(target, "JPEG", quality=92, optimize=True)

    # Verify the artifact rather than trusting the transform: reopen what was
    # actually written and re-measure the key residue.
    written = Image.open(target).convert("RGB")
    _, residual = key_out_magenta(written)
    if residual > 0.005:
        raise SystemExit(
            f"REFUSING {target}: {residual * 100:.1f}% of the written image is still magenta-family. "
            "A keyed colour that survives into the reconstruction is baked into the material — "
            "this is exactly how a brass lantern came back pink."
        )

    return trimmed.size, os.path.getsize(target), keyed_fraction


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sheet")
    parser.add_argument("out_dir")
    parser.add_argument("--expect", type=int, help="fail if the slice count differs")
    parser.add_argument("--force", action="store_true", help="slice even if the file was just written")
    args = parser.parse_args()

    # A generation process still running will rewrite its output. Slicing a file
    # that is still being written reads a half-finished image, and the damage is
    # invisible: the slices look plausible, the reconstruction looks plausible,
    # and the defect only shows up in the finished material. That happened here.
    age = time.time() - os.path.getmtime(args.sheet)
    if age < 12 and not args.force:
        print(
            f"REFUSING to slice {args.sheet}: modified {age:.1f}s ago, so a generation "
            "process may still be writing it. Wait for the process to exit, or pass --force.",
            file=sys.stderr,
        )
        return 1

    sheet = Image.open(args.sheet)

    # A model sometimes honours "flat background" by delivering transparency
    # instead of the colour that was briefed. Flattening onto the briefed magenta
    # restores the invariant the slicer depends on, rather than letting whatever
    # happens to sit under the alpha channel (often black) become the backdrop.
    flattened = False
    if sheet.mode in ("RGBA", "LA") or (sheet.mode == "P" and "transparency" in sheet.info):
        rgba = sheet.convert("RGBA")
        alpha = rgba.getchannel("A")
        # histogram() avoids the PIL stubs' disagreement about getdata/getextrema.
        histogram = alpha.histogram()
        low = next(index for index, count in enumerate(histogram) if count)
        if low < 8:
            backdrop = Image.new("RGBA", rgba.size, (255, 0, 255, 255))
            sheet = Image.alpha_composite(backdrop, rgba).convert("RGB")
            flattened = True
        else:
            sheet = rgba.convert("RGB")
    else:
        sheet = sheet.convert("RGB")

    background = border_background(sheet)
    looks_like_magenta = background[0] > 180 and background[1] < 90 and background[2] > 180

    print(f"sheet           {sheet.size[0]}x{sheet.size[1]}")
    if flattened:
        print("background      sheet delivered with transparency; flattened onto the briefed magenta")
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
        size, bytes_written, keyed = normalise(trimmed, target)
        print(
            f"view {index}        {size[0]}x{size[1]} -> {EDGE}x{EDGE}  "
            f"{bytes_written / 1024:.0f} KB  keyed {keyed * 100:.1f}%  {target}"
        )

    print(f"\n{len(runs)} views written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
