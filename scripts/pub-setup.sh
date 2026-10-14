#!/usr/bin/env bash
# Prepare the PUBLIC working copy for a job (lib/pubdb.ts): generate its Prisma
# client, create its tables in the throwaway Postgres (PUBLIC_DATABASE_URL, a
# service container on the runner) and seed it from the `snapshot` branch on
# GitHub, the only persistent copy of the public data.
#
# --accept-data-loss is safe HERE and only here: the database is brand new and
# disappears with the runner. (The Neon database is never touched by this script.)
set -euo pipefail
: "${PUBLIC_DATABASE_URL:?PUBLIC_DATABASE_URL is not set (the postgres service of the workflow)}"
case "$PUBLIC_DATABASE_URL" in
  *neon.tech*|*neon.build*) echo "refusing: PUBLIC_DATABASE_URL points at Neon" >&2; exit 1 ;;
esac
npx prisma generate --schema prisma/public/schema.prisma
npx prisma db push --schema prisma/public/schema.prisma --skip-generate --accept-data-loss
if [ "${PUB_SKIP_SEED:-0}" = "1" ]; then
  echo "pub-setup: PUB_SKIP_SEED=1, leaving the working copy empty."
else
  npx tsx scripts/pub-seed.ts
fi
