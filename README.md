# OP Compare

**One Piece Card Game prices, compared across stores in six markets** — the
United States, Australia, the United Kingdom, Singapore, Canada and the
eurozone. Every card, every Parallel / Manga / SP / Treasure Rare / promo
printing and every sealed product, priced twice a day.

OP Compare is the One Piece sister site of [RiftCompare](https://riftcompare.com):
the same layout, navigation, market switcher, price-comparison board and data
rules, rebuilt for One Piece with its own theme (night-sea navy, Straw Hat red,
straw gold), its own straw-hat logo, its own database and its own store list.

> Independent fan-made site. Not affiliated with Bandai, Eiichiro Oda,
> Shueisha or Toei Animation.

## What's on the site

| Page | What |
|---|---|
| `/` | Hero search, trending cards, market switch, today's top deals, newest set's chase cards, booster boxes, colours, FAQ |
| `/browse` | The card database: search, filters (price, set, colour, rarity, type, printing), sorts, pagination |
| `/card/[slug]` | One printing: every store's price in your market cheapest first, eBay search, TCGplayer reference, price history, card text and details, other printings |
| `/sets`, `/sets/[slug]` | Every set by type, each with its card list, stats and sealed products |
| `/sealed`, `/sealed/[slug]` | Booster boxes, cases, packs, starter decks, double packs, collections — filters, per-pack prices, price board |
| `/price-guide` | Every printing in one sortable table, prices by set |
| `/movers` | This week's risers, fallers and best value vs 90-day high |
| `/market` | The OP Compare Index (chained, value-weighted) and value by set |
| `/leaders`, `/colors`, `/cards`, `/cards/all` | Leaders by colour, colour hubs, type/rarity/printing hub, A–Z index |
| `/tools/deal-finder`, `/tools/box-value` | Listings under market price; box price vs the set's card value |
| `/stores` | Every store we read, per market, with today's matched listings |
| `/watchlist` | Hearted cards and products (saved in the browser) |
| `/about`, `/methodology`, `/contact`, `/privacy`, `/terms` | |

## Where the prices come from — and the eBay rule

| Source | What | Markets |
|---|---|---|
| **TCGplayer** via [TCGCSV](https://tcgcsv.com) (category 68) | The whole catalogue (87 groups, ~7,300 printings, ~420 sealed), card text and stats; the cheapest listing (a US offer) and the market price (a reference everywhere, "≈" outside the US) | US + reference |
| **Shopify stores** (`src/lib/stores.ts`) | Each store's One Piece collections, read with Shopify Markets pricing for its own country; every listing matched to one exact printing (`src/lib/match.ts`) | US AU UK SG CA EU |
| **eBay** | A *search link* on your own eBay, tagged with the EPN campaign. **No eBay API calls, ever** — RiftCompare's 5,000/day Browse quota is untouched. `tests/no-ebay-api.test.ts` fails if anything names an eBay API host or credential. | all six |

Matching follows RiftCompare's rule: *understated, never wrong*. A listing is
matched only when exactly one printing fits its card number (or TCGplayer's exact
name + set), its card name and its printing words; graded slabs, playsets, lots,
live breaks and non-English listings are never matched, and a match far from the
printing's market price is dropped as a probable mismatch.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind (RiftCompare's themeable token
system, recoloured) · Prisma + Postgres (Neon) · Vercel · GitHub Actions.

## Going live — owner checklist

1. **Database.** Create a new Neon project (free tier is plenty) and copy its
   **pooled** connection string. Do not reuse a RiftCompare database.
2. **GitHub → Settings → Secrets and variables → Actions**
   - Secret `DATABASE_URL` — the connection string
   - Secret `CRON_SECRET` — any long random string
   - Variable `SITE_URL` — e.g. `https://opcompare.com` (used to call `/api/revalidate`)
3. **First import.** Actions → *Import prices* → Run workflow. It creates the
   tables (`prisma db push`), loads the catalogue and TCGplayer prices, then reads
   every store (~10–20 min). After that it runs at 07:07 and 19:07 UTC.
4. **Vercel.** Import the repo. Environment variables (Production + Preview):
   `DATABASE_URL`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`. Set the production
   branch to `main`.
5. **`main` branch.** This work is on `claude/tender-noether-2na98p`; create
   `main` from it (or merge its PR) — CI, the daily release and Vercel production
   all key off `main`.
6. **Deploy.** Production builds only for a commit whose *subject* contains
   `[deploy]` (see below). Run *Production deploy* → Run workflow for the first
   release, or let the daily 08:00 UTC run do it.

## Deploys are gated (ported from RiftCompare)

`vercel.json`'s `ignoreCommand` (`scripts/vercel-ignore-build.sh`) skips any
production build whose commit **subject** lacks `[deploy]`;
`.github/workflows/production-deploy.yml` lands one such commit on `main` every
day at 08:00 UTC, after the morning import. Previews always build. RiftCompare
adopted this after per-push builds exhausted its Neon transfer allowance; OP
Compare starts with it.

## Egress rules

Pages never query the database directly: they read the self-cached loaders in
`src/lib/data.ts` (`unstable_cache`, tag `prices`, 6 h TTL, purged by the import).
The catalogue is two compact cache entries (~0.6 MB each, under the 2 MB item
limit). See the header of `src/lib/db.ts`; `tests/nested-cache.test.ts` pins it.

## Local development

```bash
npm install
cp .env.example .env                 # point DATABASE_URL at a local Postgres
npx prisma db push
npm run import:catalog               # catalogue + TCGplayer, ~30 s
IMPORT_ONLY_STORES=cherry,danireon npm run import   # a few stores
npm run dev
```

| Command | |
|---|---|
| `npm run import` | Full import (catalogue, every store, aggregates, history, index) |
| `IMPORT_ONLY_COUNTRY=UK npm run import` | One market's stores |
| `npm run typecheck` / `npm run lint` / `npm test` | Checks (CI runs all three) |
| `npm run icons` | Regenerate the favicon set from the logo geometry |

## Adding a store

Add an entry to `src/lib/stores.ts` (`key`, `name`, `base`, `country`, the One
Piece collection handles, and `currency` only if it charges something other than
its market's currency). The importer also re-discovers One Piece collections
from the store's sitemap each run. It must be a Shopify store whose singles carry
card numbers (or TCGplayer-style names) in their titles.

## Not ported (yet) from RiftCompare

Accounts and sign-in, Premium/Stripe, email price alerts, the blog and guides
(Riftbound content), decks and deck builder, games, AdSense, the mobile app,
and Cardmarket as an EU source (its public files carry no card numbers, and One
Piece's many same-name printings make name-only matching unsafe — and the data
permission RiftCompare holds was granted for Riftbound). The watchlist works
without an account (saved in the browser).
