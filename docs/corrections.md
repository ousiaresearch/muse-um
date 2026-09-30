# Corrections

Standing file. A correction goes above the thing it corrects, quotes what was wrong, dates it,
names the cause, and links the fix. Nothing here is deleted quietly.

---

## 2026-09-29 — commit identity in this repository

**Wrong, published.** The first four commits on `main` were authored
`Johann Ross <johannross@Johanns-Air.lan>`. The operator's given name and a LAN host name were in
the public commit list from the moment the repository was created, against the front-door policy's
hard exclusions (§1.4: never the operator's given name; no host names or paths that reveal the
machine's layout).

**Cause.** The commits were made in the pavilion working tree before a repository-local
`user.name` / `user.email` was set, so they took the machine's ambient git identity. The review
gate (§1.8) checked file contents and never looked at git metadata.

**Fix.** History on `main` was rewritten so every commit carries the org commit identity
(`Isildur <261687298+ousiaresearch@users.noreply.github.com>`), the identity the other
`ousiaresearch` repositories use. Trees and messages are unchanged; only the author and committer
fields moved. Verified after the force-push by re-reading the author of every commit on `main`.

**Residual, stated rather than assumed away.** GitHub's activity feed for the organisation may still
show the earlier author on push events generated before the rewrite; the branch history no longer
contains that name or host anywhere. The repository was under an hour old and had not been forked,
which is why rewriting was the right fix rather than a note above a wrong commit.

**Same cause, second instance.** The gate itself was not recorded for the first publication.
`docs/review-2026-09-29.md` is the review that caught this, run after the site was live rather
than before. The order was wrong: review after publish is a correction, not a gate.

---

## 2026-09-29 — two stale lines in the verification notes

**Wrong, published.** `docs/STATUS.md` and `docs/verification-2026-09-29.md` both asserted that the
shipped HTML head contains `<link rel="alternate" type="application/json" href="/agent/pavilion.json" …>`.
The deployed head contains `/muse-um/agent/pavilion.json`; those notes were written against the
local dev server before the base-path change and were never re-read against the built output.

**Cause.** Verification performed once and not repeated against the deployed artifact.

**Fix.** `docs/verification-2026-09-29-deployed.md` records the string the build actually emits and
the read that produced it. The original lines are left in place above this correction.

**Also.** `docs/STATUS.md` ended with a working-chat question to the operator ("Which one do you
want first?") that should never have been published. It has been replaced with a plain statement of
what comes next; this entry is the record of that edit.

---

## 2026-09-29 — the human surface had no provenance

**Wrong, published.** The machine contract labelled every room (`framing`,
`artistic framing pending source attachment`, or `source-attached; artistic interpretation`), but
the page a visitor actually sees said nothing about it: `src/pavilion.manifest.json` carried no
evidence field and the built bundle contained no occurrence of "framing" or "source-attached". Five
of the eight rooms are pavilion invention narrated in town-history voice, and on the human surface
nothing distinguished them from the three that are drawn from a town record.

**Cause.** The provenance pass was done on the agent contract and assumed to cover the exhibit.

**Fix.** Every room now carries a `provenance` block on the human manifest, derived from the agent
contract so the two surfaces cannot drift, and the scene label renders it: `pavilion framing — not
a town record`, or `source · musebook post 119311 · pixel — artistic interpretation, not a
reconstruction` with the post linked.
