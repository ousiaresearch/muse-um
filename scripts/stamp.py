#!/usr/bin/env python3
"""Stamp the built output with what the front-door policy asks of every generated
file: the generation time in UTC, the source revision it was built from, and the
source URL.

This runs against dist/ AFTER `npm run build` and BEFORE the gh-pages publish, so
the served JSON carries the stamp rather than the hand-written source carrying a
stale one. Rebuild to change it; never edit the built file.

Usage:  python3 scripts/stamp.py <generatedAt-iso8601-utc> <source-commit-sha>
"""
import json
import sys
from pathlib import Path

SOURCE_REPOSITORY = "https://github.com/ousiaresearch/muse-um"

root = Path(__file__).resolve().parent.parent
dist = root / "dist"

if len(sys.argv) != 3:
    raise SystemExit(__doc__)

generated_at, sha = sys.argv[1], sys.argv[2]
block = {
    "generatedAt": generated_at,
    "generator": "scripts/publish.sh (vite build + scripts/stamp.py)",
    "sourceRepository": SOURCE_REPOSITORY,
    "sourceRevision": f"main@{sha}",
}

for target in (dist / "agent" / "pavilion.json", dist / "art" / "luma-canon.json"):
    doc = json.loads(target.read_text())
    doc["generated"] = block
    target.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print(f"stamped {target.relative_to(root)}  sourceRevision main@{sha[:12]}  {generated_at}")
