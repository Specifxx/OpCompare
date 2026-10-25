# Working in this repo

OP Compare is the One Piece Card Game sister site of RiftCompare
(`Specifxx/TCGEmpire`). Same rules where they apply; read `README.md` first and
`DECISIONS.md` for why things are the way they are.

## One host: www.opcompare.app

Search engines see ONE host (owner, 2026-10-25): `www.opcompare.app` (`CANONICAL_HOST`,
`SITE_URL` in `src/lib/site.ts`). The apex answers every path with a 301 to it
(`next.config.js`); canonicals, the sitemaps, robots.txt's Sitemap lines, Open Graph and
JSON-LD are all built from `SITE_URL`, never a hard-coded host (`tests/seo-host.test.ts`
walks `src`, `scripts` and the workflows). Two endpoints stay answerable on the apex
because their sender registered that URL and does not follow a redirect: the Stripe webhook
and eBay's Marketplace Account Deletion route. `NEXT_PUBLIC_SITE_URL` and the GitHub variable
`SITE_URL` must be unset or `https://www.opcompare.app`, never the apex. The sitemap lists only
indexable 200 pages: a page that sets `noindex` (a Leader with under two decks) is not in it.

## Deploys are gated — do not add `[deploy]` to commit subjects

Production builds only for a commit whose SUBJECT LINE carries `[deploy]`
(`scripts/vercel-ignore-build.sh`); `.github/workflows/production-deploy.yml`
lands one a WEEK, Mondays at 08:00 UTC. "Push to prod" means land it on `main` and
ride the weekly release. Add `[deploy]` (or dispatch the workflow) only when the
owner says a release is urgent, and say so. A commit BODY may discuss the marker;
it does not deploy. Previews are off (owner, 2026-10-17): a preview builds only
for a `[preview]` SUBJECT the owner asked for, and `claude/*` branches never
deploy (`vercel.json`). The site is meant to run passively on the free Neon allowance
(5 GB a month): prices and eBay listings reach pages through the GitHub price
snapshot, not a deploy, and only code changes wait for the release.

## The database: OP3 holds private state only

The connection string is the variable `OP3` (Vercel and GitHub, a secret or a
repository variable), falling back to `OP2`, then `DATABASE_URL` (`src/lib/db-url.ts`). Neon
holds ONLY private state: users, alerts, watches, collections, inbox, Stripe,
`ImportRun`, `Meta`, `Counter`, `CardDemand`. The public data (sets, cards, sealed,
offers, eBay panels and checks) is NOT in Neon: the `snapshot` branch on GitHub is
its only copy (`src/lib/price-snapshot.ts`, format and rules at its top). Pages read
it through `price-snapshot-read.ts` (`data.ts` loaders); alerts, newsletter and admin
read rows through `public-data.ts` / `public-db.ts` (a Prisma-shaped read-only client).

- Jobs that change prices (`import-prices.yml`, `ebay-prices.yml`) run a throwaway
  Postgres service (`PUBLIC_DATABASE_URL`, schema `prisma/public/schema.prisma`),
  seed it from the snapshot (`scripts/pub-setup.sh`), run the import or eBay pass on
  it through `pub` (`src/lib/pubdb.ts`, which refuses a Neon URL), rebuild the
  snapshot (`scripts/price-snapshot.ts`) and force-push it
  (`scripts/publish-snapshot.sh`). A failed build or publish fails the run.
- A snapshot file that cannot be read THROWS; null only means "the snapshot has no
  such thing". Never read the retired models (Card, Sealed, Set, Offer, Ebay*) through
  `prisma`: `tests/public-data.test.ts` fails on it. No page, component or API route
  imports `pubdb`, `pub-seed` or the builder.
- Never add a private table to the snapshot or a public one to Neon
  (`tests/price-snapshot.test.ts`). View/search counters are `CardDemand`.
- Rollout order (one time): `move-public-data.yml` (bootstrap the snapshot from Neon)
  → run import and eBay → deploy → `retire-public-tables.yml` with `drop`.

