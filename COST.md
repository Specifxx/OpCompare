# Vercel cost audit — 2026-10-23

## What could and could not be measured

- **No Vercel token or dashboard access** in this session: per-project usage (CPU, transfer, ISR writes, invocations, analytics events) for OP Compare was **not measured**. The team bill in the brief is shared by every site and is not split here.
- **No local production build** was measured: the build needs the database (`OP3`/`OP2`/`DATABASE_URL`) and none is set in this environment, so page HTML/RSC sizes were not taken. The card page's ~350 KB HTML / ~165 KB RSC figure is from DECISIONS.md (2026-10-17), not from this session.
- What was measured: grep counts over `src/app` (below) and the repo's checks.

## Findings (code audit)

- `/card/[slug]` (7,306 sitemap URLs) already left ISR for the CDN on 2026-10-17 (`force-dynamic` + `Vercel-CDN-Cache-Control` via `CDN_PAGES`). Unchanged.
- 14 files in `src/app` declared `revalidate = 3600` (homepage, five region homes, two pre-order pages, three deck routes, news sitemap, calendar) although prices change twice a day and the import purges on change. Now 21600.
- `/sets/[slug]`, `/sealed/[slug]`, `/price-guide`, `/cards/*` facets: 43 files under `src/app` call `getCountry()` (cookie + geo header), so these pages render on every request (CPU and invocations, no ISR writes). They cannot take a shared CDN header until they get the card page's per-market client islands. **Not done** here; the largest remaining lever.
- The import purged the `prices` tag after every run, changed or not. Now only on change.
- No `middleware.ts` exists (nothing to narrow). `next/image` is used 0 times. `@vercel/speed-insights` is not installed. One custom event: `buy_click` (kept).
- `robots.ts` had one `*` group: every SEO crawler could walk the long tail.

## Changes

1. ISR/CDN lives raised to six hours (`revalidate = 21600`; deck library loader at `TTL`; QuickView JSON `s-maxage=21600, stale-while-revalidate=86400` instead of 600/3600). `tests/cost-cut.test.ts` forbids `revalidate` under 21600 in `src/app`.
2. Diff-gated purge: `publish-snapshot.sh` compares snapshot data (all but `meta.json`) and outputs `changed`; `publish-history.ts` skips `/api/revalidate` when unchanged and the history commit is the same.
3. robots: search and answer engines allowed without delay; AhrefsBot, SemrushBot, MJ12bot, DotBot, PetalBot, Bytespider, DataForSeoBot, BLEXBot, CCBot disallowed; `Crawl-delay: 10` for everyone else.
4. Analytics `beforeSend`: drops localhost/127.0.0.1/*.vercel.app, `navigator.webdriver`, bot UAs, and `?notrack=1` owner opt-out (`localStorage["va-disable"]`).
5. Build gate: production builds only `main`; a `[deploy]` release containing only docs changes skips. `images.minimumCacheTTL = 2678400`.

## Expected effect (qualitative, unmeasured)

- ISR writes / reads: the hourly routes rewrite up to 4×/day instead of up to 24×/day; no-op imports no longer purge every cached loader and page.
- Function invocations / CPU: fewer QuickView re-runs and fewer crawler renders from blocked SEO bots.
- Web Analytics: fewer billed events from bots, previews and the owner.
- Build CPU: fewer production builds when only docs changed.

## Recommended next step

Give set, sealed, price-guide and facet pages the card page's per-market islands, then add them to `CDN_PAGES`.
