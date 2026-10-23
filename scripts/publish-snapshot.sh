#!/usr/bin/env bash
# Force-push SNAPSHOT_DIR (default .snapshot-out, built by scripts/price-snapshot.ts)
# as the single commit of the `snapshot` branch: the ONLY persistent copy of the
# public data (catalogue, offers, eBay state). Needs REMOTE (the authenticated
# repository URL) and a runner that holds the newest snapshot as its seed, so the
# new commit supersedes it (the import and eBay jobs share one concurrency group,
# so they never both publish from the same seed).
set -euo pipefail
: "${REMOTE:?REMOTE is not set}"
cd "${SNAPSHOT_DIR:-.snapshot-out}"
git init --quiet -b snapshot
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
# Vercel must never build this branch.
printf '{\n  "git": { "deploymentEnabled": false }\n}\n' > vercel.json
printf '# OP Compare price snapshot\n\nThe public data (catalogue, prices, offers, eBay state), rebuilt by the Import prices and eBay prices workflows on main and force-pushed as a single commit (no history). This branch is the only copy: Neon holds none of it. See src/lib/price-snapshot.ts there.\n' > README.md
git add -A
# Did the DATA change? Compare every file but meta.json (its generatedAt differs on
# every build) with the published snapshot. The answer goes to $GITHUB_OUTPUT as
# `changed`, so the import refreshes the site's cache only when there is something
# new to show (DECISIONS.md, "Purge the site's cache only when the data changed").
# Anything that cannot be compared counts as changed (fail open: a purge too many
# is cheaper than prices that never reach the pages).
changed=true
if git fetch --quiet --depth 1 "$REMOTE" snapshot 2>/dev/null; then
  new_sum="$(git ls-files -s | awk '$4 != "meta.json" {print $2, $4}' | sha256sum)"
  old_sum="$(git ls-tree -r FETCH_HEAD | awk '$4 != "meta.json" {print $3, $4}' | sha256sum)"
  if [ "$new_sum" = "$old_sum" ]; then changed=false; fi
fi
echo "snapshot data changed: $changed"
if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "changed=$changed" >> "$GITHUB_OUTPUT"; fi
git commit --quiet -m "Price snapshot $(date -u +%F) $(date -u +%H:%M)"
git push --quiet --force "$REMOTE" snapshot
echo "snapshot published"
