#!/usr/bin/env python3
"""
Normalise a turnaround set before it goes to multi-image-to-3D.

Reconstruction quality depends on the views agreeing with each other: same
framing, same scale, same background, same aspect. A set of images cropped to
different shapes makes the silhouette ambiguous and the mesh comes back
asymmetric for reasons that look like a generator fault but are a framing fault.

So: pad to square (using the border colour, which is the flat backdrop the
turnaround was drawn on), resize to a fixed edge, and re-encode as JPEG. The
last part matters too — base64 inlines these into the request body, and a 3 MB
PNG per view is megabytes of payload for no gain.

    python scripts/prepare-multi-images.py <out-dir> <in1.png> <in2.png> ...
"""
from __future__ import annotations

import os
import sys

from PIL import Image

RESAMPLE_LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")
EDGE = 1024
QUALITY = 92


def border_colour(image: Image.Image) -> tuple[int, int, int]:
    """The backdrop colour, sampled from the corners — the turnaround's own ground."""
    width, height = image.size
    corners = [
        image.getpixel((2, 2)),
        image.getpixel((width - 3, 2)),
        image.getpixel((2, height - 3)),
        image.getpixel((width - 3, height - 3)),
    ]
    return tuple(sum(channel) // len(corners) for channel in zip(*corners))[:3]


def normalise(source: str, target: str) -> tuple[int, int, int]:
    image = Image.open(source).convert("RGB")
    original = image.size

    width, height = image.size
    if width != height:
        edge = max(width, height)
        square = Image.new("RGB", (edge, edge), border_colour(image))
        square.paste(image, ((edge - width) // 2, (edge - height) // 2))
        image = square

    image = image.resize((EDGE, EDGE), RESAMPLE_LANCZOS)
    image.save(target, "JPEG", quality=QUALITY, optimize=True)
    return original, image.size, os.path.getsize(target)


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2

    out_dir = sys.argv[1]
    sources = sys.argv[2:]
    os.makedirs(out_dir, exist_ok=True)

    if not 1 <= len(sources) <= 4:
        print(f"the API accepts 1-4 views; got {len(sources)}", file=sys.stderr)
        return 2

    total = 0
    for index, source in enumerate(sources, 1):
        stem = os.path.splitext(os.path.basename(source))[0]
        target = os.path.join(out_dir, f"{index:02d}-{stem}.jpg")
        original, final, size = normalise(source, target)
        total += size
        print(f"{os.path.basename(source):40} {original[0]}x{original[1]} -> {final[0]}x{final[1]}  {size / 1024:.0f} KB")

    print(f"\n{len(sources)} views, {total / 1024:.0f} KB total, written to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
