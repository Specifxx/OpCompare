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

msg="${VERCEL_GIT_COMMIT_MESSAGE:-}"
if [ -z "$msg" ]; then
  msg="$(git log -1 --format=%B 2>/dev/null || true)"
fi
if [ -z "$msg" ]; then
  echo "[vercel-ignore-build] cannot read the commit message — building, to fail open."
  exit 1
fi

subject="$(printf '%s\n' "$msg" | head -n 1)"
# ── AT MOST ONE PRODUCTION BUILD EVERY 12 HOURS (owner, 2026-11-02) ─────────
# Vercel cost Nov 1 was $11.82 against a $5–6 a day ceiling, and Build CPU was
# the largest line: the [deploy] gate held, but sessions landed 7–14 [deploy]
# commits a day per site ("deploy it now" manual releases). So a [deploy]
# commit within MIN_GAP_HOURS of the last production deployment is skipped and
# rides the next release. [urgent] in the SUBJECT overrides it, only when the
# owner says a release cannot wait. The last deployment is
# VERCEL_GIT_PREVIOUS_SHA (Vercel sets it in this step); when it is unset or
# cannot be read, build (fail open).
MIN_GAP_HOURS="${MIN_GAP_HOURS:-12}"
recent_production_build() {
  printf '%s' "$subject" | grep -qiF -- '[urgent]' && return 1
  local prev="${VERCEL_GIT_PREVIOUS_SHA:-}" prev_ts now
  [ -z "$prev" ] && return 1
  if ! git cat-file -e "${prev}^{commit}" 2>/dev/null; then
    GIT_TERMINAL_PROMPT=0 timeout 30 git fetch --quiet --deepen=200 origin >/dev/null 2>&1 || true
  fi
  prev_ts="$(git show -s --format=%ct "$prev" 2>/dev/null || true)"
  [ -z "$prev_ts" ] && return 1
  now="${NOW_EPOCH:-$(date +%s)}"
  [ $(( now - prev_ts )) -lt $(( MIN_GAP_HOURS * 3600 )) ]
}
if [ "$env" != "preview" ] && [ "$env" != "development" ] \
  && printf '%s' "$subject" | grep -qiF -- '[deploy]' && recent_production_build; then
  echo "[vercel-ignore-build] [deploy] in the subject, but production last built under ${MIN_GAP_HOURS}h ago (${VERCEL_GIT_PREVIOUS_SHA:0:7}) — skipping; it rides the next release. [urgent] in the subject overrides."
  exit 0
fi

if printf '%s' "$subject" | grep -qiF -- "$MARKER"; then
  echo "[vercel-ignore-build] '$MARKER' in the commit subject — building."
  exit 1
fi

echo "[vercel-ignore-build] no '$MARKER' in the commit subject — skipping. Production deploys weekly, Mondays 08:00 UTC (production-deploy.yml)."
exit 0