## The eBay API: OP Compare's own keyset, script-side only

- It runs only from `scripts/ebay.ts`, via `.github/workflows/ebay-prices.yml`
  (once a day, 12:37 UTC; exactly the 2,500 Browse calls a day, `DAILY_CALL_CAP`, counted per eBay quota day from 07:00 UTC
  in `src/lib/ebay-plan.ts`). No page, route, Vercel cron or the store import calls
  or imports it.
- eBay API hosts appear only in `src/lib/ebay*.ts`; the `EBAY_CLIENT_*`
  credentials only there and in `ebay-prices.yml` (`tests/no-ebay-api.test.ts`).
  `scripts/ebay.ts` asks `isEbayEnabled()` and never names them.
- Never RiftCompare's keyset (it would spend RiftCompare's quota silently), and
  never on Vercel: the credentials are GitHub Actions secrets only.
- eBay is off until both secrets exist (a green no-op run); keys set but
  refused fail the run red.
- **Who gets a search (owner, 2026-10-24).** Nothing under US$20 is ever searched
  (US$40 in the EU; `EBAY_MIN_VALUE_CENTS` can only raise it, `SINGLES_ABS_MIN_CENTS`
  is the hard floor), singles and sealed alike, whatever the demand; the pass also
  sweeps eBay rows an earlier run left under the floor. Above it, products visitors
  search and open (`CardDemand`; `sealedview:<id>` Counter rows for sealed, written by
  `SealedViewBeacon` and the sealed quick view) are HOT (`HOT_DEMAND_POINTS`) and, with
  singles of US$100+, refreshed every 48h and first in the queue; the rest rotate every
  72h, most overdue first, price × (1 + demand) breaking ties. Never rank by price alone
  again, never add a depth-by-budget floor back (`marketFloors` is gone on purpose).
- The budget is `min(EBAY_MAX_CALLS, remaining − EBAY_QUOTA_RESERVE)` per run
  (unknown `remaining` → daily limit minus our last-24h spend; the cap is at
  most half the spendable day); `spendable` starts at 0 and every Browse call
  goes through `spend()`. Searches failing without a 429 trip the breaker and
  fail the run red; every run records `spent`, even when it throws.
- Writes are per (product, market) pair, after a COMPLETED search only: a
  failed, 429'd or budget-refused search touches nothing.
- Never loosen the matcher to raise eBay matches; eBay-only rules live in
  `src/lib/ebay-match.ts`, each with a real title in `tests/ebay-match.test.ts`.
  No eBay price is trusted without a reference: TCGplayer's market price, or
  for an unpriced launch product the cheapest non-eBay offer.
- eBay rows are never re-ranked (item price, like every row), never in alerts
  or the Buy List Planner's baskets, never counted as a store, and never
  "delivered" without known postage. No "money back"/"buyer protection" copy.
- The eBay listing panels (`EbayListing`: the first 8 survivors with the
  headline pick first; `EbayGradedListing`: PSA/BGS/CGC/SGC slabs) are captured
  by `scripts/ebay.ts` from the SAME Browse search the price pass already makes:
  zero extra calls, written in `writePair`'s transaction after a COMPLETED search
  only, swept at 72 h, read through `getEbayPanel` / `getEbayPicks` in
  `src/lib/data.ts`. Those rows are display-only: never ranked into a price row,
  never in alerts or baskets, never counted as a store, and a slab never becomes
  an Offer or enters a comparison. Pages still never call eBay.
- The Marketplace Account Deletion route
  (`src/app/api/ebay/marketplace-deletion`) must stay deployed while the keyset
  exists.
- Changing a floor, share or interval in `src/lib/ebay-plan.ts` updates
  `tests/ebay-plan.test.ts`, the methodology copy and DECISIONS.
- Never dispatch *eBay prices* within 07:00–08:10 or 19:00–20:10 UTC: it shares
  the import's concurrency group and can cancel a pending import.

## Self-monitoring: the owner is not watching

