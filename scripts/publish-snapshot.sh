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
git commit --quiet -m "Price snapshot $(date -u +%F) $(date -u +%H:%M)"
git push --quiet --force "$REMOTE" snapshot
echo "snapshot published"
