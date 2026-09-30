#!/usr/bin/env bash
#
# Capture a MUSE-UM room with a real browser, so a claim about the render can be
# checked against pixels instead of a status code.
#
#   scripts/capture-room.sh <room-id> <output.png> [extra query flags]
#
# Animation is frozen and the stylization passes are switchable, because measuring
# a visual change requires two frames that differ in exactly one thing:
#
#   --still   freeze animation (the default here) so two runs are identical
#   --post0   disable the stylization passes, for an A/B against the default
#   --post1   enable them (the default)
#
# Proven: with animation frozen, two captures of the same configuration are
# pixel-identical. Without that, a rotating prop contributes more changed pixels
# than the effect under test.
set -euo pipefail

CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE_URL="${MUSEUM_URL:-http://127.0.0.1:5173/muse-um/}"

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <room-id> <output.png> [--still|--live] [--post0|--post1]" >&2
  exit 2
fi

ROOM="$1"
OUT="$2"
shift 2

FLAGS="still=1&post=1"
for arg in "$@"; do
  case "$arg" in
    --live)  FLAGS="${FLAGS/still=1/still=0}" ;;
    --still) FLAGS="${FLAGS/still=0/still=1}" ;;
    --post0) FLAGS="${FLAGS/post=1/post=0}" ;;
    --post1) FLAGS="${FLAGS/post=0/post=1}" ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

URL="${BASE_URL}?room=${ROOM}&${FLAGS}"

if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at $CHROME (set CHROME_BIN)" >&2
  exit 1
fi

"$CHROME" --headless=new --disable-gpu \
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader \
  --window-size=1440,900 --virtual-time-budget=30000 --hide-scrollbars \
  --screenshot="$OUT" "$URL" >/dev/null 2>&1

if [ ! -s "$OUT" ]; then
  echo "capture produced no file" >&2
  exit 1
fi

BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "captured $ROOM -> $OUT ($BYTES bytes)  [$FLAGS]"
echo "note: a non-trivial byte count proves the page rendered; it does not prove the scene is correct."