The owner does not check Neon, GitHub or the admin pages. The site tells them.
`scripts/watchdog.ts` (`.github/workflows/watchdog.yml`, every eight hours) gathers
every limit and health signal (`src/lib/health-collect.ts`), judges it with the pure
evaluators in `src/lib/health.ts`, stores one report in Meta `health:report` for
`/admin` and `/admin/health`, and emails **bill.jyang101@gmail.com** (`OWNER_EMAIL`)
about new, worsened and cleared problems, plus a Monday summary. Every new inbox
item is emailed to the owner by the hourly outbox (`src/lib/owner-notify.ts`).

- A new thing that can silently break (a job, a limit, a data source) gets a check
  in `health.ts` and a test in `tests/health.test.ts`; a new scheduled workflow goes
  in `JOBS` there. A feature is not done until the watchdog would notice it failing.
- The watchdog must keep working when something else is broken: every collector is
  guarded and a source it cannot read is `unknown` (shown, never alerted, never a
  false ok). It never calls eBay, never writes anything but its own Meta rows, and
  its issue fallback is on a PUBLIC repository: status and counts only, never a
  visitor's text, address or name (`tests/health.test.ts` pins it).
- `owner-notify.ts`, `health-collect.ts` and `health-issue.ts` are script-side:
  nothing under `src/app` or `src/components` may import them
  (`tests/no-email-api.test.ts`, `tests/health.test.ts`).
- The mail keys appear only in `email.ts` and the `email*`, `import-prices` and
  `watchdog` workflows; the eBay keys never in `health.ts`.

## Egress

Pages and API routes read only the loaders in `src/lib/data.ts`. Never import
`@/lib/db` from `src/app`, never add `unstable_cache` outside `src/lib/data.ts`,
never call a loader inside an `unstable_cache` callback, and keep each cache
entry well under 2 MB (`tests/nested-cache.test.ts`). No `generateStaticParams`
prewarming of database-backed routes.

`/card/[slug]` is ONE CACHED COPY PER CARD, KEPT BY VERCEL'S CDN (owner,
2026-10-14; ISR until 2026-10-17, when ISR writes were the largest line of the
bill): `dynamic = "force-dynamic"` with `Vercel-CDN-Cache-Control: public,
s-maxage=21600, stale-while-revalidate=86400` from `next.config.js`
(`CDN_PAGES`), never `revalidate` or `generateStaticParams` again, and nothing
in its tree reads a cookie, a header or the session (`getCountry()` included;
`tests/card-isr.test.ts` walks its imports). It renders on the baseline
market (`DEFAULT_COUNTRY`, the US), and its metadata and JSON-LD state that
market and currency. Every market-dependent part (tiles, buy block and sticky
bar, board, TCGplayer reference and banners, chart, prose, FAQ, markets table,
eBay panel) is computed on the server for all six markets (`lib/per-market.ts`,
board rows in `lib/board-model.ts`) and drawn by the client islands in
`src/components/card/CardMarket.tsx`, which pick the market `CountryProvider`
resolves; they never import the store registry, a loader or the database. A
loader the page reads must be held at least six hours: Next keeps the lowest
`revalidate` any cached read declares, so a shorter TTL becomes the page's.

