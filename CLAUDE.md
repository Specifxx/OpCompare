# Working in this repo

OP Compare is the One Piece Card Game sister site of RiftCompare
(`Specifxx/TCGEmpire`). Same rules where they apply; read `README.md` first and
`DECISIONS.md` for why things are the way they are.

## Deploys are gated — do not add `[deploy]` to commit subjects

Production builds only for a commit whose SUBJECT LINE carries `[deploy]`
(`scripts/vercel-ignore-build.sh`); `.github/workflows/production-deploy.yml`
lands one a day at 08:00 UTC. "Push to prod" means land it on `main` and ride the
daily release. Add `[deploy]` only when the owner says a release is urgent, and
say so. A commit BODY may discuss the marker; it does not deploy.

## Never call the eBay API

The eBay Browse API quota belongs to RiftCompare. eBay appears here only as
search links built in `src/lib/affiliate.ts`. `tests/no-ebay-api.test.ts` fails
if any file names an eBay API host, OAuth endpoint or `EBAY_CLIENT_*` credential.

## Egress

Pages and API routes read only the loaders in `src/lib/data.ts`. Never import
`@/lib/db` from `src/app`, never add `unstable_cache` outside `src/lib/data.ts`,
never call a loader inside an `unstable_cache` callback, and keep each cache
entry well under 2 MB (`tests/nested-cache.test.ts`). No `generateStaticParams`
prewarming of database-backed routes.

Accounts and billing are the one exception, and a narrow one: `src/lib/auth.ts`
(`getCurrentUser`, one `select`-limited row), `src/lib/premium.ts`,
`src/lib/accounts.ts` and the Stripe routes query per user, uncached, and only
from account pages and `/api/*` routes — never from the root layout, which must
not read the session (the header asks `/api/me`, and only when the `oc_auth`
hint cookie exists). Gated rows are limited in the QUERY, never hidden with CSS.

## Price history lives in GitHub, not Postgres

The import writes history files (`src/lib/history.ts`) that the import workflow
commits to the `data` branch; pages read them from raw.githubusercontent.com
pinned to the commit in `Meta.historyRef`. Never add a history table back to
Prisma, and never push to `data` by hand — it is the workflow's.

## Plus & Premium (Stripe)

Entitlement is `User.premiumUntil` + `premiumTier`, written only by the webhook
and the daily reconcile, extend-only, and only for subscriptions whose Price or
metadata says `site=opcompare` (`src/lib/stripe-entitlement.ts`). `past_due`
never entitles. Prices live in `src/lib/plans.ts` and reach Stripe through
`scripts/stripe-setup.ts` (lookup keys), never through hand-typed price ids.
Changing a price, a tier's features or the trial policy is the owner's call.

## Matching store listings

`src/lib/match.ts` matches a listing to ONE printing or not at all. Add a real
title to `tests/match.test.ts` for every rule you change. Never loosen a rule
to raise the match count; an ambiguous listing is skipped, not guessed.

## Checks

```
npx prisma generate
npm run typecheck
npm run lint
npm test
```

Record non-obvious decisions in `DECISIONS.md` (newest at the bottom).
