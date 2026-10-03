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