Accounts and billing are the one exception, and a narrow one: `src/lib/auth.ts`
(`getCurrentUser`, one `select`-limited row), `src/lib/premium.ts`,
`src/lib/accounts.ts` and the Stripe routes query per user, uncached, and only
from account pages and `/api/*` routes — never from the root layout, which must
not read the session (the header asks `/api/me`, and only when the `oc_auth`
hint cookie exists). Gated rows are limited in the QUERY, never hidden with CSS.
The wave-2 member libraries join that exception on the same terms
(per-user or per-request, uncached, `select`-limited, called only from `/api/*`
routes and account pages — `/watching`, `/dashboard`, `/profile`,
`/portfolio/**`, `/c/[token]`, plus two dynamic pages that read one member's own row
and nothing else: `/tools/best-basket` (their deck watch and remembered minimum
condition) and `/alerts/action` (a signed action token) — never from the root
layout or a public page; `tests/app-no-db-import.test.ts` pins the set):
`src/lib/{watchlist-server,collection-server,collection-share,set-owned,notifications,sealed-watch,deck-watch,published-decks-server}.ts`.
The collection-alerts libraries do the same, for token- or per-request reads and writes only:
`src/lib/{alert-routes,alert-subscribe,alert-mute,alert-actions,newsletter-signup}.ts`
and `src/lib/launch-promo.ts` (called from `accounts.ts` at sign-up; the popup reads the counter
through `/api/promo` and `getLaunchPromo()` in `data.ts`, never the table)
(the unsubscribe and action tokens, the anonymous watch door and the newsletter signup; none imports
the mail module). Nothing under `src/app` imports `src/lib/email.ts` or a module that sends
(`tests/no-email-api.test.ts`): every email is sent script-side from GitHub Actions, only once
both mail secrets exist, and pages decide what to promise from `getEmailStatus()`.
Nothing under `src/app` imports `@/lib/db` (`tests/app-no-db-import.test.ts`).
Admin pages read through uncached `src/lib/admin*.ts`; public forms write
through `src/lib/inbox.ts`. Share images read only `src/lib/data.ts` loaders
(see "Share images").

## Last known prices are display only

Where a card has no price in a market, tiles, the price guide, the QuickView and
the card page's tile show its last known price (`src/lib/last-known.ts`): the
sold-out row the card page shows as "Last seen" there (its own `lastSeen`, never
a second copy), else the newest day of that printing's own history with a
headline price there, muted and labelled "Last known price · <date>". The card
page's price chart says "Last recorded price", muted, instead of "Now" in a
market with no live price. It lives only in fields named
`lastKnown` (the snapshot's `prices.json.gz`, `CardLite`, the QuickView payload,
`MarketTile`) and is never read by a sort, filter, ranking, index, movers,
deals, Rising/Demand, alerts, baskets, collection values, an eBay reference, a
"cheapest"/"from" claim, JSON-LD, titles or descriptions, share images or the
sitemap. A file that starts reading it fails `tests/last-known.test.ts`.

## Price history lives in GitHub, not Postgres

The import writes history files (`src/lib/history.ts`) that the import workflow
commits to the `data` branch; pages read them from raw.githubusercontent.com
pinned to the commit in `Meta.historyRef`. Never add a history table back to
Prisma, and never push to `data` by hand — it is the workflow's.

## Plus & Premium (Stripe)

Entitlement is `User.premiumUntil` + `premiumTier`, written only by the webhook,
the daily reconcile, the admin grant/revoke routes (`src/lib/admin-billing.ts`,
admin session only, audited) and the launch promotion's single claim
(`src/lib/launch-promo.ts`: the first 50 NEW accounts get 30 days of Premium,
taken by one atomic capped upsert on the `Counter` row `launch-promo` in the
same transaction as the grant, called only from `upsertOAuthUser` for the row it
just created; `tests/launch-promo.test.ts` pins it), extend-only except an
explicit admin revoke, and
Stripe writes only for subscriptions whose Price or metadata says
`site=opcompare` (`src/lib/stripe-entitlement.ts`). `past_due`
never entitles. Prices live in `src/lib/plans.ts` and reach Stripe through
`scripts/stripe-setup.ts` (lookup keys), never through hand-typed price ids.
Changing a price, a tier's features or the trial policy is the owner's call.

## Admin access: one helper, every page and route, fail closed

