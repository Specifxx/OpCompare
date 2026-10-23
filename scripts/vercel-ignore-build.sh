#!/usr/bin/env bash
# Vercel "Ignored Build Step" — ported from RiftCompare. Wired from vercel.json's
# `ignoreCommand`. Vercel's contract: exit 0 → skip this deployment; exit 1 → build.
#
# WHY. RiftCompare learned that every production build re-renders hundreds of
# database-backed pages and clears the ISR cache, and at 10–30 pushes a day that
# alone exhausted a Neon free-tier transfer allowance every few days (its
# DECISIONS.md, "Network transfer: the deploy cadence was the burn", 2026-09-11).
# OP Compare starts with the same rule rather than relearning it.
#
# THE RULE. A PRODUCTION build happens only when the commit's SUBJECT LINE carries
# the literal marker  [deploy]  (any case). .github/workflows/production-deploy.yml
# lands one such commit on main every Monday at 08:00 UTC; "Run workflow" there, or
# [deploy] in your own commit subject, deploys now. The SUBJECT only — a body that
# discusses the marker must not deploy.
#
# PREVIEWS ARE OFF (owner, 2026-10-17: "reduce the cost on Vercel"; the sister
# sites since 2026-10-14). A preview or development build happens only when the
# commit SUBJECT carries the literal marker  [preview]  (any case), added only
# when the owner asks for a preview of that commit. claude/* branches get no
# deployment at all (vercel.json git.deploymentEnabled). An unreadable message
# never builds a preview. An unknown environment is treated as production. If a
# production commit message cannot be read at all, build (fail open: "never
# deploys" is worse than "deploys too often").
set -u

MARKER='[deploy]'
PREVIEW_MARKER='[preview]'

env="${VERCEL_ENV:-}"
if [ "$env" = "preview" ] || [ "$env" = "development" ]; then
  pmsg="${VERCEL_GIT_COMMIT_MESSAGE:-}"
  if [ -z "$pmsg" ]; then
    pmsg="$(git log -1 --format=%B 2>/dev/null || true)"
  fi
  psubject="$(printf '%s\n' "$pmsg" | head -n 1)"
  if [ -n "$psubject" ] && printf '%s' "$psubject" | grep -qiF -- "$PREVIEW_MARKER"; then
    echo "[vercel-ignore-build] VERCEL_ENV=$env and '$PREVIEW_MARKER' in the commit subject — building the preview that was asked for."
    exit 1
  fi
  echo "[vercel-ignore-build] VERCEL_ENV=$env — previews are off (owner, 2026-10-17): no '$PREVIEW_MARKER' in the commit subject, skipping."
  exit 0
fi

# Production is main only (DECISIONS.md, "Builds skip other branches and docs-only
# releases", 2026-10-23): another branch promoted to production never builds.
ref="${VERCEL_GIT_COMMIT_REF:-}"
if [ -n "$ref" ] && [ "$ref" != "main" ]; then
  echo "[vercel-ignore-build] production build of branch '$ref' — only main deploys, skipping."
  exit 0
fi

msg="${VERCEL_GIT_COMMIT_MESSAGE:-}"
if [ -z "$msg" ]; then
  msg="$(git log -1 --format=%B 2>/dev/null || true)"
fi
if [ -z "$msg" ]; then
  echo "[vercel-ignore-build] cannot read the commit message — building, to fail open."
  exit 1
fi

subject="$(printf '%s\n' "$msg" | head -n 1)"
if printf '%s' "$subject" | grep -qiF -- "$MARKER"; then
  # A release whose changes since the last deployed commit are ALL docs (*.md,
  # docs/) builds nothing new: skip it. Only a non-empty, readable diff of docs
  # alone skips; an empty release commit with nothing since the last deploy, an
  # unknown previous commit or an unreadable diff builds, as before.
  prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
  if [ -n "$prev" ] && files="$(git diff --name-only "$prev" HEAD 2>/dev/null)" && [ -n "$files" ]; then
    if ! printf '%s\n' "$files" | grep -qvE '(\.md$|^docs/)'; then
      echo "[vercel-ignore-build] '$MARKER' in the subject, but only docs changed since $prev — skipping."
      exit 0
    fi
  fi
  echo "[vercel-ignore-build] '$MARKER' in the commit subject — building."
  exit 1
fi

echo "[vercel-ignore-build] no '$MARKER' in the commit subject — skipping. Production deploys weekly, Mondays 08:00 UTC (production-deploy.yml)."
exit 0