An admin is `SessionUser.isAdmin` (`User.isAdmin` or `isAdminEmail`, from
`src/lib/admin-emails.ts`: the built-in `mastermisclick@gmail.com`, which
`ADMIN_EMAILS` REPLACES when set). Nothing else decides it. Every
`src/app/admin/**` page calls `requireAdminPage()` first (the layout is chrome,
not the gate) and every `src/app/api/admin/**` route calls `requireAdminApi()`
first, both from `src/lib/admin.ts`; `tests/admin.test.ts` walks the tree and
fails on a page or route that doesn't. Fail closed: no session, no admin flag,
an error or a missing env var means a 404 (pages) or 401/403 (APIs), never
the page. Mutations are POST + same-origin + JSON, and log with `adminLog`.
`ADMIN_TOKEN` is optional, for scripts, header-only (`Authorization: Bearer`),
at least 32 characters, and never in a URL, a query string or client props.
`/admin` stays out of robots, the sitemap, GA and the public UI (only an
admin's own account menu links it).

## Share images (link thumbnails)

Every `src/app/**/opengraph-image.tsx` is a thin route: it exports only
`runtime = "nodejs"`, `revalidate = 86400`, `alt`, `size` (1200×630),
`contentType`, `default` and, in a route with a `[slug]`, an EMPTY
`generateStaticParams` (without it Next 14 draws a `[slug]` image on every
request, whatever `revalidate` says), and calls a loader-and-draw function in
`src/lib/og/images.tsx` (compositions in `compose.tsx`, pure selection in
`select.ts`). `tests/og.test.ts` pins this.

- **Cached a day, drawn at most once a day (owner, 2026-10-14).** Each image is
  ISR: drawn on its first request, never at build (`/` and `/price-guide` are
  prerendered), then served from the cache for a day. Nothing in a route's tree
  may read the request (no `cookies()`, `headers()`, `getCountry()`,
  `unstable_noStore`, `cache: "no-store"`, `force-dynamic`): `tests/og.test.ts`
  walks each route's imports. The images read the day-old IMAGE loaders
  (`getCatalogForImages`, `getSealedCatalogForImages`, `getSiteStatsForImages`,
  `postContextForImages`): the pages' 6-hour, `prices`-tagged loaders would cut
  every image to six hours and redraw all of them after each import (Next keeps
  the lowest `revalidate` any cached read declares). Pages never read the image
  loaders. Any loader an image reads must be held at least a day.
- **What each shows.** `/` and every page without its own image: the price
  guide (logo, "ONE PIECE PRICE GUIDE", card/store/market counts, five real
  top cards with art, printing, cheapest US price, TCGplayer market, number and
  store count or 7-day change). `/price-guide`: the same with the guide footer.
  `/sets/[slug]`: the set's top five cards (or its release date when unpriced).
  `/sealed/[slug]`: product art on a white plate with its price.
  `/card/[slug]`: card art, printing and rarity chips, and per-market prices.
  `/blog/[slug]`: the title beside three hero cards.
- **Real data only,** from the cached `src/lib/data.ts` loaders (no Offer or
  per-card query). Any error, empty database or unknown slug draws the
  data-free fallback image, never a 500 and never invented numbers; the
  fallback also cuts its render's ISR life to a minute (`fallbackOg`,
  `expireRenderAfter`), so it is never cached for the day a real image is. A
  slug the day-old catalogue lacks is looked up in the pages' catalogue first.
- **Page metadata:** a page's `openGraph` replaces the root's whole object, so
  build it with `pageOg(canonicalPath)` (keeps site name/locale/type, sets
  `og:url`, re-adds the default image) or, beside its own
  `opengraph-image.tsx`, `pageOgOwnImage(path)`, which has no `images` key:
  the key alone blocks the sibling file (`src/lib/og/meta.ts`). The root layout
  sets no `og:url`. Images send a one-day CDN header, the fallback one minute.
- **Safe area:** content inside x 48–1152, y 30–612; nothing essential below
  ~575 (Reddit and X overlay the domain there); the centre square
  (x 285–915) always holds real content.
- **Fonts:** the bundled TTFs in `src/lib/og/fonts/` (Luckiest Guy, Archivo
  900, Inter 600/700, JetBrains Mono 700; licences beside them), traced in by
  `next.config.js`. TTF/OTF only, never WOFF2; no emoji or flag glyphs. Follow
  the satori rules at the top of `compose.tsx`.
- Render changes locally and look at every PNG before shipping; check the live
  image in a link-preview tester before any Reddit post (Reddit freezes a
  post's thumbnail).

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
