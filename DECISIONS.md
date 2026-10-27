# Decisions

Non-obvious choices, newest at the bottom.

## 2026-10-03 — A purpose-built port, not a fork of RiftCompare

The owner asked for "an identical website except everything is One Piece".
RiftCompare is ~880 source files, most of them Riftbound-specific (domains,
champions, runes, Riftle, the blog and guides, Riot's card formats), wired to
two rotating Neon projects. Forking it and renaming would have carried all of
that into a game it does not describe. Instead OP Compare reproduces the
*experience* — the side rail and header, the market switcher, the card database
with filters, the card page's cheapest-first board, sets, sealed, price guide,
movers, index, deal finder, stores, watchlist — on a smaller codebase built for
One Piece's data, and copies RiftCompare's rules verbatim where they are about
running the site rather than about Riftbound: the deploy gate, the egress rules,
"understated, never wrong" matching, affiliate tagging, FX references marked ≈.

## 2026-10-03 — TCGplayer via TCGCSV is the catalogue

TCGCSV mirrors TCGplayer's One Piece category (68) daily as one static JSON per
group: 87 groups, ~7,300 card printings and ~420 sealed products with card
number, rarity, colour, cost, power, counter, life, attribute, types and card
text. It is the source RiftCompare's Pokémon section uses, needs no key, and an
entire import of it takes seconds. A Card row is ONE TCGplayer product, i.e. one
printing; ids are TCGplayer's.

## 2026-10-03 — No eBay API at all

The Browse API allows 5,000 calls a day for the owner's app and RiftCompare uses
most of them. OP Compare shows eBay only as a tagged search link on the
visitor's own eBay (`ebaySearchUrl`), which costs no quota, and a test fails if
any API host or credential appears in the code.

Superseded by "2026-10-03 — eBay Browse API with OP Compare's own keyset" (below):
OP Compare now has its own eBay application and quota.

## 2026-10-03 — Printings are told apart by tokens, event stamps and set

TCGplayer names a printing with parenthesised tokens ("(Parallel)", "(Manga)",
"(SP)", "[Winner]"). Event groups (Pre-Release, Release Event, Anniversary
Tournament) list stamped reprints under the SAME name and number as the main
set card, so the importer adds the stamp as a token ("Release Event"); without
it 1,500 number+name pairs were ambiguous and a store's "Curiel OP16-004" could
not be placed. Premium Booster and Demo Deck reprints are told apart by their
SET instead: the matcher prefers the set a title names, then the card number's
home set. Ambiguity left after that is skipped.

## 2026-10-03 — A second match path: TCGplayer's exact name + set

BinderPOS-style stores title singles exactly as TCGplayer does, with the set in
place of the number ("Arlong (Alternate Art) [A Fist of Divine Speed]"). Exact
name + set is as unambiguous as a number, and it took one Canadian store from
1,179 matched cards to 4,429. It is a strict lookup — any name+set pair that
names two products is dropped.

## 2026-10-03 — Stores

The first registry was the 114 RiftCompare stores that also list One Piece
singles with card numbers (probed 2026-10-03: ≥20 numbered One Piece listings on
the first page of their One Piece collections). The owner pointed out One Piece
needs its own stores, so 121 One Piece specialists and large One Piece retailers,
found by search and through regional store directories and verified the same
way (English, ungraded, numbered, priced in the market's currency), were added
on top: 235 stores — US 73, CA 57, AU 50, UK 30, EU 24, SG 1. Only Shopify
stores are read (that is the scraper). Stores were left out when their One
Piece stock is Japanese or French behind English titles, when their singles
are graded slabs, or when they charge a currency other than their market's.

Singapore stays thin on purpose. Its One Piece shops mostly sell Japanese
cards, or sell through Instagram and Carousell, or don't run Shopify, so SG
visitors get TCGplayer's price as the ≈ reference and an eBay search link. The
big non-Shopify retailers (TCGplayer's own marketplace aside: Troll and Toad,
CoolStuffInc, Chaos Cards, Magic Madhouse, Cardmarket and others) would each
need a scraper of their own.

## 2026-10-03 — Cardmarket is not an EU source (yet)

Cardmarket's public price files carry no card numbers, and One Piece has many
same-name printings (a card, its Parallel, its Manga, its SP, its event stamps),
so name-only matching would price the wrong printing. RiftCompare's written
permission to use the files was also asked for Riftbound. EU prices come from
eurozone stores; TCGplayer's market price is the ≈ reference.

## 2026-10-03 — Box value, not box EV

Bandai does not publish pull rates. An expected-value number built on guessed
odds would look precise and not be, so `/tools/box-value` puts the box price
beside the set's card value and how concentrated it is — facts a buyer can check.

## 2026-10-03 — Price history starts with the first import

TCGCSV's daily price archive answered 403 from here, so there is no backfill:
history, weekly movers and the index start on the first import, and those pages
say when they will fill in.

## 2026-10-03 — Blog posts are computed, not typed

The owner wants an SEO blog like RiftCompare's. Every post here is a function of
the price database: tables, counts, medians and the sentences that quote them
are built when the page renders (`src/lib/blog/posts/`), and a sentence that
needs a fact prints only when the fact exists. That keeps posts accurate as
prices move and avoids publishing hand-typed figures nobody has checked.
Explanations of the game stay to what the cards and TCGplayer's catalogue show.

## 2026-10-03 — Analytics and search engines

GA4 needs its own property (`NEXT_PUBLIC_GA_ID`; nothing renders without it),
with Consent Mode defaults that deny storage in the EEA/UK/CH. Search Console
reuses RiftCompare's service account (`GSC_SA_KEY`) on a new property; a daily
workflow submits the sitemap and reports indexing. IndexNow reuses
RiftCompare's public key (keys are verified per host). Social-media marketing
was explicitly left out.

## 2026-10-03 — The domain is opcompare.app, and the code defaults to it

The owner's domain is `opcompare.app`. It is the default `SITE_URL` in
`src/lib/site.ts` and in every workflow (`vars.SITE_URL || 'https://opcompare.app'`,
`GSC_PROPERTY` defaulting to `sc-domain:opcompare.app`), so a missing or
mistyped variable can never publish canonical URLs, the sitemap or JSON-LD on
another host. The env vars still override it. The apex is canonical and
`next.config.js` redirects `www.opcompare.app` to it whatever the Vercel domain
settings say. `.app` is on the HSTS preload list, so the site exists only over
HTTPS. Vercel's automatic certificate covers that.

## 2026-10-03 — A title that names another printing rules the plain one out

The matcher asked a title for the words a printing's tag carries, but never
the reverse, so a title naming a printing TCGplayer doesn't list fell through
to the plain card: "Koala (3rd Anniversary Stamp) OP13-081", "Rayleigh
(OP14-108) - Unnumbered Promos", "Boa Marigold [OP07 PRE …] Pre-Release Cards"
and "Baby 5 (OP04-032) (V.2) PRB01" were all priced as the base print. Now a
title's stamp, promo, event and reprint words (`PRINTING_WORDS` in
`src/lib/match.ts`) must also appear in the printing's name, tag or set, a
"(V.2)" is never the plain print, and a PRB code names that Premium Booster. A
Premium Booster title with no printing words means the booster's "(Reprint)".
Replayed over the 328k listings then stored, 99.5% were unchanged, 967 moved to
the printing their title names (mostly PRB reprints and Pre-Release / Super
Pre-Release / Anniversary stamps) and 758 that name a printing TCGplayer doesn't
list are skipped. "(Non-English)" titles are now foreign.

## 2026-10-03 — The set a title names decides; aliases are names (review fixes)

A correctness review replayed every stored offer and found:

- **Mangas:** TCGplayer writes the original-set Mangas "(Alternate Art) (Manga)"
  and the Premium Booster ones "(Manga)". So a store's "Zoro OP06-118 Manga
  Rare" fitted only the PRB-01 print and put OP06 listings on a €2,000 PRB page.
  "Manga" now implies the alternate art on both sides, and the set decides.
- **Named sets:** when a title names a set (by code, with an event suffix like
  "OP03 PRE", or by name) that holds a printing of the card, only printings in
  a named set fit. With no printing words, the named set's "(Reprint)" is the
  printing. "[ST-27-OP09-083]" is the ST-27 reprint, not OP09's card.
- **Untagged strays:** a single plain fit outside the number's own set, in a
  set the title doesn't name, is skipped when the number has other printings.
  ("Monkey.D.Luffy (P-001)" is not the Demo Deck card.)
- **Phrases:** "Red Super Alternate Art" and "Super Leader Alternate Art" are
  keys, and a title must say each as one phrase. A stray "Red" (colour) or
  "Leader" (type) no longer picks a $1,700 printing.
- **Slabs and accessories:** TAG/AGS slabs are graded. Acrylic, magnetic and
  protector cases are accessories. A booster case must be written as a case
  ("Booster Box Case", "Case (12 Boxes)"), so "Booster Box (Case Fresh)" is a
  box and an acrylic box case is never a $25 "Booster Case".
- **Aliases:** "(Galdino)", "(Zala)", "(Grandma Nyon)", "(Navy)" and 30-odd
  more character aliases were read as printing tags, which made base cards
  "promos". `foldNameAliases` puts them back in the name. It only folds a token
  that every printing of the number in its own set carries and that stands
  alone on one of them, so "(Box Topper)" beside its untagged twin stays a
  tag. 97 printings change.
- `/market`'s index loaded the OLDEST 730 days, so it would have frozen after
  two years. 401 Games failed every run on a 5,300-product collection past the
  20-page cap; the cap is now 30 pages.

## 2026-10-03 — Plus & Premium: RiftCompare's model, minus the trial

The owner wants subscriptions "similar to RiftCompare", especially for Deal
Finder. Ported as-is:

- **Sign-in:** Google and Discord OAuth only, with a JWT cookie.
- **Tiers and prices:** Plus $2.99/mo or $23.99/yr; Premium $4.99/mo or
  $39.99/yr.
- **Stripe:** hosted Checkout, the webhook (six events, both payload
  generations, extend-only, `past_due` never entitles), the billing portal, a
  daily reconcile, and no Stripe calls on page loads.
- **Deal Finder:** gated in the query. Signed out sees nothing, a free account
  sees the top 3, a member sees everything.
- **Ad-free:** Plus and Premium hide every `[data-ad-placement]`.

What differs:

- **Premium's tool.** It is the Buy List Planner, RiftCompare's Best Basket
  idea: the cheapest single store and cheapest split for the watchlist, per
  market. OP Compare has no deck watch or demand finder to sell.
- **No paid trial or intro offer.** RiftCompare's $1-for-30-days trial is only
  honest with its trial-ending reminder emails, and OP Compare sends no email.
  The trial is the first thing to add once there is a mailer.
- **Prices live in one place.** They live in `src/lib/plans.ts`, and
  `scripts/stripe-setup.ts` creates the Stripe Prices from that table with
  lookup keys, so there are no price-id env vars to drift. Each Price carries
  `site=opcompare` and its tier, so a plan switch in the portal re-reads the
  tier and an old Price keeps its own.
- **Its own Stripe account.** RiftCompare's reconcile matches every
  subscription in its account by email. An OP Compare subscriber in that account
  who also has a RiftCompare login would be granted RiftCompare Premium. OP
  Compare also ignores any subscription not marked `site=opcompare`, and never
  matches by email.
- **The watchlist stays in the browser** for everyone, so there are no free
  limits to enforce.

## 2026-10-03 — History lives in GitHub, not in a history database

RiftCompare keeps price history in a second Neon project whose transfer
allowance it keeps exhausting. The owner wants OP Compare's public history in
GitHub instead. The import now writes it as JSON (`src/lib/history.ts`):

- one append-only file per day,
- 256 bucket files with each product's last two years (what a chart reads),
- `index.json`.

The import workflow commits these to the `data` branch of the public repo with
its own token. The 7/30-day changes and 90-day high are computed from the files
and stored on the Card rows.

Pages fetch the files from raw.githubusercontent.com, pinned to the commit the
import recorded (`Meta.historyRef`). A pinned URL never changes, so the fetch
cache keeps each file for a month, and GitHub's CDN lag on branch names can't
cache a stale file. Postgres keeps only today's prices: no `PriceDay` or
`IndexDay`, and no second database. The `data` branch carries a `vercel.json`
with deployments off, and main's `vercel.json` repeats it, so history pushes
never trigger a Vercel build. The files are also open data, linked from
/methodology.

## 2026-10-03 — Admin: RiftCompare's tools that fit, and mastermisclick@gmail.com as admin

The owner asked for admin features "the same" as RiftCompare's, with
`mastermisclick@gmail.com` flagged as an admin. Ported what OP Compare has data
for: `/admin` (home counts), `/admin/accounts` (search, sign-ups, CSV, manual
grant/revoke, "sync with Stripe now"), `/admin/subscriptions` (metrics for
`site=opcompare` subscriptions only), `/admin/store-health` and `/admin/inbox`
(price reports, store suggestions, feedback, contact), plus the public forms
that feed the inbox.

- **Who is an admin.** `SessionUser.isAdmin` = `User.isAdmin` or
  `isAdminEmail()`. `src/lib/admin-emails.ts` has `mastermisclick@gmail.com`
  built in, so a fresh deploy with no env var already works, and the address
  isn't something a Vercel typo can lose. `ADMIN_EMAILS` REPLACES the default
  when set (`ADMIN_EMAILS=""` removes every address-based admin), so a set
  value must include the owner's address. Read per call, not at module load.
- **One gate, fail closed.** `requireAdminPage()` / `requireAdminApi()` in
  `src/lib/admin.ts` are the only checks, called first by every page and route;
  `tests/admin.test.ts` walks the tree to prove it. Pages answer outsiders with
  the site's ordinary 404 (and empty metadata, so the title doesn't name the
  area); APIs answer 401/403. Session mutations are POST, same-origin
  (canonical origin only in production, plus `ADMIN_EXTRA_ORIGINS`) and JSON,
  and every one is logged with `adminLog`.
- **`ADMIN_TOKEN` is for scripts, header-only.** RiftCompare's `?key=` links put
  a long-lived secret in URLs, history, logs and Referer, and its two gates
  disagreeing caused bugs. Here the token is accepted only as
  `Authorization: Bearer`, needs 32+ characters, and is unset by default.
- **`/admin` is disallowed in robots,** unlike RiftCompare (which feared a
  Disallow hides the noindex and advertises the path). Outsiders get a 404,
  which is never indexed anyway; the path is guessable; and OP Compare already
  disallows `/account`. Admin pages are also noindex (meta and
  `X-Robots-Tag`), never in the sitemap, and send no GA page views.
- **Uncached reads in `src/lib/admin*.ts`.** Owner-only traffic; no
  `unstable_cache`, nothing under `src/app` imports `@/lib/db`.
- **Store health from `ImportRun.summary`.** The per-store results the import
  already records are the history; no snapshot table, no new cron. The same
  pure rules (`src/lib/store-health.ts`) print a report as a step of every
  *Import prices* run (never failing it).
- **Manual grant and revoke amend the entitlement-writer rule.** Besides the
  webhook and the reconcile, `src/lib/admin-billing.ts` may write
  `premiumUntil`, from an admin session only and audited. A grant only extends;
  a revoke is the one explicit exception to extend-only. Neither calls Stripe,
  so a live subscription re-grants itself, and the UI says so.
  `ADMIN_GRANTS` switches both off if the owner wants.
- **The inbox stores no IP and sends no email.** Rate limits key on a salted
  hash of the IP (or the account), never stored; there is no FK to `User` and
  an email only on contact messages. OP Compare has no mailer, so no copy
  promises a reply.

Skipped, and why: `?key=` admin links (above); delete-any moderation (no user
content beyond the inbox); tier floor (no grandfathered cohort); `/admin/premium`
interest clicks, `/admin/clicks` (GA4 covers them); demand, rising snapshots and
`/rising/[token]` (no counters, and snapshots freeze eBay API data); price
alert, deck and free-limit re-derivation (those features don't exist); email
audiences, win-back, price-drop consoles, support tickets and "report fixed"
thank-yous (no email); the feedback Premium reward (a pricing call for the
owner); the public reviews strip and floating feedback widget (deferred); the
store-health snapshot table and Discord cron (the import step replaces it);
consulting, decks, loyalty and store-partner pages (no such product or data);
the `close-inbox-items` script (the admin UI covers it); zod (validation is
hand-written in `src/lib/inbox-rules.ts`).

## 2026-10-03 — Link thumbnails feature the price guide

The owner wants link thumbnails that are "very good featuring the website and
mainly the price guide", and the launch post goes to Reddit, which shows the
homepage's `og:image`. The old root image was an edge-runtime logo card, every
share image rendered in Noto Sans Regular (next/og's only bundled font, so every
bold weight was ignored), and the card image was never served.

- **The default image is the price guide.** `/` and every page without its own
  image show the lockup, "ONE PIECE PRICE GUIDE", "7,255 cards · 231 stores ·
  6 markets" and five real top cards: art, printing, cheapest US price
  (sorted, as on the page), TCGplayer market, number, and store count.
  `/price-guide` has its own file with the same composition, so it survives a
  change to the default. Sets get their own top five (or the release date
  when unpriced), sealed products the box on a white plate with its price,
  cards their art with printing, rarity and per-market prices, blog posts
  their title beside three hero cards.
- **Rows a reader would call wrong are filtered out.** Unfiltered, the top of
  the guide is a US$50,000 single listing and championship promos.
  `pickGuideRows` keeps $10+ standard/alt/manga/SP/treasure printings from
  booster, extra and premium sets with art, no serial/championship/judge/
  prerelease/stamp/signature variants, at least two US stores, and a cheapest
  price within 0.5–1.2× of market (tighter than the site's 1.5× outlier rule,
  because the first row is what a scroller sees), deduped by name; it relaxes step by step
  and draws the fallback below three rows.
- **STORES until the 7-day column means something.** History started
  2026-10-03, so a "7 DAYS" column would read 0.0% everywhere. The last column
  switches to 7-day change on its own once three of the five rows really moved.
- **Real data, cheaply, and never a 500.** Images read only the cached
  `src/lib/data.ts` loaders (`getCatalog`, `getSiteStats`, `getSealedCatalog`):
  no Offer query, nothing prewarmed. `runtime = "nodejs"`, `revalidate =
  21600`, a 6 h CDN header, US prices (an image has no visitor). Any error,
  empty database or unknown slug draws a data-free fallback with a one-minute
  cache, so a blip doesn't stick.
- **Metadata fixes.** Card and sealed pages set `openGraph.images`, which
  blocked their image files; pages now build `openGraph` with `pageOg()` /
  `pageOgOwnImage()` (`src/lib/og/meta.ts`). The root's `og:url` made every
  page claim to be the homepage on Facebook and LinkedIn; each page now sets
  its own canonical path. Share PNGs get `X-Robots-Tag: noindex`, as on
  RiftCompare.
- **Brand fonts bundled.** Luckiest Guy, Archivo 900, Inter 600/700 and
  JetBrains Mono 700 TTFs (OFL/Apache) in `src/lib/og/fonts/`, traced into
  every image function by `next.config.js`, with a magic-byte check and a Noto
  fallback. Layout keeps a safe area (nothing essential below ~575 px, where
  Reddit and X overlay the domain).

Skipped: share images for `/movers` and `/tools/deal-finder` (phase 2, once a
week of history exists, about 2026-10-10), `/premium`, `/stores` and `/market`
(the default fits for now); per-card alt text; a `scripts/render-og.tsx`
renderer script. Known limits: TCGplayer serves "SAMPLE"-watermarked art for
recent sets (the site shows the same), and platforms cache thumbnails
themselves (Reddit forever per post), so check the live image before posting.

## 2026-10-03 — eBay Browse API with OP Compare's own keyset (reverses 'No eBay API at all')

The owner: "I'm planning to create a new eBay API for opcompare so when that
variable is set we have a new 5000 API quota which we can split by region and
allocate based on card price like riftcompare".

- **A separate eBay application.** Browse quota is per application, so OP
  Compare's own app has its own 5,000 calls a day and nothing is shared with
  RiftCompare. The secret names are RiftCompare's (`EBAY_CLIENT_ID`,
  `EBAY_CLIENT_SECRET`) but live only as GitHub secrets on `Specifxx/OpCompare`.
  Pasting RiftCompare's keys would fail silently, so each run compares eBay's
  used count with our own last-24h spend and warns ("another app is spending
  this keyset") when the gap exceeds 300. Everything is off — a green no-op —
  until both secrets exist; keys set but refused fail the run red after zero
  Browse calls, so a revoked keyset can't hide behind green runs.
- **Budget.** Each run spends `min(EBAY_MAX_CALLS = 2200, liveRemaining −
  EBAY_QUOTA_RESERVE = 600)`; two runs (05:37, 17:37 UTC) is at most 4,400 a
  day, leaving the reserve whatever time eBay's day resets — when the live
  count was read. When it can't be (Developer Analytics fails), the run
  assumes `dailyLimit − our own last-24h spend` remains (see "eBay pass review
  fixes" below), so a third run in one eBay day can't pass the limit either. `spendable` starts
  at 0 (RiftCompare's `Infinity` left un-primed callers unmetered). Numeric
  variables go through `envInt`, so an empty GitHub variable is unset, not 0.
- **Value tiers and floors.** TCGplayer's market price decides: singles of
  US$100+ every 24h, singles from US$20 (US$50 in the EU) every 48h, sealed of
  US$30+ every 48h (kinds `matchSealedTitle` can recognise, never loose packs),
  unpriced products only in a 60-day launch window. RiftCompare's US$5 floor
  would cost ~2,490 calls a day per market. Modelled (×1.25 retry for singles):
  US/UK/AU 910 + 120 sealed each, EU 654 + 120, CA 120 sealed, SG 0 — 3,984 a
  day against 4,400 spendable (`tests/ebay-plan.test.ts` pins it; re-counted
  from the OP Compare database: 388 / 409 + 199 / 76 unpriced / ~140 sealed).
- **Region split.** Fixed shares of each run: US 26%, UK 26%, AU 26%, EU (eBay
  Spain; no pan-EU marketplace) 19%, CA 3%. A market's unused share spills to
  the next-highest-priority pairs anywhere, and the market execution order
  rotates daily so no market is always last when eBay's count runs out.
- **Per-pair writes, not RiftCompare's wholesale replace.** A completed search
  upserts (match) or deletes (no match) that pair's `Offer` row and stamps
  `EbayCheck`; anything else touches nothing, so the pair stays due. A run cut
  short can't remove a live price, which is why ~90% of the quota can be
  planned (RiftCompare needs half its quota as headroom because a truncated
  market is discarded). The alarm is S2 slipping past 60h; the fix is a higher
  `EBAY_MIN_VALUE_CENTS`.
- **CA derived, SG 0%.** A native EBAY_CA singles programme would cost ~910 a
  day; CA singles copy the US listing (`ebay_us`, converted to CAD, postage
  unknown) only when the seller is in the US or Canada. EPN has no Singapore
  programme, so SG keeps its search link.
- **Wider seller-location filter than RiftCompare's.** CN, HK, TW, KR and JP
  sellers are rejected: Japanese One Piece dominates eBay and is often titled in
  English. Count the English listings this costs on the first runs.
- **Matching.** Identity is `matchCardTitle` over the FULL index (or
  `matchSealedTitle`), then plausibility, then RiftCompare's cheap-outlier prune;
  the eBay-only filters (junk words, number ranges, sealed words on a single
  unless its own printing or set names them — Judge Pack, Box Topper, Premium
  Booster) live in `ebay-match.ts`. Queries are the number and one name word,
  with a server-side price floor 5% under our plausibility floor in the market
  currency.
- **Aggregation and UI.** `low<M>` includes eBay; `stores<M>`, homepage stats,
  the Buy List Planner and "hot store" inbox flags don't. A stale eBay row is
  dropped, not shown as sold out. eBay rows rank by item price among the stores,
  with an eBay button, the postage eBay states ("postage at checkout" when
  unknown, never "delivered") and the EPN tag `oc-<mkt>-ebay-<page>-product`.
- **History step.** `lowUS` in the history series steps down on the day eBay
  starts, as RiftCompare's did.
- **Setup order.** The schema sync (`Offer.shippingCents`, `EbayCheck`) runs
  by hand before the release that carries this code: the card and sealed
  loaders select the new column even with eBay off, and only the store import
  syncs the schema while the eBay workflow is gated off. The Marketplace
  Account Deletion route ships first; its two Vercel variables must be set
  before the release that carries it; then the eBay app, its notification
  test, the production keys as GitHub secrets, and a `only_market=US
  max_calls=50` smoke run (docs/SETUP.md §6a). The route must stay deployed
  while the keyset exists.

## 2026-10-03 — eBay pass review fixes (before the keys exist)

A review of the eBay pass (the entry above) found ways to spend the quota for
nothing and ways to show a wrong price. Fixed before any key exists:

- **A failure breaker.** A search that fails without a 429 (4xx, 5xx,
  timeout, network) is charged and its pair stays due, so one broken thing (an
  outage, a keyset not approved for Browse, a filter eBay rejects) would have
  spent the whole 2,200-call budget twice a day on a green run. Ten failed
  searches in a row, or more than half of 50+, now stop the run, which goes
  red (`FailureBreaker`, `ebayRunVerdict` in `lib/ebay-plan.ts`). So does a run
  that spent calls and completed nothing.
- **Spend is always recorded.** A run that throws records `spent` too, and a
  running pass saves it every 100 pairs, so a timeout kill can't hide spend
  from the next run's foreign-spend check.
- **Bounds on the variables.** A negative `EBAY_QUOTA_RESERVE` is 0. An
  `EBAY_MAX_CALLS` above `(liveLimit − reserve) / 2` is lowered to it, so the
  first run after eBay's reset can't take the second run's share. With the
  live count unknown, the budget is `min(cap, dailyLimit − reserve − our
  last-24h spend)`: eBay's current day began less than 24h ago, so our spend
  in it is in that window. This can skip a run when Analytics fails right
  after two full runs; that is the safe direction.
- **Foreign spend is loud.** The warning is a GitHub `::warning` annotation,
  and such a run spends at most 50 calls. It still cannot fire before
  RiftCompare's own pass has spent that day.
- **The plan's real shape.** Simulated over two weeks, the 24h and 48h tiers
  settle into a 4-run cycle of 2,200 / 2,200 / 2,200 / ~800 modelled calls
  (`tests/ebay-plan.test.ts`, "steady state"). The daily average fits, but
  three runs in four plan exactly the cap, so if the real retry rate is above
  25% S1/S2/P1 pairs slip in those runs before the model says. Expected in
  week one; the alarm stays S2 past 60h.
- **Unpriced products need a reference.** With no TCGplayer market price, a
  launch-window product had no price guard at all: a US$3 "Orica" was the
  eBay price of an unpriced OP18 Manga. Now it is searched only when a non-eBay
  offer exists (the cheapest in any market, in USD — RiftCompare's
  `trustedRef`) at or above the tier's floor; that reference sets the server
  floor and the 0.3× (singles) / 0.5× (sealed) guard, and at least 3 listings
  must survive, with a head under half their median dropped.
- **Sibling sets.** A Premium Booster "Manga" or "Alternate Art" has the same
  printing keys as the original set's, so a title naming neither set went to
  the number's home set — and on eBay that is often the cheaper reprint
  (US$1,300 for a US$3,999 OP01-120 Manga). eBay titles must now name the
  target's set when a same-tag printing exists in another set. 53 of the 996
  searched singles are affected; their canonical titles still match.
- **Delivered price.** A US$4.50 item with US$25 postage was "Cheapest" at
  US$4.50. A listing is rejected when postage exceeds max(item price, US$15)
  or the delivered price fails the plausibility ceiling. On equal delivered
  prices, known postage wins.
- **eBay-only wording filters** (`lib/ebay-match.ts`; `match.ts` unchanged):
  country names (Japan, China, Korea, Thai), French (VF, FR, Version
  Française), fakes (Orica, Fan Art, Reproduction, Metal Card, Unofficial);
  slabs without a space or from other graders (PSA10, BGS9.5, ARS 10, ACE 10)
  and eBay's "Graded" condition; lots and quantities; "U Pick"/"Choose";
  damaged, creased, signed and misprinted copies. A word the product's own
  name, printing or set carries is allowed, which is what lets the 12 Wanted
  Posters match at all.
- **Never search what can't match.** A printing whose own canonical title
  ("One Piece {name} {number} ({printing}) {set} {code}") fails the eBay
  screen is skipped at plan time and counted in the log: the Japanese-version
  anniversary promos, Playmat/Binder/PSA Magazine promos and same-tag twins in
  one set (52 printings, ~200 calls a day across four markets).
- **Copy follows the data.** The eBay sentences on the methodology, home FAQ,
  about and editorial pages appear only after a successful eBay run in the
  last 3 days (`getSiteStats().ebayLive`), and the price board's only when it
  shows an eBay row. With no keys the site reads as it did before.
- **Workflow.** The gate is its own job outside the import's concurrency
  group, so an unconfigured run never enters it; the secrets are on the two
  steps that need them, not the job (`npm ci` never sees one).
- **Guards.** `tests/no-ebay-api.test.ts` also covers `svcs.`/`apiz.ebay.com`
  and `SECURITY-APPNAME`, and fails on any import of an eBay module from
  outside `src/lib/ebay*.ts` in any form (dynamic, re-export, require).

## 2026-10-03 — Store matching: SKU numbers, canonical set names, strict DON!!, and the store count

A coverage study replayed every product of today's 235 stores (473,810
listings, variant SKUs included) through the matcher and listed what it missed
and what it got wrong. Each fix below was measured on that replay before it was
adopted, each has its real titles in `tests/match.test.ts`, and none loosens a
rule: every new path still needs exactly one printing to fit.

- **SKU card numbers** (`skuCardNumber`, `matchCardBySku`). BinderPOS-style
  stores title singles "Shanks [Legacy of the Master]" and keep the number in
  the variant SKU ("OP12-007-EN-NF-1", "op17-105-Normal-707116"). A
  numberless title borrows it only when every SKU agrees on one number and no
  SKU is marked JP/CN/KR/FR, and the title must still pick one printing.
  Strict: a title ending in a `[Set]` the catalogue doesn't know is skipped,
  and the matched printing's set must canon-equal it. Without that, 7% of SKU
  matches were wrong ("Helmeppo [Starter Deck: Black Smoker]" priced as the
  OP card, "Blast Breath [Best Selection Vol.1]" as the plain ST04 print).
- **Canonical set names** (`canonSet`). Stores carry TCGplayer's older set
  names: "Starter Deck: Black Marshall.D.Teach", "… Release Event" without
  "Cards", "Super Pre-Release" first or last. The canonical form drops the
  "ST-nn:" prefix and the deck number, puts "super pre release" first and
  drops a trailing "cards"; the name path tries it as a fallback, and a
  title's trailing `[Set]` names a set when the canon forms agree (which also
  stops "Monkey.D.Luffy (ST21-001) [Starter Deck EX: Gear 5]" going to the
  Learn Together deck). A key naming two products is still no key.
- **Strict DON!!** (`matchDonTitle`). A DON!! title must name the set (code or
  name, the longest name winning: "Vol. 2" is PRB-02), say every word of the
  printing's TCGplayer name with Gold both ways, and say nothing the printing
  lacks: "(V.n)", Alternate Art, Manga, Special Foil, Double Pack, or a
  promo/event word. "DON!! Card (Alternate Art) - Romance Dawn" was the
  prototype's one wrong-printing pattern (OP01 has no plain AA DON!!); the
  reverse rule skips it. Exactly one printing must fit.
- **Smaller rules.** "Alternative Art"/"Alt. Art" is the alt key; Full Art
  against Alternate Art is decided by the phrase the title says (only when it
  says one of them, and a Parallel is never dropped); "Binder Set" is a promo,
  not a binder; "(OP07 Special)" and "Special Rare" are SP; a rarity glued to
  the number ("OP06-085UC") and a lone "(112)" beside one set code ("(OP17)")
  are numbers; "OP15 Release Event" is the RE set code.
- **Wrong prices fixed.** "OP08P" (a store's promo/stamp code), "Best
  Selection", "Box Topper" and "Extended Art" are printing words: a printing
  must say them too, so "Robson (OP08-013) OP08P" and "Izo (OP01-033)
  (Extended Art)" are no longer the plain card (~200 listings, now skipped). A
  "Dash Pack" single is not a Booster Pack. The PRB DON!! "<30% of market"
  drop is policy and stays.
- **One pipeline, truthful misses.** `matchStoreProduct` runs number → name →
  DON!! → SKU → sealed for the import and `scripts/probe-stores.ts` alike. A
  miss names the path that got furthest (`sealed-ambiguous`, `don-no-set`,
  `sku-unknown-set`, `name-unmatched`, `not-sealed`) instead of filing sealed
  and name-path misses under the card reason `no-number`, so admin store
  health shows what actually failed. `implausible-price` is unchanged.
- **`stores<M>` counts real stores only.** The aggregate counted every
  non-eBay row, TCGplayer included, while its comment said real stores, and
  the card and sealed pages counted eBay rows as stores. Now `stores<M>` is
  `store:` rows only and the pages count the same (`isStoreSource`). `low<M>`
  is still the cheapest listing of any source, so a tile, the booster-box
  table and the share images say nothing about stores when the low is
  TCGplayer's or eBay's ("Cheapest US listing" rather than "Cheapest of 0
  stores"). The homepage, the where-to-buy table and the share image's
  header count TCGplayer as one of the sellers we track, on purpose, and
  still do.

Measured on the replay (in-stock card printings priced per market, old → new):
US 6,112 → 6,269, AU 5,545 → 5,737, UK 3,651 → 3,845, CA 5,923 → 6,012,
EU 3,609 → 3,646; +672 (printing, market) pairs, of which 169 are over US$20,
203 US$5–20, 166 US$1–5, 130 under US$1. In-stock store offers 162.2k →
175.2k. 356 previously matched listings moved printing, all to the printing
the title names (mostly "Alternative Art" titles that had been priced as the
base card, older starter-deck names, Full Art vs Alternate Art and Dash Pack
singles); 251 were dropped, 199 of them "OPnnP" titles and the rest Best
Selection, Box Topper, Extended Art and Dash Pack listings.

A local full import with the old code and then the new (same stores, an hour
apart) priced in stock: US 6,112 → 6,269, AU 5,545 → 5,736, UK 3,651 →
3,846, CA 5,923 → 6,009, EU 3,609 → 3,646 printings; in-stock store offers
162.2k → 175.1k. With the new count, 703 US printings have a low (TCGplayer)
and no store: `storesUS` is 6,269 where it had read 6,969.

## 2026-10-03 — Plus/Premium surfaces at RiftCompare parity: dialog, header Pricing, nudges, beacons

The owner asked for full functional parity with RiftCompare and "pricing at the
very top". Ported, adapted to One Piece:

- **One dialog, opened from every wall.** `PlanProvider` (root layout) +
  `PlanDialog` + `PlanButton({surface, tier})`. The dialog opens on the LOWEST
  tier that unlocks the wall (Deal Finder: Plus; Buy List Planner: Premium),
  uses the shared `TierComparisonTable`, and its button follows the visitor:
  member → billing portal / tools; Stripe unconfigured → the same "Opening
  soon" /premium shows (unchanged owner state); signed out → `/login?next=
  /premium?go=<tier>-<interval>`, which PricingCards' existing `?go=` logic
  turns into checkout; signed in → the one checkout path (`startCheckout`,
  shared with PricingCards). `checkoutOpen` reaches the layout as
  `stripeEnabled()`, an environment read, never a session read: the root
  layout still never reads the session.
- **Pricing in the header from 400px**, hidden for members (the `oc_adfree`
  hint hides it at first paint, `useMe()` after). To fit, the header shows the
  hat mark without the wordmark below `sm` (390px already overflowed by 25px
  before this change), the right cluster's gap is 2px below `sm`, and the
  desktop links don't wrap. The rail's foot link and the phone menu's pinned
  link are hidden for members too; the avatar menu keeps its entry.
- **/premium:** pricing cards directly under a one-line H1, two columns at
  every width (both buttons in the first 390×844 screen), "Cancel anytime ·
  secure checkout by Stripe", the proof line (renders nothing until the Deal
  Finder track's `/api/premium/proof` answers with ≥ 5), a member view in
  place of the cards (subscription from `/api/premium/subscription`, read
  client-side so the page stays static), "What you get" from `PLAN_FEATURES`,
  the comparison table, a visible FAQ with FAQPage JSON-LD, and Product JSON-LD
  with one Offer per tier. Prices, features and trial policy untouched; no $1
  month, no price-rise banner.
- **Nudges: RiftCompare's rules, unchanged numbers** (`lib/nudge-gate.ts`,
  `nudge-timing.ts`, `nudge-runtime.ts`): the slide-in is for signed-in
  non-members only, while checkout is open, from the 3rd page view, on an
  account ≥ 48 h old (`/api/me` now returns `createdAt`), 12 s after
  eligibility at a quiet moment (no open dialog — `body[data-oc-dialog]` or any
  `[aria-modal=true]` —, no scrolling, no typing), once per session, 7-day
  snooze after a dismissal, 14 days after a click, never after two dismissals.
  Skipped on /login /premium /tools /watchlist /account /admin. The annual
  offer needs a monthly subscription ≥ 2 months old with the yearly Price set
  up. Signed-out visitors get only in-page `InlineSignupPrompt`s (card pages,
  /movers, /price-guide), never a corner card.
- **Switch to yearly** (`/api/premium/switch-to-annual`): same-origin POST,
  Stripe `subscriptions.update` to the tier's yearly lookup-key Price with
  `proration_behavior: "always_invoice"`. It never writes entitlement; the
  webhook/reconcile stamp the new period, extend-only, as for every change.
  503 with a plain message while Stripe isn't configured.
- **CardConversionCta promises only what OP does.** RiftCompare's says "we'll
  email you when it drops"; OP's watchlist is browser-only with no email, so
  the copy says the card joins the watchlist. No `PremiumNudgeCard` ("4 cards
  you watch are underpriced"): it needs a server-side watchlist.
- **Beacons are live, unlike RiftCompare's.** RiftCompare switched its click
  beacon off to save history-DB egress; OP's two tables (`ClickEvent`,
  `PremiumClick`) are one small insert per click into the operational DB and
  are read only by `/admin/clicks` and `/admin/premium` (uncached,
  `lib/admin-clicks.ts`). One global listener (`OutboundBeacon`) reports any
  `a[data-retailer]` click, so new shop links are counted without wiring.
  Rows hold the retailer key, page type, card/sealed slug, market and the
  account id if signed in — never an IP, URL or user agent. Both routes are
  rate-limited per hashed IP, validate against fixed patterns
  (`lib/click-event.ts`, `lib/nudge-surface.ts`) and always answer 204.
  Since "Fixes after the parity integration" below: same-origin only, and
  rows are kept 90 days (the import prunes them).

## 2026-10-03 — Plus/Premium review: Keep, yearly switch in the member card, no year billed to a leaver

A review of the Plus/Premium parity work against RiftCompare changed:

- **The member card on /premium gets RiftCompare's one-click actions.** A
  subscription set to end shows "Keep Plus/Premium" (`/api/premium/resume`:
  same-origin POST, clears `cancel_at_period_end`/`cancel_at`, charges nothing,
  never writes entitlement — the webhook does). An active monthly one with the
  yearly Price set up shows "Switch to yearly" (the existing
  `/api/premium/switch-to-annual`). RiftCompare's intro-coupon branch on Keep
  is not ported: OP Compare has no intro offer.
- **A year is never billed to someone who chose to leave.** The annual offer
  (`annualOfferEligible`) now needs an ACTIVE subscription that is not set to
  end, and `switch-to-annual` answers 409 for one that is. Before, a monthly
  member who had cancelled could be nudged into paying twelve months up front.
- **The annual nudge keeps its timer across navigation** (it depends on "past
  the 1st page", not the view count, as in RiftCompare), and skips /premium
  and /account, which carry the same switch in the page.
- **"Upgrade to Premium" for a Plus member only where it can work:** the
  member card shows it only for a Stripe subscription, and the dialog's Plus
  branch says "Plan changes open when subscriptions do" while Stripe is not
  configured, instead of a billing-portal button that can only fail.
- **/browse gets the signed-out InlineSignupPrompt** (RiftCompare has one on
  its card list), after the pagination; the card page's conversion box is
  hidden at first paint for a returning member (the `oc_adfree` hint).

## 2026-10-03 — Card QuickView and the card page's affiliate layout (RiftCompare parity)

The owner wants RiftCompare's interactions one to one. RiftCompare opens most
card taps in a QuickView popup, highlights eBay and TCGplayer directly under the
price comparison, and pins a buy bar on phones; OP Compare linked every card to
its page, showed TCGplayer's market price as one grey footer sentence with no
link, and sent the card-details TCGplayer link out untagged (no commission).

- **QuickView: one provider, one link component, one cached JSON.**
  `QuickViewProvider` is mounted in the root layout inside `CountryProvider`
  and reads no session and no cookie (the layout rule stands). Every card
  surface links through `CardQuickLink` (`CardTile`, `MoverList`, the price
  guide's rows and stats, set pages, `/cards/all`, the card page's related
  tiles): a real `/card/<slug>` href for crawlers, new tabs and modifier
  clicks; a plain left click opens the dialog; with no provider it is a link.
  Data comes from `GET /api/card/[slug]`, which reads only the self-cached
  `getCardDetail` (the card page's own loader — an open costs a Data Cache
  read, never a query) and is shaped by `quickViewPayload`
  (`src/lib/quick-view.ts`): every market's top five open rows, already
  affiliate-tagged on the server (the partner-id env vars never reach the
  browser), every market's eBay search and the TCGplayer link; ~10 KB, CDN
  10 minutes, market-independent so one response serves everyone and a market
  switch needs no second request. Hover/focus prefetches it.
- **The dialog has an address.** `history.pushState` puts `/card/<slug>` in
  the URL bar without navigating (Next 14.2 patches pushState and copies its
  own state in, so the page underneath is untouched): the link can be shared,
  Back closes, Forward reopens, and visiting the URL renders the full page.
  An open that arrives while a close's `history.back()` is still pending is
  queued until the popstate lands — otherwise that popstate would close the
  new dialog, the "open it again quickly and nothing happens" bug. Links
  inside the dialog are plain anchors (full loads), so no client navigation
  leaves a stray `/card/` entry; any other route change closes it.
- **`Dialog.tsx` (RiftCompare's ui/Dialog, ported)**: portal, refcounted scroll
  lock (with scrollbar-gutter compensation) and `body[data-oc-dialog]`,
  Escape closes the topmost layer only, Tab trap, focus returned to the
  opener, and a click on the empty space around the panel closes it
  (RiftCompare's backdrop sits under the centring wrapper and never got it).
- **Card page order, top to bottom** (RiftCompare's "Pushing eBay clicks"):
  phones get `CardTopBuy` (cheapest open listing + Buy) under the name; the
  board; the **eBay fallback block directly under the board** whenever the
  market has no eBay row ("Search eBay for <card>" in eBay blue, RiftCompare's
  copy, pre-release copy for an unreleased set), else the board's own "More
  listings on eBay" strip; then **`TcgMarketPrice`** ("TCGplayer market price
  · reference", local ≈ figure with the US$ beside it, "Check on TCGplayer →"
  through Impact) in place of the footer sentence; then **`EbayCardBanner`**,
  a card-contextual "Find <card> on eBay" house banner labelled Ad with
  `data-ad-placement`, so ad-free members never see it. The fallback and the
  TCGplayer block are buy paths, not ads, and stay for members. Sealed pages
  get the same fallback and TCGplayer block. A card from an unreleased set or
  with no listing in any market also gets `EbayBuyCta` above the board.
- **One ranking for every buy surface.** `marketRows`/`cheapestBuyRow` are the
  board's rule (in stock, the market's currency, item price first), used by
  the board, the QuickView, `CardTopBuy` and `CardStickyBuyBar`, so the bar
  can never name a different store from the board's #1 row. The sticky bar
  shows only once the top block has scrolled above the viewport and hides
  while the board is on screen; hidden, it is `inert`.
- **Price guide rows** get a TCGplayer button (the card's product page —
  ids are TCGplayer product ids — with its US market price in US$) and an eBay
  search button, built in a small client island from the row's raw fields so
  the long affiliate URLs are not serialised twice per row. The table is
  fixed-layout and drops columns by width instead of scrolling sideways.
- **Click tracking.** Every outbound link on these surfaces carries
  `data-retailer`, `data-page`, `data-card` (slug) and `data-surface`; the GA
  `buy_click` beacon now sends `card` and `surface` too. The Buy List
  Planner's links are tagged on the way out (`tagPlanLinks`), so its TCGplayer
  picks earn like the board's.
- **Price history in the popup** (RiftCompare shows it there too): the API
  adds the card's last 90 days from `getProductHistory` — the card page's own
  series, read from the GitHub history file through the fetch cache, so no
  database — trimmed by `quickViewHistory` to a few hundred bytes. The shared
  `LineChart` gained a `width` (a narrower viewBox draws its labels legibly
  in the popup) and a left gutter sized to its longest label (four-figure
  US$ values were clipped), and stops keying two x labels alike when there
  are only two days (a React duplicate-key warning).
- **Search opens the popup, like RiftCompare's.** A card hit in `CardSearch`
  (click or ArrowDown + Enter) opens its QuickView, so the visitor keeps the
  page and the results; modifier clicks and sealed hits stay links. Card
  links on the leaders, colour, Box Value and blog pages go through
  `CardQuickLink` too.
- **TCGplayer banner** (RiftCompare's `TcgplayerAd`) under the eBay banner on
  the card page: "Shop One Piece singles & sealed" through Impact, labelled
  Ad, `data-ad-placement`. While the phone buy bar shows, `body[data-oc-buybar]`
  adds bottom room so the bar never covers the footer's last lines.
- **Not ported:** RiftCompare's live eBay listing carousel and Graded tab
  (OP's eBay pass stores one listing per pair; more would cost Browse calls
  from OP's own quota — the owner's decision), RiftCompare's one-click
  price-drop alert in the popup (OP has no server-side alerts; the popup's
  Watch button is OP's equivalent), "Add to collection" (OP has no
  collection), and a sealed QuickView.
  `tests/quick-view.test.ts` pins the payload, the ranking and the wiring.

## 2026-10-03 — Deal Finder: RiftCompare's three views; TCGplayer is the reference, never the buy side

The owner wants one-to-one parity with RiftCompare. The parity audit found OP's
Deal Finder broken in the US: `biggestSavings` ranked `Card.low<M>` against
TCGplayer's market price, and `lowUS` is usually the `tcgplayer` Offer row —
TCGCSV's `lowPrice`, TCGplayer's lowest listing of ANY condition. 988 of 1,115
US "deals" (89%) were TCGplayer measured against itself, 40 of the top 60 were
thin promo printings, and the % sort with a 60% ceiling pinned the list to the
ceiling. Ported RiftCompare's Deal Finder (its `lib/arbitrage.ts` rules) instead:

- **Three views, one URL builder.** `?view=` tcg (default, "Underpriced vs
  TCGplayer"), ebay ("Cheapest on eBay", free for everyone, signed out
  included) and vs-ebay ("Underpriced vs eBay"). Every link goes through
  `hrefFor` (`src/lib/deal-finder-href.ts`, ported as is; `mine` has only
  "watch" because OP has no binder).
- **TCGplayer is the reference, never the buy side.** The buy side is each
  market's stores plus eBay (`dealFinderSources`); a URL naming `tcgplayer` is
  dropped (`resolveBuyKeys`). In the US the `tcgplayer` row is used only as a
  VETO: a store or eBay price at or above TCGplayer's own lowest listing is not
  a deal (`scoreVsTcg`). Floors: buy ≥ 300 minor units, ≥ 100 below market,
  ≤ 75% below (a mismatch, not a deal). Sorted by money below market (then %),
  with % as the option. Same data, US: 189 cards instead of 1,115, led by real
  store listings (Kaido OP17-062 Manga at Hobbiesville, US$699 vs US$1,081.63).
  OP's `tcgplayer` row is any-condition (RiftCompare's is cheapest English NM),
  so the veto can drop a store a played TCGplayer copy undercuts; that errs on
  the side of listing fewer deals.
- **eBay on delivered cost.** Deal Finder compares an eBay row on item + stated
  postage, on the item price alone ("+ postage") when none is stated, and a
  stated postage wins a tie. This is Deal Finder's own comparison; the card
  page's price board still ranks every row, eBay included, by item price.
  Canada's eBay rows (`ebay_us`) are US listings with unquoted international
  postage: off the default buy side (selectable, labelled "eBay US + intl
  postage"), and Canada has no eBay comparison. Singapore has no eBay singles
  feed. eBay views explain themselves when eBay isn't being collected
  (`getSiteStats().ebayLive`) and offer eBay searches instead.
- **Cheapest on eBay / Underpriced vs eBay** guards: eBay (or store) ≥ 100,
  gap ≥ 50, gap < 80% of the reference. In the US the Cheapest on eBay
  alternative includes TCGplayer's own lowest listing (buyable there).
- **Data.** `getDealInputs(country)` — one raw query per market, reduced in
  Postgres to `[id, storeMin, tcgLow, ebayCents, ebayKnown]` tuples (US 6,969
  rows ≈ 160 KB), same 72 h freshness as `aggregate()`; `getStoreMins` for a
  picked store subset (Plus); `getDealOffers(country, ≤25 ids)` for the page's
  live listings. Every row shows the LIVE listing's own price, condition and
  link, re-scored with the same predicate and dropped if it no longer
  qualifies. `low<M>` stays the browse/card headline; it is no longer a deal
  input. `biggestSavings`, `DEAL_MAX_SAVING_PCT`, `MAX_GAP_PCT`,
  `savingVsMarket` and `DealList` are gone.
- **Access unchanged** (`dealAccess`): signed out — no query on the gated
  views, a locked preview with eBay searches beside it; free account — the
  first 3 rows of the default ranking and "N more cards on this list" with the
  real total; Plus — every row, store picker, sort, paging, "only my cards".
- **Only my cards** needs the watchlist, which lives in the browser: the
  `?mine=watch` chip renders a client island that POSTs the watched slugs to
  `/api/deal-finder` (Plus only, uncached), which runs the same ranking with the
  filter applied before paging.
- **Homepage** "Today's Top Deals" is RiftCompare's: Biggest savings (the
  default ranking sorted by %, 4 rows + the real total; non-members see 1 and
  "Unlock N more with Plus"; the page carries only that one row and members
  fetch the rest from `/api/top-deals/savings`, see "Fixes after the parity
  integration" below), Price drops
  and — with no demand signal to build Rising Cards from — "Biggest 7-day
  climbs", free. Budget tabs use RiftCompare's per-market thresholds.
- **/market/records** is the free cross-market board: cheapest in-stock STORE
  prices (never TCGplayer's listing or an eBay ask) compared across markets at
  the reference FX rate, ranked by money saved (≥ 5 units, 20–80%), plus 90-day
  TCGplayer-market records (a "high" needs a month of history and a rise).
  `/api/premium/proof` returns `{ country, dealCount }` from the same ranking.

## 2026-10-03 — Tools parity: /tools, the deck price calculator, selling fees and the landing pages

RiftCompare's free tools and SEO pages, ported to One Piece (parity audit §3.5
and §6). What is not obvious:

- **The deck pricer reads the catalogue, not the database.** `/api/deck/price`
  parses (`lib/deck.ts`, pure, `tests/deck.test.ts`) and resolves every line
  against the cached `getCatalog()`; only the resolved printings' offers are
  read, through the cached per-card `getCardDetail()` (at most 80 per request,
  rate-limited per IP). No new query sits on a request path.
- **A number means its standard print.** `4xOP01-120` prices the base print
  (lowest TCGplayer id among standard prints); a Parallel, Manga or SP is chosen
  with the line's printing switch, which writes `#<productId>` into the list so
  the share link and the Buy List Planner get the same printing. `_p1`/`_p2`
  (deck-builder exports) pick the Nth parallel. A name without a number is
  matched to the number with the most printings and shown as a guess; an
  unmatched line is listed, never dropped.
- **Copies are assumed available.** Stores publish in-stock, not quantities, so
  a line of four is four times the store's price, and both /deck and the
  planner say so. eBay rows never fill a deck line (the Buy List Planner's
  rule): many sellers behind one `source`.
- **/deck's "buy each card where it's cheapest" is free; the planner stays
  Premium.** The per-card cheapest store is what every card page already
  shows; the planner's value is the best single-store orders and the condition
  floor. A free account now gets its planner TOTAL (RiftCompare's free Best
  Basket taste): `/api/buy-list` returns only the total and counts unless the
  account is Premium, so no store name, pick or link leaves the server.
- **Minimum condition.** `lib/buy-list-condition.ts`: store rows by their
  recorded grade (unstated = Near Mint, as a store's headline price means);
  TCGplayer's row is its lowest listing across every condition, so it is left
  out at "NM only" and "LP or better" instead of being assumed mint.
- **Selling fees are dated and sourced, or blank.** Rates checked on
  2026-10-03 on the marketplaces' own pages where they loaded: eBay US (13.25%
  of the whole sale to $7,500, 2.35% above, $0.30/$0.40 per order), eBay UK
  private sellers (no final value fee). TCGplayer's help page refused the fetch;
  its 10.75% / $75 cap / 2.5% + $0.30 comes from a 2026 fee comparison citing
  the February 10, 2026 change, and links to TCGplayer's page. Cardmarket, eBay
  Australia and eBay Canada are left for the seller to enter (RiftCompare's
  rule: a stale percentage is worse than none).
- **Keywords come from card text.** `Card.effect` is real (6,674 of 7,255
  printings), so `/keywords` exists: `getCardText()` reads one row per card
  number (DISTINCT ON) and caches only keyword slugs and types, never the text.
  A card "has" a keyword when the bracket appears in its text, including cards
  that gain it; the page says "whose text has". Definitions are short
  paraphrases of the Comprehensive Rules with no rule numbers cited.
- **Store pages count "cheapest" in SQL.** `getStoreStats()` aggregates every
  store row against the market's `low` in one query (live = in stock and
  refreshed in 72 h). Store pages under 10 live listings are noindex and left
  out of the sitemap.
- **Leader pages** link "cards for this deck" by shared type within the
  Leader's colours (every colour of the card is one of the Leader's), a safe
  subset; they are a starting point, not a decklist, and the page says so.

## 2026-10-03 — Tools review: deck prices from store listings, condition floor is Premium

- **A deck line is priced from its store listings, not the catalogue's low.**
  `Card.low<M>` folds in eBay asks (lib/import.ts), so /deck could show an eBay
  price beside a link to a dearer store and count an eBay ask in a "buy at the
  cheapest store" total. `lib/deck.ts storeLows()` takes each market's cheapest
  in-stock store or TCGplayer offer from the card's cached offers; the shared
  link's unfurl prices the same way, so the og:title and the page agree. The
  printing switch's option prices still read the catalogue's low (loading
  every printing's offers per line would multiply the per-card reads).
- **The minimum condition is a Premium control, as on RiftCompare.** A free or
  Plus account's total is any condition (the API ignores a floor it sends) and
  says how many of its cheapest copies are played or TCGplayer's any-condition
  low (`cheapestGrades`). Premium starts on "LP or better" and the last choice
  is remembered in the browser. /api/buy-list is rate-limited per account.
  RiftCompare's "5 free totals a day" is not ported: OP's rate limiter is
  per-instance memory, so a daily cap would not hold.
- **/deck gained RiftCompare's search-to-add and "find it" for unmatched
  lines**, through /api/search's hits and an `add: {slug}` on /api/deck/price
  (the server turns the slug into the canonical list line).
- Paged facet and keyword pages carry their own `?page=N` canonical and og:url;
  a store page with nothing matched is noindex like a thin one; fee deductions
  and losses read "−$1.50", never "$-1.50".

## 2026-10-03 — Search, recently viewed, chart, filter chips, watch drawer and blog shop strip (RiftCompare parity)

Ported from RiftCompare's SearchBar, RecentlyViewedRail, PriceChart/Sparkline,
Filters/ActiveFilters, WatchlistDrawer and ArticleShopStrip, adapted where OP
Compare's data or rules differ.

- **Search matching** (`lib/search.ts`, pinned by `tests/search.test.ts`).
  Punctuation is a space and quotes split words, so "Monkey.D.Luffy",
  "monkey d luffy" and `Eustass"Captain"Kid` → "captain kid" all match; a
  squashed query ("monkeydluffy") matches the squashed name. A query word must
  match the START of a word in the card's text (name, number, printing,
  rarity, type, set); four letters or more may also match inside a word. This
  is stricter than the old substring rule on purpose: "nami sp" used to hit
  every name with "sp" inside it. A card number anywhere in the query narrows
  by the remaining words ("OP05-119 manga"). Nicknames (big mom, blackbeard,
  doffy, akainu …) are tried IN ADDITION to the typed words, mapped to one
  distinctive printed-name word ("big mom" → "linlin" finds Charlotte Linlin
  and Kaido & Linlin), so an alias can add results but never remove one.
  Ranking weights are unchanged (value still beats print type), with a bonus
  for words that hit the name. A query with no match gets up to three real
  names within a small edit distance ("Did you mean"), closest first, then the
  name with most printings — never invented names.
- **No match → eBay search.** As on RiftCompare: an affiliate eBay SEARCH for
  the typed words on the visitor's own eBay, labelled as a search with a
  paid-link line. No listing is claimed.
- **Recently viewed and recent searches** are localStorage only
  (`lib/recently-viewed.ts`, 12 cards, 5 searches, defensive parsing). The
  card page records through ONE island (`<RecentlyViewed record>`), which also
  shows the rail; the search box shows both when empty, the watchlist page the
  rail. QuickView should also record (integrator: call `pushRecentCard` from
  QuickView's open, as RiftCompare does).
- **Interactive chart without breaking LineChart's props.** Pages pass a
  `format` function, which cannot cross into a client component, so the
  server half formats every point and each range's axis ticks and the client
  island (`LineChartInteractive`) only draws. Range tabs are offered only when
  the history is longer than the range. History holds US market and US low
  only, so there are no per-market series to show; the chart does not invent
  them.
- **Sparklines read history files, not the database.** `getSparklines` (the ux
  block at the end of `lib/data.ts`) reads the same GitHub bucket files as the
  card chart, one per distinct bucket, capped at 48 ids, through the fetch
  cache; no `unstable_cache`, no Prisma. Used on /movers (hidden in the
  three-column layout between lg and 2xl, where it would crush names) and in
  the watchlist page and drawer.
- **Filters apply instantly, URL is the state.** `BrowseFilters` is a client
  form with an optimistic copy of the query string (RiftCompare's pattern);
  `FilterChips` removes one filter per tap. Both write the one canonical query
  from `lib/filter-chips.ts` (fixed key order, CSV multi-values, defaults and
  `page` dropped; old repeated-key links still parse). It stays a real GET
  form, so without JavaScript the bottom button submits it; with JavaScript
  that button is the phone's "Show results". Price boxes apply on Enter or
  blur. /cards is a hub of links into /browse, so the chips live on /browse.
- **Watch drawer, no sign-in wall.** OP Compare's watchlist is browser-only,
  so the drawer (header heart with a count, `WatchDrawer.tsx`) shows the list
  directly, where RiftCompare's asks to sign in; the copy promises no
  price-drop email because OP Compare sends none. It is self-contained (no
  provider in the root layout, which still reads no session); anything can
  open it with `openWatchDrawer()`. /watchlist stays the deep link.
- **Blog shop strip from the post itself.** Posts are built from data, so the
  strip reads the post's unrendered React tree (`components/blog/mentions.ts`)
  for the cards and products it names — CardLite props and /card or /sealed
  links — in order of first mention, hero cards first, capped at six cards.
  Each row shows the live cheapest price in the reader's market and an
  affiliate eBay search ("Search eBay", never "Buy"). No list to maintain.
- **/search?q=** redirects to /browse?q=, the results page the WebSite
  SearchAction already names.

## 2026-10-03 — UX parity review fixes

- **Enter in a /browse price box now applies it.** With JavaScript the filter
  form has no submit button (the bottom bar becomes a `type="button"` "Show
  results"), and a form with two text boxes and no submit button gets no
  implicit submission, so Enter did nothing. The price boxes now handle Enter
  themselves; blur still applies too.
- **Market adjectives take the right article.** "a Australian listing" read
  wrong in the filter panel, its chip and on /sets. `withArticle()`
  (`lib/filter-chips.ts`) gives "an Australian" and "a US / UK / European".
  The price chip reads "From A$5", "Up to A$20" or "A$5–A$20" instead of an
  infinity sign or a zero.
- **The blog shop strip finds products in tables and the summary.** The box
  post names its boxes in the summary and in `SimpleTable` rows (arrays of
  cells holding links), which the first walk skipped, so a post about boxes
  showed only singles. Every prop is now walked for links and card objects,
  and the strip is titled "Shop this post" when it lists products.
- Small fixes: tabbing out of the search box closes its list; the watch
  drawer's focus trap pulls focus back in after an unwatched row disappears;
  the watchlist puts the printing on the sub-line so a long name cannot hide
  it on a phone; chart range tabs are 44px tall on touch screens, as on
  RiftCompare.

## 2026-10-03 — Integrating the five parity tracks

The premium, quickview, deals, tools and ux branches were merged in that order,
keeping both sides of every conflict. The calls that were not mechanical:

- **Layout nesting:** CountryProvider > QuickViewProvider > PlanProvider, so a
  QuickView's buttons can open the plan dialog and every corner nudge still
  yields to the QuickView's `aria-modal`. No session read was added.
- **/leaders rows** open each Leader's own page (tools), not a QuickView;
  the card links on `/leaders/[slug]` are CardQuickLinks instead.
- **Card search** keeps the ux rewrite: each card row is a CardQuickLink and
  Enter clicks the row's anchor, so QuickView opens with no search-specific
  QuickView code.
- **The chart** keeps the ux interactive chart (it already measures real
  pixels and sizes its gutter); QuickView's `width` is only the width drawn
  before the wrapper is measured.
- **Buy List route** keeps the tools version (it tags links with the planner's
  `tagPlanLinks` and adds each basket's store label); its rows
  carry quickview's `data-card`/`data-surface` and PlanButton's
  `gate:buy-list` surface.
- **Premium proof:** `/api/premium/proof` answers `{country, deals, dealCount}`
  (one number, two names) and PremiumProofLine reads `deals`, falling back to
  `dealCount`. The default list counts eBay listings too, so the proof line no
  longer says "at a real store".
- **Deal Finder's "N more cards"** goes through Upsell's MoreWithPlan with the
  real count; there is no second count line.
- QuickView records the card in "recently viewed" when it opens, as the card
  page does. Home trending links open QuickView. The card page's card number
  no longer breaks at its hyphen. "a {adjective} store" copy uses withArticle.

## 2026-10-03 — Fixes after the parity integration

Verification of the integrated branch found these; the calls that were not
mechanical:

- **Lists close in the bubble phase.** The search dropdown's rows, its
  recently viewed chips and the watchlist drawer closed in `onClickCapture`,
  which unmounted the row before CardQuickLink's `onClick` ran, so a mouse
  click or tap followed the href instead of opening QuickView (Enter worked,
  because it clicks the anchor itself). They close in `onClick` now, after the
  link has handled the click; `tests/quick-view.test.ts` forbids
  `onClickCapture` in those three files.
- **The homepage's Plus rows are limited on the server.** The page used to
  carry four "Biggest savings" rows and hide three in the browser, against
  "gated rows are limited in the QUERY". `getTopDeals` now returns one savings
  row plus the real total (the cached HTML is still the same for everyone),
  and a member's browser asks `/api/top-deals/savings` (session + `isPremium`
  per request, uncached, backed only by the self-cached loaders) for the four.
  This departs from RiftCompare, which hides rows in the browser.
- **Beacon retention: 90 days.** `ClickEvent` and `PremiumClick` had no
  pruning. The import (twice a day) now runs `pruneBeacons` (non-fatal), the
  admin reports read only the last 90 days (no all-time scan), and both beacon
  routes refuse cross-site posts (`sameOrigin`). OP Compare has no account
  deletion yet; when it gets one, it must null `userId` on both tables.
- **A link names its card.** OutboundBeacon prefers the anchor's `data-card`
  to the page path, so clicks from Deal Finder, the deck pricer and a QuickView
  opened on another page are attributed to the right card; Deal Finder's and
  the deck pricer's links now carry `data-card` and `data-surface`.
  `/admin/clicks` links a sealed slug to `/sealed/`.
- **`/deck?list=` metadata** shares `/api/deck/price`'s per-IP budget (40 a
  minute) before its card loads, and unfurls generically past it, rather than
  pricing from the catalogue's low (which counts eBay and would quote a
  different total than the page).
- **Header "Pricing" stays a link to /premium**, as RiftCompare's is; opening
  the plan dialog there instead is the owner's call.

## 2026-10-03 — Wave-2 schema: watch/alert/collection/deck/support/eBay-panel tables, additive

Wave 2 makes OP Compare a one-to-one copy of RiftCompare's member features,
and every track codes against one schema, landed first and then frozen (the
foundation track owns `prisma/schema.prisma` for the whole wave).

- **Added, all additive** (`prisma db push`, no backfill): `PriceAlert`,
  `AlertMute`, `SealedWatch`, `DeckWatch`, `Notification`, `CollectionCard`,
  `Counter`, `NewsletterSubscriber`, `SetReleaseAlert`, `PublishedDeck`,
  `RisingSnapshot`, `SupportTicket`, `EbayListing`, `EbayGradedListing`; on
  `User` the activity, country, signup-source, share-id, basket-prefs and
  welcome-email columns and the relations; on `Card` `searchCount`,
  `viewCount`, `lastViewedAt`; `ClickEvent.entry`, `PremiumClick.source`,
  `Feedback.email`.
- **RiftCompare's shapes with OP's ids.** `Card.id` and `Sealed.id` are Int
  TCGplayer product ids, `User.id` a cuid, the default market `"US"`. A sealed
  watch keys on `Sealed.id` (RiftCompare: a group key), a published deck on a
  leader card id plus a `leaderSlug` of name and number.
- **`PriceAlert.userId` is nullable** so the anonymous (email-only) watch can be
  enabled later; a signed-in watch carries the account's email. The unique key
  is RiftCompare's `(email, cardId, market)`.
- **Email is off until configured, and the schema says what was delivered.**
  `lastNotifiedAt` is set only when an email was actually sent;
  `lastFlaggedAt` when an in-app `Notification` was written instead;
  `confirmSentAt` is the outbox stamp for a confirmation.
- **`Feedback.email` reverses "keeps no email" for Feedback only.** It is an
  optional reply address the visitor types, never shown publicly (RiftCompare
  has it). Price reports and store suggestions still keep none;
  `tests/inbox.test.ts` pins both halves.
- **Card view/search counters are a per-request write** — one `UPDATE` per
  counted view — the documented exception to "no per-request writes", for
  RiftCompare's popularity ranking. The tools track owns the counting and its
  throttle.
- **Still no history in Prisma.** Price, demand and rising history stay files
  on the `data` branch. Not added (deferred): trial columns,
  `UserDigestOptOut`, `AnnouncementOptOut`, `EbayAuctionListing`.
- The eBay panel tables are written ONLY by `scripts/ebay.ts` after a
  completed search (CLAUDE.md, eBay); pages read them through `data.ts`.

## 2026-10-03 — Wave-2 design tokens, fonts and the main container (RiftCompare parity)

Owner: "the font and everything needs to be the same". OP Compare now carries
RiftCompare's design system byte for byte, with one deliberate difference.

- **Fonts are RiftCompare's.** Inter (body, preloaded), JetBrains Mono
  (numerals, not preloaded) and Fraunces 600/700/900 for h1–h3 and
  `.rb-eyebrow`, as next/font variables on `<html>`; `<body>` is
  `min-h-screen bg-ink-950`. Archivo (as `--font-riftbound`, RiftCompare's
  variable name, kept so the CSS stays one diff) is the homepage's own import
  under `.rb-display-sans` (the design track adds it). Luckiest Guy and the
  `font-brand` family are gone from the site; they stay only in the share-image
  fonts (`src/lib/og/fonts`, pinned by CLAUDE.md).
- **Tokens are RiftCompare's.** `tailwind.config.ts` and `globals.css` are
  copies of RiftCompare's: graphite ink neutrals, the #f4f6f8 light theme, gold
  #caa85a, up/down, every chromatic shade, the motion tokens
  (`src/lib/motion-tokens.ts`: 120/200/320/150 ms, one ease-out curve, the z
  scale with menu 95 and modal 120), the `.pg-*` price-guide classes, the
  coarse-pointer 48px floor and the reduced-motion block kept last.
- **The one difference: the brand ramp stays Straw Hat red** (500 #d92b33, 600
  #b11f27, 400 themed 255 107 107 / 176 22 30). Red takes WHITE ink (white on
  #d92b33 is 4.8:1, near-black about 4.4:1), so `.btn-primary` is
  `bg-brand-500 text-[#ffffff] hover:bg-brand-600` (RiftCompare: dark ink,
  hovering lighter), the light-mode dark-ink and hover overrides for it are
  dropped, and an unlayered `.bg-brand-500.text-ink-950 { color: #fff }` lets
  RiftCompare markup that writes dark ink on a brand fill (the current page
  cell, an active menu link) be copied verbatim. The owner may still choose
  RiftCompare green; then this paragraph and the brand hexes are the whole diff.
- **Retired OP-only vocabulary.** The `straw` token became RiftCompare's `gold`
  (RiftCompare uses gold for its Plus/Premium surfaces as well as foil), and
  `.eyebrow` → `.rb-eyebrow text-slate-500`, `.link` → `text-brand-400
  hover:underline`, `.prose-op` → RiftCompare's article and about-page classes
  (`src/components/prose.ts`), `.data-table` → RiftCompare's plain table
  classes, `.btn-straw`, `--hero-sea`, `.sea-grid` and `animate-bob` deleted.
  `brand-300` stays undefined, as on RiftCompare.
- **Theme: RiftCompare's cookie.** `src/lib/theme-shared.ts` (a `theme` cookie,
  one year, Lax; the boot script always stamps `data-theme`) replaces
  `src/lib/theme.ts`; the boot script moves an old `op:theme` localStorage value
  into the cookie once and removes it. `ThemeToggle` is RiftCompare's (icon and
  row variants, an `oc:theme` event, the theme-color meta kept in step). The
  default is LIGHT, not RiftCompare's dark (see "Light theme is the default"
  below): `<html data-theme="light">`, `resolveThemeMode` falls back to light,
  dark only from the cookie or a migrated `op:theme` of `dark`, and
  `viewport.themeColor` is the light page colour #f4f6f8.
- **ui primitives are RiftCompare's** (`src/components/ui/{Dialog,EmptyState,
  SegmentedTabs,Skeleton,Toast,Tooltip}.tsx`), with OP's `data-oc-dialog` body
  flag. Wave 1's `components/Dialog.tsx` is a thin re-export (default z
  `overlay`, as QuickView sits on RiftCompare), and PlanDialog uses the shared
  refcounted scroll lock, modal flag and topmost-only Escape, so a plan dialog
  opened over QuickView releases neither early.
- **The layout owns the container.** RiftCompare's shell: a "Skip to main
  content" link, `<div class="pl-[var(--sidenav-w)]"><main id="main-content"
  class="container-app min-w-0 py-6">`, and the footer ad zone in its own rail
  wrapper. Every page dropped its outer `container-app` and `py-*`; a full-bleed
  band uses RiftCompare's CinematicHero breakout (`left-1/2 -mt-6 w-screen
  translate-x-[calc(-50%-var(--sidenav-w)/2)]` with the rail reserved inside).
  The admin bar became a hairline at the top of the content column.
- **Not done here, on purpose:** the header, rail, phone menu, footer, logo,
  CardTile, homepage and 404 bodies are the design track's. The root layout
  still reads the country cookie (`getCountry()`) until that track moves the
  market to the client as RiftCompare does.

## 2026-10-03 — Wave-2 free limits, shared limit modules and the watchlist store

- **Free limits: 10 watched cards, 50 portfolio cards.** This REVERSES "The
  watchlist stays in the browser for everyone, so there are no free limits to
  enforce" (Plus & Premium entry above), because the owner asked for
  RiftCompare parity ("all the premium features"). The numbers and the rules are
  RiftCompare's (`src/lib/free-limits.ts`): only adding a NEW card is refused at
  the limit, nothing held is ever lost (grandfathering), any paid tier is
  unlimited and never counted, and the refusal is a structured 402. The
  enforcement lands with the member and collection tracks' routes. Flagged for
  the owner.
- **One home for tier numbers.** `src/lib/tier-limits.ts` holds every tier
  constant another wave-2 track enforces (`FREE_RISING_ROWS` 3,
  `FREE_DEMAND_ROWS` 10, `PREMIUM_DEMAND_ROWS` 25, `FREE_BASKET_TOTALS_PER_DAY`
  5, `SET_GAP_CHUNK` 200) and re-exports `FREE_DEAL_ROWS` and the free-limit and
  alert numbers (`src/lib/alert-limits.ts`: 25 Plus targets, 10 Premium deck
  watches, 10 Plus sealed watches with a hard cap of 200). No other module
  redeclares them.
- **Sealed watches are checked "twice a day"** (OP's import cadence, not
  RiftCompare's four reads) and **no market has an at-RRP alert**
  (`SEALED_RRP_MARKETS = []`) until OP Compare has an MSRP table.
- **`src/lib/use-watchlist.ts`** is RiftCompare's module-level store (one
  shared promise, subscribers, optimistic watch/unwatch with rollback, the
  free-limit 402 handed to `onLimit`, `invalidateWatchlist`) with OP's ids
  (numbers) and a second, signed-out branch: the watched set is the card items
  of localStorage `op:watchlist` (WatchButton's format), written by
  watch/unwatch with no request at all. A card counts as watched by id or, for
  older local items that carry none, by slug. Signed in, it reads
  `/api/alerts/watchlist?ids=1` (the member track's route; until then a 404 is
  an empty list). The merge of the local list into the account is the member
  track's. Unlike RiftCompare's, a subscribed store also follows `oc:me`
  (fired by `invalidateMe()` on sign-in, sign-out and plan changes): it drops
  its state and loads again, so the header count and every heart switch
  between the local and the account list without a reload, even where a caller
  forgets `invalidateWatchlist()` (the account menu's sign-out did).
- **`trackEvent` sends to GA4 only** (`src/lib/analytics.ts`) and is a no-op
  without `NEXT_PUBLIC_GA_ID`; RiftCompare also mirrors to Vercel Analytics,
  whose custom events are billed.
- **`getEmailStatus()`** (`data.ts`, block `wave2:foundation`) reads Meta key
  `email`, cached like `getHistoryRef`; anything but `"on"`, and any read error
  (caught outside the cache), is `"off"`. Pages decide what to promise from it.

## 2026-10-03 — Egress: the wave-2 per-user libraries

The accounts exception in CLAUDE.md now names
`src/lib/{watchlist-server,collection-server,collection-share,set-owned,
notifications,sealed-watch,deck-watch,published-decks-server}.ts`: per-user or
per-request, uncached, `select`-limited, called only from `/api/*` routes and
account pages (`/watching`, `/dashboard`, `/profile`, `/portfolio/**`,
`/c/[token]`), never from the root layout or a public page. The rule that made
the exception safe still holds: nothing under `src/app` imports `@/lib/db`.
`tests/app-no-db-import.test.ts` now checks every import shape (alias,
relative path, re-export, dynamic `import()`, `require`) and that the root
layout imports none of the per-user libraries.

## 2026-10-03 — Light theme is the default (reversed 2026-10-24: "Dark theme is the default again")

**Decision.** OP Compare now opens in the light theme. The root layout renders
`<html data-theme="light">`, and the boot script switches to dark only when the
visitor has chosen dark with the toggle (`op:theme` = `dark`). Dark stays fully
supported.

**Why.** The owner asked for light by default. This departs from RiftCompare,
which defaults to dark; the wave-2 design port (RC's `theme-shared.ts`) must
keep light as the default when it replaces `src/lib/theme.ts`.

Kept through the wave-2 theme port (2026-10-03): RiftCompare's
`src/lib/theme-shared.ts` replaced `src/lib/theme.ts`, and its default was
flipped to light (`DEFAULT_THEME`); `tests/theme.test.ts` pins the light
fallback, the server-rendered attribute and the light theme-colour.

## 2026-10-03 — "N stores" counts TCGplayer again (never eBay)

**Decision.** Every store count (`Card.stores<M>`, the card and sealed pages'
"In stock at", the tiles) counts each in-stock seller the price comparison
shows except eBay: every tracked store plus TCGplayer. `isStoreSource()` is
`!source.startsWith("ebay")` and the aggregate filter is `NOT LIKE 'ebay%'`.

**Why.** The owner saw a card listing Wulf Gaming and TCGplayer in its
comparison while the header said "1 store". RiftCompare's `computeMarket`
counts every in-stock retailer in the comparison, TCGplayer included. This
reverses the stores-only count from "Store matching: SKU numbers, …" earlier
today; eBay stays out per CLAUDE.md ("never counted as a store").

## 2026-10-03 — Workflows push the schema through `scripts/db-push-safe.sh`

**Decision.** The import and eBay workflows run `scripts/db-push-safe.sh`
instead of a bare `prisma db push`. It retries with `--accept-data-loss` only
when every warning Prisma prints is "A unique constraint covering the columns …
will be added"; any other warning (a dropped column or table, a type change) still
fails the run.

**Why.** The wave-2 schema adds `User.collectionShareId @unique`, a new nullable
column whose rows are all NULL. Postgres lets any number of NULLs share a
unique index, so nothing can be lost, but Prisma still demands the flag, and the
first import after the merge failed before touching the database. Passing the
flag unconditionally would also let a real drop through unattended.
## 2026-10-03 — More stores: 119 Shopify + ShadowPOS/Ecwid/BigCommerce adapters

**Decision.** The registry grows from 235 to 386 stores: 119 Shopify stores
from a third, per-market verification pass, 30 ShadowPOS stores (US), one
Ecwid store (Mighty Toys, AU) and one BigCommerce store (Grand J Games, AU).
`StoreInfo` gains `platform` (omitted = `shopify`) and, for Ecwid,
`ecwidStoreId`; `fetchStoreListings()` (lib/store-import.ts) picks the reader.
Every reader returns the Shopify listing shape plus the listing's own URL, so
each listing goes through the same `matchStoreProduct`, best in-stock variant,
market-currency, plausibility and 72 h staleness rules; a read that fails
keeps the store's existing rows, as a failed Shopify collection does, and says
why (`note`, shown on /admin/store-health with the platform).

- **Shopify: 127 verified lines, 120 stores.** Seven RiftCompare-overlap lines
  duplicated the market files by host and myshopify domain and were registered
  once. Manathril (US) was then removed: 3 listings in stock, and its sold-out
  rows priced at ~30% of TCGplayer's market (78 refused as implausible).
  Added per market: US 40, CA 51 (incl. La Crypte), AU 12, UK 7, EU 9. The
  Shopify reader's page cap rose from 30 to 40 × 250: Card Brawlers' One Piece
  collection is 7,355 products, exactly past the old cap.
- **ShadowPOS** (lib/shadowpos.ts): `/api/advanced-search?game=onepiece&
  inStockOnly=true`, the storefront's own search, 100 products a request; the
  title is TCGplayer's ("Absalom (OP06-081 — Alternate Art)") and the set
  name goes in trailing brackets, the shape the matcher already reads. The
  payload states no currency, so the reader refuses a non-US store
  (tests/stores.test.ts pins that every ShadowPOS store is US). The shops share
  the platform's servers: at most two are read at once, pages a second apart.
  Evolution Games (evolutiontcg.com, TX) is `evolutiongamestx`, not the UK
  `evolutiontcg`; the two Lotus Games are different shops (CT, MT).
- **Ecwid** (lib/ecwid.ts): app.ecwid.com/api/v3 with a public token read from
  the storefront HTML on every run (the first one /profile accepts; on Mighty
  Toys that is an app's public token, which Ecwid publishes for client-side
  catalogue reads), sent as a Bearer header. /profile's currency must be the
  market's or nothing is read. The store's own robots.txt disallows its `/api/`
  path (Ecwid's generated list); the API host's robots.txt is empty.
- **BigCommerce** (lib/bigcommerce.ts): the server-rendered category page,
  `?limit=100&page=N` (Grand J Games: ~50 requests for ~5,000 singles), title,
  price text ("22.00$ AUD", any other ISO code is refused) and the "Add to
  Cart" / "Out of stock" button. Its URLs end in TCGplayer product ids; that
  is not used — the title goes through the matcher like every other.
- **WooCommerce** (lib/woocommerce.ts): ported from RiftCompare (Store API,
  `currency_code` checked per product, a variable product's top price as Near
  Mint) and tested, but **no store registered**: the only One Piece candidates
  were collectstoys.com (French-edition set names, English not established)
  and kadomart.com.au (SiteGround captcha on the first request).
- **nopCommerce** (lib/nopcommerce.ts): built and tested — category pages with
  the store's own "Stock Status = In Stock" filter (`?specs=<id>`), every price
  required to carry the market's symbol — but Unicorn Cards (UK) is **not
  registered**: it prices in the visitor's location's currency (a US runner is
  served USD), and the currency switch (/changecurrency) is disallowed by its
  robots.txt. Only curl's and Googlebot's user agents get GBP; we do not
  impersonate either.
- **Skipped**: GameNerdz (BigCommerce, ~6,000 numbered URLs): its category
  grid is rendered client-side (StorePass), so reading it means one product
  page per card, ~6,000 requests a run. The same goes for the sitemap +
  JSON-LD stores (chobanovgamesltd.com, cardgamecorner.com — which also asks
  ClaudeBot for a 10 s crawl delay — card-z.com, tcg-cards.nl, magictime.it,
  asheretrocollectibles.com) and nakamagames.com (PrestaShop, language only on
  the product page). gate-to-the-games.de (JTL) stocks English OP01–OP03 only,
  mixed with Japanese pages. None is polite and bounded at twice a day.

**Measured** (local full import against the same TCGCSV catalogue, before →
after; "printings" = cards with an in-stock store listing updated in the last
72 h):

| Market | Stores in registry | Stores with stock | Printings in stock | In-stock store offers |
|---|---|---|---|---|
| US | 73 → 143 | 73 → 143 | 6,269 → 6,451 | 52,306 → 83,948 |
| CA | 57 → 108 | 57 → 108 | 6,014 → 6,355 | 54,071 → 99,234 |
| AU | 50 → 64 | 49 → 63 | 5,737 → 5,826 | 43,889 → 55,158 |
| UK | 30 → 37 | 29 → 36 | 3,847 → 3,886 | 11,907 → 13,549 |
| EU | 24 → 33 | 22 → 31 | 3,645 → 3,787 | 12,983 → 21,225 |
| SG | 1 → 1 | 0 → 0 | 0 → 0 | 0 → 0 |

ShadowPOS: 16,198 listings read, 14,478 matched, 14,429 in stock (49 US
printings are in stock only there). Grand J Games: 4,981 read, 3,984 matched,
2,354 in stock. Mighty Toys: 746 read, all matched, 318 printings (it lists
copies as separate products). Every new store matched at least 16 listings; the
full import took 13 minutes (8 before). PokéBox (AU, an existing store) failed
on a different collection in each of the two runs; it also failed in two
earlier runs today, so it is not this change.

## 2026-10-03 — Wave 2 design track: RiftCompare's chrome, card tile and homepage

**Decision.** The header (`NavbarShell` + a server `Navbar`), the desktop rail
(`SideNav`), `nav-groups.ts` in RiftCompare's shape, the phone menu
(`MegaMenuProvider` + `CinematicNavMenu`), the ⌘K launcher, the account menu
(`UserMenu`), `CountrySwitcher` / `CountryHeroToggle` / `RegionToggle`, the
footer, `BrandLogo`, `Breadcrumbs`, the card tile, `Pagination` /
`SortSelect` / `PageSizeSelect`, `Reveal` / `CountUp` / `template.tsx` /
`RouteLoading`, the 404 and error pages, `AuthForm`, consent-gated analytics
and the feedback widget are RiftCompare's markup and classes, rebranded. The
homepage is RiftCompare's page section for section, and `/au /uk /ca /sg /eu`
are its region homes. `MobileMenu`, `CountrySelect`, `MarketPills`,
`AuthButtons`, `Wordmark` and `BrandLockup` are gone.

**Deliberate differences from RiftCompare.**
- *Brand.* `BrandLogo` masks `/logo-mask.svg` (the straw hat with the band cut
  out, so it still reads as a hat in one colour) with the red ramp
  `#ff6b6b → #d92b33`. Every active fill on red (the phone menu's current
  link, the current page, the region toggle) uses white ink.
- *Pricing in the header* stays hidden for Plus/Premium accounts (wave 1's
  rule), through `HeaderPricingLink` (a `PremiumNavLink`).
- *The rail* highlights only the most specific matching link. RiftCompare's
  prefix test lit `/cards` and `/cards/all` (and `/market` + `/market/records`)
  at once; OP Compare has more nested rail links.
- *No games, no "For stores", no Riftbound-only pages* in the nav. Routes the
  other wave-2 tracks build (`/watching`, `/dashboard`, `/portfolio`,
  `/tools/best-basket`, `/guides`, …) are linked now;
  `tests/nav-routes.test.ts` lists them in `IN_FLIGHT` and fails once one of
  them exists, so the integrator empties the list after the merges.
- *The country picker* has no UK GBP→EUR display toggle, and the signed-in
  `preferredCountry` sync is not ported (`/api/me` carries no market yet).
- *Consent.* OP Compare has no CMP, so `useConsent()` takes the no-CMP path
  (grant after 2.5 s) for Vercel Analytics only. Unlike RiftCompare it does not
  push a gtag consent update on that path: OP Compare's region-scoped GA
  defaults (analytics denied in the EEA, the UK and Switzerland) must stand when
  nobody was asked. GA4 now sends page views only from `GAPageViewTracker`
  (`send_page_view:false`), never on `/admin`. Speed Insights is not shipped.
- *Login.* `AuthForm`'s perks are what a free account really gets here
  (Watchlist, Binder, Top 3 deals) and no line promises an email. OP Compare
  was always OAuth-only, so the "signed up with a password before?" note is
  dropped. The Plus/Premium dialog's signed-out state embeds `AuthForm`
  (`compact bare`), so a visitor signs in without leaving the dialog.
- *Feedback.* `/api/feedback` takes the widget's optional reply address
  (validated, stored in `Feedback.email`, never public). It is a manual reply
  address, like the contact form's, not an email capture for sending.

**The static root layout.** The layout no longer calls `getCountry()`: the
chrome renders for `DEFAULT_COUNTRY` and `CountryProvider` resolves the
market on the client from the `country` cookie, its localStorage mirror, then
one `/api/geo` call (RiftCompare's model). A visitor whose stored market
disagrees with the region home they open is sent to their own. Pages that
price server-side still call `getCountry()` themselves; `CardTile` takes their
`country` as a prop, and falls back to the provider's market on the static
pages.

## 2026-10-03 — The homepage: one cached HTML for six markets

**Decision.** `/` (and each region home) is ISR, hourly, with no cookie or
session read. It carries every market's hero stats and Today's Top Deals and
the client shows the visitor's. The data is composed from the cached loaders
in `data.ts` (block `wave2:design`): `getHomeStats()` reuses `getSiteStats()`
and the catalogue (no new query), stores = in-stock `store:*` sources plus
TCGplayer in the US, never eBay.

- **"Most popular" needs a real counter.** `getPopular()` reads the most
  searched cards (`Card.searchCount`, written by the tools track). Until six
  cards have a count, the tab is labelled "Chase cards" (the newest booster's
  most valuable printings) and nothing says "most searched".
- **"Recently updated"** diffs the two newest daily history files
  (`history/days/*.json`, already in the fetch cache) on TCGplayer's market
  price, with RiftCompare's outlier guard (+300% / −80%) and a US$1 floor at
  both ends, where a few cents read as a huge percentage.
- **"Biggest movers"** is TCGplayer's 7-day change, one worldwide figure.
- **"Explore the database"** shows the twelve newest booster and extra-booster
  sets (two rows of six) with New / Coming soon chips, then the six colours;
  every other set is one link away.
- **FAQ claims are built from constants** (`src/lib/home-faq.ts`): the markets
  and currencies from `COUNTRY_LIST`, the cadence from `IMPORT_CADENCE`, and eBay
  listings only while the eBay pass is live. `tests/home.test.ts` pins them.

## 2026-10-03 — The watchlist moves into the account (wave 2, member track)

**Decision.** A signed-in visitor's watchlist is RiftCompare's: one
`PriceAlert` row per (card, market) written by `/api/alerts/watchlist`
(`src/lib/watchlist-server.ts`), shown at `/watching` and in the header
heart's right-hand drawer. The free limit (10 distinct cards) is enforced
there: a NEW card on a free account at the limit is a 402 that opens the
upgrade panel beside the heart that was tapped. Target prices ("Notify me at
$__") are Plus (25) and Premium (unlimited). Sealed watches are Plus (10) and
Premium (hard cap 200), keyed by `Sealed.id`.

- **Signed out keeps its hearts.** RiftCompare's signed-out heart asks for an
  email; OP Compare cannot honour one (no mailer), so a signed-out heart saves
  in this browser (`op:watchlist`) with a toast, and the drawer shows that list
  under "Sign in to sync and get alerts".
- **The merge on sign-in.** On the first signed-in load, `use-watchlist.ts`
  posts the local CARD items to `/api/alerts/watchlist/merge`, which resolves
  them through the cached catalogue (unknown slugs skipped), imports at most
  200 and GRANDFATHERS them — no free-limit check on the import, so nobody
  loses a heart by signing up; the limit applies to adds after it. On success
  the card items leave localStorage and `op:watchlist-merged` records the
  account; a failed merge leaves them for the next load. Any later local card
  items (a sign-out and back in) are merged the same way rather than stranded.
  Sealed items stay local for a free account (sealed watches are Plus) and are
  listed under "Sealed — saved in this browser" on `/watching`.
- **The start price is never eBay.** `startPriceCents` is seeded from the
  cheapest in-stock, fresh (36 h) `store:%` or `tcgplayer` Offer for the pair —
  never `Card.low*`, which includes eBay (`src/lib/watch-baseline.ts`,
  `baselineWhere`). To be replaced by the collection-alerts track's
  `alert-price` helper at integration if it lands.
- **Deal Finder "only my cards" and the basket's watchlist source** read the
  account's watches server-side (as RiftCompare's `readUserCardIds` does), plus
  any slugs still in the browser.
- `/watchlist` and `/account` are NON-permanent (307) redirects to `/watching`
  and `/profile`; robots.txt no longer disallows them — the personal pages carry
  a noindex meta instead, which a Disallow would hide.

## 2026-10-03 — Alerts are in-app until a mailer exists; the heart wears a dot

**Decision.** Every member surface promises an email only when
`getEmailStatus()` is "on" (`/api/me` carries it as `emailOn`; the card page
reads it directly). While it is off: the drawer says "we'll flag it here", the
target field says "We'll flag it on your watchlist when a store has it at $X or
less", `/watching` shows live "At your target" and "New low since you started"
chips (computed from the cached price the row shows), the pause banner and
snooze chips are hidden, the price-drop CTA says "Watch this price — we'll flag
it on your watchlist when it drops (Plus: at your own price)" and offers no
email-only door. The alert run's `notify()` rows are the delivery: a "Recent
alerts" panel on `/dashboard` (last 10, mark read) and a small brand dot on the
header heart while any is unread.

**Why.** RiftCompare delivers by email and removed its notification bell; with
email off, OP Compare's notifications are the only delivery, so they need a
surface. The dot is an OP divergence, flagged for the owner. The unread count
rides `/api/me` (one indexed count, signed in only) and refreshes on window
focus — never a 60-second poll.

## 2026-10-03 — Plan changes happen in the app; the portal keeps its switch

**Decision.** `/premium`'s member card is RiftCompare's SubscriptionActions:
"Upgrade to Premium" (`/api/premium/upgrade`, `proration_behavior:
always_invoice` — the prorated difference is billed now and the tools unlock at
once), "Switch down to Plus" (`/api/premium/downgrade`, `create_prorations` —
the unused part is credited to the next invoice; takes effect now), "Switch to
annual" and "Keep <Tier>" (`/api/premium/resume`). Each route acts only on the
caller's own active OP Compare subscription (`ourSubscription()` refuses
anything not `site=opcompare`), is idempotent on the tier read from the live
Price, keeps the subscriber's interval, and never writes `premiumUntil`: the
webhook restamps it from `customer.subscription.updated`. The quoted price
follows the interval (`plan-switch-price.ts`, from `/api/me`'s `interval`,
one memoised, time-boxed Stripe read per Plus customer, `billing-state.ts`).

**The portal.** RiftCompare turned plan switching OFF in its portal because a
portal switch skipped its intro coupon and ended trials. OP Compare has neither,
so `scripts/stripe-setup.ts` leaves `subscription_update` on for self-service.
One difference to know: the portal prorates an upgrade with
`create_prorations`, so an upgrade made THERE unlocks Premium at once but bills
the difference at renewal, whereas the in-app button bills it now. Owner's call
whether to turn the portal switch off.

## 2026-10-03 — Sign-in is a step inside checkout; checkout is attributed

**Decision.** Every signed-out "Get Plus/Premium" (the cards, the Plan dialog)
goes to `/premium/start?tier=&plan=&src=&back=`, which IS the sign-in step
(provider buttons with `next=` itself) and, signed in, opens Stripe through
`/api/premium/checkout` (CheckoutLauncher, one session per mount). Old
`/premium?go=plus-year` links forward there. The checkout route accepts the
surface that sent the buyer (validated by `isPlanClickSurface`, remembered in
sessionStorage across the OAuth round trip, `src/lib/premium-surface.ts`) and a
`back` path (`sanitizeBackPath`, with funnel loop guards), stamps both on the
Session and subscription metadata, returns to `back` on cancel, and records a
`PremiumClick{source:"checkout"}` row — `/admin/premium` shows "Started
checkout by surface". `/premium/welcome` checks `metadata.kind === "oc_premium"`
and the owner before confirming, lists "Just unlocked" from TIER_COMPARISON and
sends the member to `/dashboard` (the new sign-in fallback) or back.

## 2026-10-03 — The tier table is RiftCompare's eighteen rows

**Decision.** `TIER_COMPARISON` (`src/lib/plans.ts`) is RiftCompare's
`TierRow[]` with all eighteen rows, every number the enforced constant from
`src/lib/tier-limits.ts` (now the home of `FREE_DEAL_ROWS`, re-exported by
plans.ts, so the table can import the constants without an import cycle), and
the pricing cards carry RiftCompare's four bullets each. Prices are unchanged.
OP wording: "OP Compare Index"; the sealed row promises restock and price
alerts "checked twice a day" with no at-RRP claim (no MSRP table); the deck
watch "alerts" rather than "emails".

**Caveat for the owner.** Several rows describe tools other wave-2 tracks are
building in parallel (portfolio and set tracker, Rising Cards, Best Basket's
plan, Demand Finder, the deck watch). The plan put all eighteen rows in now for
parity; until each track merges, those rows describe features that are not yet
live on this branch.

## 2026-10-03 — Attribution, activity and the referral capture (reward off)

- **Sign-up source.** `?src=` on a sign-in link (and RiftCompare's
  `markSignupSource` click cookie, `oc_signup_src`, 30 minutes) is whitelisted
  (`signup-source-shared.ts`) and stamped as `User.signupSource` on a NEW
  account only. `/admin/accounts` shows sign-ups by source.
- **Entry bucket.** The tab's first-touch traffic bucket (reddit, search,
  email…; `utm_source` wins) rides every outbound click as `ClickEvent.entry`;
  `/admin/clicks` breaks clicks down by it. Reddit is the owner's channel.
- **Activity.** `lastActiveAt` / `activeDays` are stamped from `/api/me` and the
  account pages, at most once per 30 minutes or on a new UTC day, never awaited
  (RiftCompare buckets by Sydney day; OP is UTC throughout).
- **Referral.** `?ref=<userId>` is captured (`oc_ref`, 30 days) and applied on a
  new account, but `REFERRAL_PREMIUM_DAYS` defaults to **0**: a referral grant is
  an entitlement write, and CLAUDE.md allows only the webhook, the reconcile and
  the admin routes to make one. Turning it on needs the owner's approval AND a
  CLAUDE.md amendment; the grant is then extend-only (`grantedUntil`) and
  logged like an admin grant. The "Invite a friend" card on `/profile` stays
  hidden at 0.

## 2026-10-04 — Wave-2 tools: Best Basket, Box EV, demand, rising, deck library and deck watch

**Decision.** The tools track ports RiftCompare's tools one for one.

- Best Basket replaces the Buy List Planner. The optimiser, the minimum-condition
  floor and the postage display are RC's. Postage comes from the committed
  `src/lib/shipping-rates.json`, measured per store by
  `scripts/probe-shipping-rates.ts`; an unmeasured store uses the market's
  dearest measured one-card tracked rate and is flagged "estimate". eBay and
  TCGplayer-reference rows never enter a basket (`tests/basket-sources.test.ts`).
- The shipping refresh workflow (`.github/workflows/shipping-rates.yml`) runs
  monthly at 03:17 UTC and on dispatch, and uploads the rebuilt snapshot as an
  artifact. It never commits or opens a PR (the stricter of two ported tests
  wins); the owner commits the file.
- `/tools/box-value` (which summed one copy of every printing) is replaced by
  `/tools/box-ev`, a real expected value. Every rate in `pack-composition.ts` is
  `sourced: false`, set low on purpose, and the page says they are community
  estimates.
- Demand snapshots and `history/rising.json` are files on the `data` branch,
  written by the import's history step, never Prisma tables.
- The public deck library, the deck price watch (Premium, 10 lists) and the card
  view and search counters follow RC. The counters are the one public write to
  `Card` (bots dropped, per-IP caps), the same exception RC records.
- Plan-click surfaces stay `[a-z-]` scoped: `gate:basket-limit`, `inline-deck`,
  `inline-published-deck`.

**Why.** The owner asked for a copy-paste of RiftCompare with only branding and
cards changed.

## 2026-10-04 — My binder, the set checklist and the share link (RiftCompare parity)

The owner asked for RiftCompare's portfolio, set tracker and share link
("all the premium features"). Ported from RiftCompare's `portfolio/**`,
`getPortfolio`, `set-scope`, `set-gap`, `collection-csv` and `share` with One
Piece's own data; the names are "My binder" on the page and `portfolio` in the
code and URLs.

- **A card is one printing.** `CollectionCard.cardId` is `Card.id` (the
  TCGplayer productId), so owning the standard Shanks OP01-120 does not tick its
  Parallel or its Manga, and the quick-add and the CSV take a printing, never a
  guess. The foil toggle is hidden (`Card.finish` decides it). Free accounts hold
  50 cards (`FREE_PORTFOLIO_LIMIT`, the reversal recorded under "Wave-2 free
  limits"), Plus and Premium are unlimited; the cap of 999 copies per card and the
  2,000-row read cap are RiftCompare's.
- **The value is the visitor's market.** `Card.low<MKT>` × the condition
  multiplier × quantity, with 7-day and 30-day deltas. The chart walks back from
  today's local total with `marketUsd` ratios (falling back to `lowUsd`) from the
  new `history/recent/<bucket>.json` files (last 120 days per bucket, written by
  the import beside the full bucket files, read by `getRecentHistory` pinned to
  `Meta.historyRef`, falling back to `products/<bb>.json` before the first
  import writes one). `METHODOLOGY_BREAKS` is empty: OP Compare's index has had
  no re-basing. The chart says "daily since 2026-10-03, movement from TCGplayer
  market prices (US), shown in your currency" because that is exactly what it is.
- **Set checklist scopes are One Piece's.** "Base set" is the standard and reprint
  printings, Leaders included, DON!! excluded; "Every printing we track" adds
  Parallels, Manga, SP, Treasure Rares, special foils and DON!! cards. A promo
  printing in a booster group is in neither. Progress counts only cards with a
  store price, a pre-release set shows "N revealed" with no denominator, and the
  missing list reads `1 Shanks OP01-120 (Parallel)`. `getSetChecklist` reads one
  grouped Offer query (in stock, under 72 h old, real stores and TCGplayer,
  never eBay).
- **CSV keys.** A TCGplayer `Product ID` / `TCGplayer Id` column is exactly
  `Card.id`; otherwise a number plus a printing column; a bare number matches only
  when exactly one printing carries it, else the row is skipped with a reason
  (the matcher rule: an ambiguous listing is skipped, not guessed). The export
  (`opcompare-binder-YYYY-MM-DD.csv`) writes `printing` and `tcgplayer_id` and
  round-trips. 500 KB, a write budget and limit ordering as on RiftCompare.
- **Replacement cost is before postage until Best Basket lands.**
  `/api/portfolio/replacement` prices each held copy at its cheapest real-store
  or TCGplayer listing in the visitor's market and labels the total "before
  postage"; the store-by-store plan is Premium's, through the tools track's
  `planBasket` (the integrator swaps it in). Never eBay.
- **The share link has no image of its own.** `/c/<token>` is noindex/nofollow,
  valued in the viewer's market, with the token from `crypto` random, the
  projection selecting fields by name so cost basis and notes can never appear,
  and rotation as the only revocation (the old token 404s). It uses the root
  fallback share image (CLAUDE.md "Share images": a per-user image would be a
  loader and a render for every share, with the owner's collection in a public
  PNG).

## 2026-10-04 — Email: OP Compare's own Resend account, script-side, off until configured

Everything RiftCompare emails (alerts, release alerts, the welcome email, the
weekly newsletter) is ported, and **all of it is dark until the owner adds both
`RESEND_API_KEY` and `EMAIL_FROM` as GitHub Actions secrets**. It follows the
eBay keyset discipline (CLAUDE.md "The eBay API"):

- **Script-side only.** Sends run in `scripts/alerts.ts` (after each import),
  `scripts/email-hourly.ts` (`email.yml`, minute 23, its own concurrency group)
  and `scripts/newsletter.ts` (`email-weekly.yml`, Fridays 21:00 UTC). A request
  never sends: the newsletter and anonymous-watch routes write a row
  (`welcomeSentAt` / `confirmSentAt` null) and the hourly outbox sends, under
  the same caps. The provider hosts live only in `src/lib/email.ts`, the key
  names only there and in `email*.yml` / `import-prices.yml`; no `src/app` file
  imports the mail module or a module that sends; the newsletter's signup half
  is `lib/newsletter-signup.ts` so a route imports no sending code
  (`tests/no-email-api.test.ts`, modelled on `no-ebay-api`).
- **Off is a green no-op, refused is red.** `isEmailEnabled()` needs both
  secrets. Off, every runner records Meta `email` = `off` and exits 0 having
  claimed and stamped nothing (so the first run with email on still finds every
  pending row). A key that is set but refused by the provider (401/403) records
  `off` again and exits 1. The runners record Meta `email` first;
  `getEmailStatus()` is what every page reads, so **no sentence promises an
  email and no email field renders while it says off** (`EmailOnly` wraps the
  footer, `/movers` and article newsletter forms and the release-alert forms).
- **Alerts are delivered in-app while email is off.** The alert run still does
  its work: every trigger an account would have been emailed writes one
  Notification (the member track's `notify()`) and `lastFlaggedAt`, and the
  baselines advance exactly as after a send. `lastNotifiedAt` and
  `lowestEmailedCents` are NEVER written by a flag (they mean "an email was
  sent"); the weekly cap and the 20 h paid cooldown read the later of the two
  stamps so the in-app cadence matches the email one; the send budget, the
  per-run caps and `AlertMute` (a pause of email) do not apply to in-app
  delivery. An anonymous watch has nowhere in-app to go, so it is held, baseline
  kept, until email is on (and the anonymous form that creates one is itself
  hidden: it needs email on AND `NEXT_PUBLIC_ANON_ALERTS=1`, the owner's call).
- **Every alert email** carries a plain-text part plus `List-Unsubscribe` and
  `List-Unsubscribe-Post`. The one-tap links (stop, snooze, target) are signed
  with a key derived from a NEW shared secret, `EMAIL_LINK_SECRET` (label
  `alert-action:v1`, 32+ characters), failing closed when unset: never
  `AUTH_SECRET`, which does not go into Actions. A GET of an action link only
  redirects to a confirm card; only its POST acts, so mail scanners are harmless.
  The inbox's own Unsubscribe pauses (`AlertMute`, watchlist kept) and never
  deletes.
- **Resend's 100 a day is the binding constraint**, so the budget is RiftCompare's
  (`ALERT_DAILY_BUDGET` 50 distinct addresses per rolling 20 h, the free run at
  most 35, first-contact 20, first-price 25, paid cap 30, 30 confirmations a
  day) and the welcome email has no trial variant (OP Compare offers none; its
  copy names only what ships, from `free-limits.ts` and `plans.ts`).

## 2026-10-04 — The alert engine over Offer rows

RiftCompare's price-alert rules, unchanged in logic, over OP Compare's schema
(`scripts/alerts.ts`, modes `free` / `paid` / `baseline`, an `ImportRun` row of
kind `alerts`, red only for a refused key):

- **The alert price** (`lib/alert-price.ts`) is the cheapest in-stock Near Mint
  (or unstated-condition) copy at a real store (`source` starting `store:`) or
  TCGplayer's cheapest US listing (`tcgplayer`), updated within 36 h; states
  priced, sold out or unknown (a row 36–72 h old, or up to 14 days, still claims
  stock, so an outage is never read as a sell-out). **Never `ebay*`, never
  `Card.low<M>`** (which includes eBay). The below-market trigger reads
  `Card.marketUsd` converted with OP's fx table; the US guard is TCGplayer's own
  cheaper listing. Postage is not known for OP stores, so an alert says "item
  price, postage extra" and never "delivered".
- **Rules** (all RiftCompare's, constants quoted by `/alerts` and pinned by
  tests): free new low ≥5% and ≥50 minor units against the emailed watermark or
  the drop anchor, one email a week; first price and pre-order; restock after
  ≥20 h sold out across 2 runs; a paid target (re-fires only a further 10%
  down, re-arms above the target); below market ≥15%; a 40% outlier low held one
  run; snooze; pause.
- **Workflow.** `import-prices.yml` runs, after a successful import only
  (`!cancelled() && steps.import.outcome == 'success'`): free then paid after the
  07:07 import, paid only after 19:07, and on a manual dispatch the `alerts`
  input (`none` the default, `baseline` after a matcher change moves every
  baseline and sends nothing, `free` recovers a missed 07:07 run). Deck watches
  run in the paid mode through the tools track's `runDeckWatches` (loaded by
  name, skipped if absent), then the sealed watches and the release alerts, all
  under one shared send cap.
- **Sealed watches** are checked "twice a day" (the import cadence), restock
  after ≥5 h sold out at every real store, 6 h restock cooldown and 24 h for the
  rest, real stores only (never eBay, never the TCGplayer reference row), and no
  at-RRP alert until there is an MSRP table.

## 2026-10-04 — Release alerts and the weekly newsletter

- **Release alerts** are generalised over every set whose `releasedOn` is in the
  future or within 30 days (RiftCompare's was one hard-coded set). A signup is
  one field, no account: singles once a `store:%` in-stock Offer exists in its
  market (a card-page signup waits for that card's first store price), and a
  restock of a sold-out presale product while the set is unreleased. At most two
  emails per address per set and 40 a run; unsubscribe is POST-only. The forms
  render only while email is on (`ReleaseAlertSlot`) on `/release-dates`, set
  pages, presale sealed pages and unreleased card pages.
- **Newsletter.** One edition per ISO week (`editionKey`), stamped per subscriber
  only after a successful send, so a re-run resumes. Movers are OP Compare's own
  (TCGplayer market against 7 days ago, `Card.change7d`, US$1+ cards; "best
  value" is under the 90-day high), read once per run by one narrow uncached
  query (a script has no Next.js cache) and the same for every market, each
  market's edition adding its own cheapest listing; "new One Piece cards this
  week" is `Card.firstSeen` in the last 7 days. No Index, peaks or articles
  sections: each would need a cached loader the script cannot call, and every
  figure that is there comes from rows the site shows. The sponsor slot is
  built with an empty booking list (a labelled "sponsor this newsletter" line
  until the owner adds one).

## 2026-10-04 — Catalogue parity (wave 2): what was ported, and where OP differs on purpose

The card, sealed, price-guide, set, market, movers, guide, ad, support and
release-date surfaces were brought to RiftCompare's feature set, ported from its
files with the copy rebranded. The choices that are not obvious:

- **Rendering model kept.** OP's card, sealed and `/sealed` pages render per
  request (`getCountry()` over cached loaders), so every port is a server
  component that takes `country`; nothing moved to RiftCompare's market-neutral
  ISR. `CardMarketsTable` is therefore a server component, not a client one.
- **The card "About" narrative is written for One Piece, not translated**
  (`src/lib/content/card-narrative.ts`). It keeps RC's rule (a sentence is
  emitted only when the data on that render backs it) and branches on Leader /
  Character / Event / Stage / DON!!, printing against standard print, TCGplayer
  market against cheapest listing, cross-market spread, 7/30-day move, 90-day
  high and set percentile. It runs 250-450 words on a fully priced card, not RC's
  ~1,000: padding to reach the number would be the failure mode the module exists
  to avoid. Tests assert no claim without data and different skeletons.
- **Title ladder**: drops the set name first, then the set code, then the long
  variant ("Manga · Alternate Art" becomes "Manga"), then "Price". Never the card
  number or the printing word; when nothing fits the SHORTEST rung ships.
- **eBay listing panels cost zero extra Browse calls.** `BrowseItem` gained
  `image`, `writePair` writes `EbayListing` (first 8 survivors, headline pick
  first) and `EbayGradedListing` in its existing transaction after a completed
  search only, and the run sweeps both at 72 h. Graded slabs reuse the raw
  matcher minus the slab words (`screenGraded`), need a known grader, and are
  dropped below half the raw reference; they never become an Offer and never join
  a comparison. `ebay-plan` and `no-ebay-api` are unchanged. CLAUDE.md's eBay
  section now says the panels are display-only.
- **Store postage.** `StoreInfo` gained `shippingCents`, `freeOverCents` and
  `policyUrl`. Only `policyUrl` is filled: 192 of 235 stores returned HTTP 200 on
  `<base>/policies/shipping-policy` on 2026-10-04 (`STORE_POSTAGE_CHECKED`). No
  flat rate or threshold is seeded, because none could be verified from a policy
  page without reading prose, so rows still say "postage at checkout" with a
  "shipping policy" link.
- **History files carry every market (v2).** A bucket point is
  `[day, market, lowUS, lowAU, lowUK, lowSG, lowCA, lowEU]`, each low in its own
  currency; day files are v2 too. The reader pads v1 points (US only), so an old
  checkout still reads, and `chartSeries` returns `lows`. The card and sealed
  charts show the visitor's market line plus TCGplayer's market price converted
  at the indicative rate, titled "Price history (AUD · lowest price)", and say
  when a market's history starts. Non-US history begins at the first v2 import:
  nothing is back-filled.
- **/sealed filters are the URL.** `q`, `min`, `max`, `stock`, `promo`, repeated
  `kind` and csv `set` (OP's param names), applied by `lib/sealed-query.ts`; the
  page is `noindex,follow` when filtered. "In stock at MSRP" is not built: OP has
  no verified MSRP table and none was invented (`lib/msrp.ts` does not exist).
  "Sold out at every store we track" is one SQL read (`getSealedSoldOut`): every
  non-eBay row in the market fresh inside 72 h and none in stock.
- **/price-guide reuses /browse's filters** (`parseBrowse`/`runBrowse`,
  `BrowseFilters`, `FilterChips`) so the same filters give the same cards on both
  pages; the guide adds its own sort list (including 30-day and most stores),
  page sizes 50/100/200, a `?market=` override ("Prices for X from this link ·
  Use my market") and a 30-day column only when at least half the priced rows
  have one. The plain guide and a single set are indexable; everything else is
  `noindex,follow`.
- **/market**: `computeStats` ported pure over OP's chained index; the table
  ships the top 200 cards, breadth counts the whole US$1+ basket. The label is
  "US$ · TCGplayer market". No Dataset JSON-LD: there is no public index JSON.
- **Guides.** `Post` gained `category` and `faq`; the rarities and where-to-buy
  posts are guides at `/guides/[slug]` with a permanent redirect from `/blog/...`
  (done in the page, not `next.config.js`, which the tools track owns). Guides
  and blog share `ArticleView`.
- **Ads.** `AdSlot` shows a first-party house promo by default and a real AdSense
  unit only when `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is a valid id; unlike RC it never
  throws in production. The loader and `/ads.txt` exist only with the id.
  `TcgplayerAd` renders only for owner-supplied creative ids in
  `NEXT_PUBLIC_TCGPLAYER_CREATIVES` and draws OP's own creative, not Impact's
  hosted image, which is seasonal art.
- **Support tickets**: `/api/support` goes through the public form gate (3 an
  hour per IP, 5 a day per account), numbers come from `Counter` inside the
  insert's transaction, shown as `OC-<n>`; no email is sent. The admin editor
  posts with POST (CLAUDE.md: admin mutations are POST); PATCH is the same handler.
- **Release calendar**: all-day events (the date is a listing date, not an
  announced hour), RFC 5545 escaping and octet-aware folding, tested.

Not done here, by design: SetOwned ticks and ReleaseAlertSignup
(collection-alerts), MostSearchedStrip and NewsletterSignup on `/movers` (tools,
collection-alerts), PriceWatchButton and SealedWatchButton (member). The call
sites use the wave-1 `WatchButton` until those merge.

## 2026-10-04: Wave-2 integration, and what the merge had to decide

The five wave-2 tracks were merged in plan order (design, member, tools,
collection-alerts, catalogue). Where two tracks edited the same file the rule
was: the design track's chrome and component APIs win (`Breadcrumbs trail`,
`Pagination totalPages/params/basePath`, `AuthForm`, the static layout), and each
other track's behaviour is mounted into it. Decisions the merge made:

- **One sign-in form.** `AuthButtons` is gone; `/login`, `/premium/start`, the
  Plus/Premium dialog and the price-alert modal all render `AuthForm`. It now
  stamps the sign-up surface (`src=`, whitelisted by `parseSignupSource`) on the
  OAuth link, so the member track's attribution survives the design track's form.
- **Best Basket owns the binder and Finish-a-set sources.** `BASKET_COLLECTION_SOURCES`
  is on. `source=set` is named by the set's SLUG (what the set tracker links with),
  priced from the tracker's own readers (`getSetChecklist`, `ownedBySet`) and ranked
  by the cheapest copy at the member's floor among stores whose postage we can price,
  read from the cached `getBasketListings` (no new query).
- **Replacement cost is delivered.** `/api/portfolio/replacement` now runs
  `optimizeBasket` over the same listing reader as `/api/basket`, so postage is
  counted once per store; the interim item-only split (`portfolio-replacement.ts`)
  is deleted.
- **One entitlement writer file.** The referral reward (off by default) writes
  through `grantReferralDays` in `admin-billing.ts`, extend-only; `referral.ts`
  no longer touches `premiumUntil`.
- **Shipping snapshot.** The 151 stores added after the 3 Oct snapshot are listed
  as `unmeasured` (priced as estimates, marked "est.") until the shipping-rates
  workflow measures them; the size guard moved from 120 KB to 200 KB.
- **History v2.** Readers written before the catalogue track's per-market points
  (`recentMoves`, `recentOf`, the portfolio and rise predictors) accept the wider
  point shape; `recentOf` keeps the file's own version.

## 2026-10-04: QA fixes after the wave-2 review

What the review found, and what was decided (items not listed were fixed as written).

- **Page titles are RiftCompare's.** Every `<h1>` that exists on both sites now
  carries RC's className verbatim (`text-2xl font-extrabold`, weight 800, with
  RC's `sm:` step where it has one). OP's `text-3xl sm:text-4xl` without
  `font-extrabold` fell through to the global h1 weight of 900. The card and
  sealed headers also use RC's row (title `flex-[1_1_12rem]`, Watch and Share in
  one `shrink-0` group, icon squares below `sm`), and `ShareButton` is RC's file.
- **No "Add to collection" bar on the card page.** RC has none there (adding is a
  QuickView and portfolio action), so the bar is gone from `/card/[slug]`; it stays
  in QuickView. The signed-out QuickView add no longer fires a request that can
  only answer 401. A holding's "Foil" mark is gone too: with no foil toggle,
  `isFoil` is the card's own TCGplayer finish, and 969 standard cards are Foil-only
  there, so the mark was on most of a binder and said nothing.
- **/price-guide follows RC's order:** stats, Prices by set, filters and table,
  Read next, "How to read this price guide", FAQ, then OP's ad and sign-up
  prompt. The set table is long (every released booster set); RC's is shorter, and
  we kept the full list because it is the page's set index.
- **Signed-out member pages are a real 307.** `/watching`, `/portfolio`,
  `/portfolio/sets` and `/portfolio/sets/:set` have a `loading.tsx`, so their own
  `redirect()` ran after the shell was flushed, and swapping it threw React error
  #310 in production (inside Next's own app router, `useMemo` after
  `useUnwrapState`; it needs the redirect to land while the stream is open, so
  dev never shows it). Two layers now: `next.config.js` redirects a visit with no
  `oc_session` cookie (307, exact path in `next`), and a `layout.tsx` for each of
  `watching` and `portfolio` (outside the segment's Suspense boundary) redirects an
  expired or invalid cookie. Reproduced with a junk cookie on a production build:
  7 of 12 loads threw before the layouts, 0 of 12 after. The portfolio layout
  cannot see the sub-path, so a stale-cookie visit to a set page returns to
  `/portfolio` after sign-in. The pages keep their own checks.
- **Box EV gives no verdict it cannot back.** Under half of the paying pools'
  cards priced (a set that has just come out) reads "too few cards priced", never
  "price is well above EV"; a positive ratio where chase pools carry 90% or more
  of the EV (one US$4,800 Parallel in a 1-in-12 pool) says a typical box lands well
  below it, and is not green. The community pull-rate defaults are unchanged and
  still the owner's call (`lib/pack-composition.ts`).
- **Sealed.** The search box applies after a 350 ms pause (RC has no text search
  there; the checkboxes were already instant). A signed-in free account gets RC's
  Plus lock on a sealed product instead of a browser heart that says "Watching"
  while the alert run never sees it; signed-out visitors keep the browser heart.
- **eBay is named only while it is live.** The home title, description and share
  copy say "+ eBay" only when `getSiteStats().ebayLive`; the tier table's first row
  reads "Compare prices across every store". The card page's "Also available on
  eBay" panel stays (it is a working affiliate search link, and says so).
- **No email promise while email is off.** The unsubscribe and manage pages say
  "reply to one" only when `getEmailStatus()` is `on`.
- **Referral reward removed, not switched off.** `REFERRAL_PREMIUM_DAYS` made a
  public OAuth sign-up an entitlement write (the code was a public `User.id`, with
  no per-referrer or per-day cap). `grantReferralDays`, the env switch and the
  profile card are deleted; attribution (the cookie and a log line) stays.
  Bringing a reward back needs the owner's approval, a CLAUDE.md amendment naming
  the writer, caps, and an account-age check.
- **Basket listings are cached per market and 32-id bucket,** not per pasted
  list. The key space is the catalogue's id range divided by 32 whatever anyone
  pastes; a bucket holds at most 32 cards x about 75 sources. The wrapper
  `getBasketListings(country, ids)` is not cached and filters the buckets.
- **CLAUDE.md names `/tools/best-basket` and `/alerts/action`** among the pages
  that may call per-user libraries (a member's own deck watch and remembered
  minimum condition; a signed action token), and `tests/app-no-db-import.test.ts`
  pins the set.
- **Hardening.** `sameOrigin` on the session mutation routes that lacked it (deck
  watches, decks, basket, checkout, alerts subscribe); per-user limits on
  `/api/me`, collection edits, notification read and plan upgrade, and a per-IP
  limit on the unsubscribe GET (all per instance, soft, like the rest); CSV
  export prefixes a text cell that starts with `= + - @` with an apostrophe
  (the importer reads no text column, so nothing strips it).
- **Not changed.** The tier lineup in `plans.ts` is the owner-confirmed copy of
  RC's eighteen rows (prices are untouched); the Stripe product text follows it on
  the next `stripe-setup` run. The shipping-rates workflow only uploads an
  artifact, and its header now says so.

## 2026-10-04 — Launch offer: the first 50 accounts get 30 days of Premium free

**Decision.** A popup invites signed-out visitors to create a free account, with
a live counter ("13 of 50 free months left"). The first 50 NEW accounts get 30
days of Premium, no card. When the counter reaches 50 the popup disappears.

**How.**
- *The grant* is `claimLaunchPromo()` (`src/lib/launch-promo.ts`), called once
  from `upsertOAuthUser` for a row that was just created. One transaction: an
  `INSERT … ON CONFLICT DO UPDATE … WHERE value < 50 RETURNING` on the `Counter`
  row `launch-promo`, then the `premiumUntil` write. Concurrency is safe by
  construction (60 simultaneous claims against the local DB granted exactly
  50), a failed grant gives its slot back, and a failed promo never fails a
  sign-in. It stacks like an admin grant (max(now, current) + 30 days), takes the
  tier "premium" only for a lapsed or free account, and never touches Stripe.
- *The popup* (`LaunchPromoPopup`, mounted once in the root layout, client-only,
  no session read) uses the nudge machinery: signed-out visitors only, from the
  2nd page view, 8 s after it became eligible, never over another dialog or
  while typing, once per visit, 3 days' rest after a dismissal and gone after
  three, never on /login, /premium or account pages. It reads the counter from
  `/api/promo` (`getLaunchPromo()` in `data.ts`, 30 s cache, fails closed to "none
  left") only once it could actually show.
- *The welcome* toast says the 30 days have started (`?promo=1` from the OAuth
  callback, stripped like `?welcome=`).

**Entitlement rule amended.** CLAUDE.md's list of Premium writers gains this
one claim (owner's request). It is not a trial policy change: subscriptions,
prices and the Stripe flow are untouched, and Premium shows "Opening soon" for
purchases until Stripe is set up regardless.

**Known limits.** One person with several Google accounts could take more than
one slot; the cap (50 × 30 days) is the whole exposure. Accounts that existed
before this shipped do not qualify. To end the offer early, set `LAUNCH_PROMO_ENABLED = false` in
`src/lib/launch-promo-shared.ts`: grants stop and the popup disappears together.

**Also fixed.** `anyDialogOpen()` treated the always-mounted, aria-hidden phone
menu (`[aria-modal="true"]`) as an open dialog, which silenced every corner nudge,
the Premium slide-in included, since the wave-2 design merge. It now ignores
aria-modal elements inside `aria-hidden` or `inert`.

## 2026-10-05 — Outbound click tracking removed

**Decision.** The site no longer records outbound shop clicks. Removed:
`OutboundBeacon` (the one global click listener in the root layout), `/api/click`,
`src/lib/click-event.ts`, `/admin/clicks` (page, nav link and dashboard tile),
the "Outbound clicks by store" panel on `/admin/demand`, and the ClickEvent
retention step in the twice-daily import.

**Why.** Every outbound click was one database write through a serverless route,
and with the traffic the site now gets that cost Neon network credits. The owner
asked for it gone from the website and the admin.

**What stays.**
- GA's `buy_click` (client-side, sent to Google, not to our database) is the one
  count of outbound clicks, with the same `data-retailer` / `data-card` /
  `data-surface` attributes on the links.
- The Plus/Premium interest beacon (`/api/premium/click`, `PremiumClick`,
  `/admin/premium`) is a different, low-volume signal and is untouched.
- The `ClickEvent` model stays in the schema as a retired table (nothing reads
  or writes it), so the schema push never has to drop a table; its old rows are
  still in the database until someone drops it by hand.
- `tests/no-outbound-click-tracking.test.ts` fails if any code touches the table
  or the route comes back.

## 2026-10-05 — A bare "Name [Set]" title yields to the SKU number

**Report.** A wrong-item price report (Rhystic Nostalgia Gaming, AU): looking at
OP16-015, the store link went to OP16-052, "a few other stores have the same
issue". Cause: the store lists FIVE different cards under one title,
"Monkey.D.Luffy [The Time of Battle]" (handles `-the-time-of-battle`, `-1`
… `-4`; SKUs OP16-015, -052, -095, -022, -034). The name path knew exactly one
catalogue key for that title (OP16-015's plain TCGplayer name), took every
product, and the cheapest (the OP16-052 copy at A$0.50) won the offer.

**Rule.** `matchStoreProduct` ranks the SKU number above the name path: a name
match is refused when the product's SKUs agree on a different card number, and
the SKU path then picks the right card (or misses). In the import, products
whose bare title is shared by several of one store's name-path matches (no SKU
number to tell them apart) are all skipped as `name-duplicate-title`.
Understated, never wrong. A real-title test is in `tests/match.test.ts`.

## 2026-10-05 — Language tags, a universal SKU check, and Vercel buy-click events

**Report.** The Card Spot (AU) priced a Japanese OP16-118 as the English card.
The title ("OP16-118 Portgas D.Ace - One Piece TCG") carries no language; the
Shopify `tags` ("Japanese") and body do.

**Rules (all price paths, now and for future imports).**
- `foreignByTags` (tags / product_type: Japanese, Chinese, Korean, Thai,
  French, German, Italian, Spanish, Portuguese) is a miss `foreign`; the import
  passes each product's `tags` and `product_type` to `matchStoreProduct`.
- Whatever path matched, a product whose SKUs agree on a card number different
  from the matched card's number is a miss `sku-number-mismatch`.
- The shared-title guard counts ALL of a store's products by trimmed lowercase
  title, not only name-path matches; a name match with no SKU number whose
  title is shared is a miss `name-duplicate-title`.

**Buy-click events.** Outbound clicks are measured with Vercel Web Analytics
custom events: `track("buy_click", {retailer, network, page, surface, card})`
from a capture-phase listener on `a[data-retailer]` inside the consent-gated
analytics mount (`src/lib/buy-click.ts`). Nothing reaches our server or the
database, so no Neon transfer. Custom events need a Vercel Pro plan; see
Analytics → Events. The GA `buy_click` event is unchanged.

## 2026-10-05 — The eBay chase strip, site-wide

The homepage and the main hubs (price guide, movers, market, sets, sealed,
articles) carry `EbayChaseStrip`: the twelve dearest chase printings, six shown.
A tile is the live eBay listing in the visitor's market when the script-side
eBay pass has a fresh one, otherwise the card's art linking to an affiliate eBay
SEARCH for it, so the strip works before the eBay keys exist. The market is
picked client-side (`useCountry`), so the host pages stay static. One cached
loader (`getChaseStrip`), no eBay call from a page, labelled "Ad", disclosure
beneath, `data-ad-placement` so ad-free members never see it. Pinned by
`tests/ebay-chase-strip.test.ts`. The footer eBay box and the card-page banner
are unchanged.

## 2026-10-07 — Rising Cards and Best Basket become Premium tools

**Owner's call.** Demand Finder, Rising Cards and Best Basket are Premium
features.

- **Demand Finder** was already Premium (the top 10 most searched this week
  stay free, here and on /movers). Unchanged.
- **Rising Cards**: the full ranking now needs Premium (`isPremium(user,
  "premium")`); Plus drops to the same top-3 preview a free account sees.
  The gate's plan button asks for Premium.
- **Best Basket**: Premium only. `/api/basket` answers 403 `{ premium:
  "required" }` to anyone else before any rate limit or read; the free and Plus
  delivered-total preview (five a day) is gone, as are its rate limits. The
  page renders the tool only for Premium and shows a Premium wall otherwise;
  the deck pricer stays free.
- `TIER_COMPARISON`, `PLAN_FEATURES`, the dashboard tool list, the /tools hub
  and the deck pages' signup prompts say the same. The admin demand and rising
  pages and the daily demand snapshot files (data branch, `history/demand/`)
  were already in place.

## 2026-10-07 — eBay: 500 calls a day, one run, the dearest cards first

**Owner's call.** OP Compare's eBay keys arrive with a hard budget: at most
500 Browse calls a day, one run a day, spent where affiliate revenue is
largest; cheap cards are never searched.

- `DAILY_CALL_CAP = 500` in `lib/ebay-plan.ts`. `budgetFor` caps every run at
  500 minus our own spend in the last 24h (from the ImportRun history), so a
  scheduled run plus any dispatches can never pass 500, and no
  `EBAY_MAX_CALLS` value can raise it. `DEFAULT_MAX_CALLS` 500, one cron
  (05:37 UTC), `RUNS_PER_DAY` 1.
- Shares: US 60%, UK 20%, AU 15%, EU 5% (CA singles stay derived from the US
  search for 0 calls; SG none). A market's unused share spills to the others.
- Floors: singles US$40+ (US$75 in the EU), sealed US$60+. Tiers: US$150+
  every 48h (S1, first in line), the rest every 72h. Rows still live 72h; S1 can
  miss a whole daily run and stay fresh. The catalogue wants more than 500 a
  day, so the plan is budget-bound by design: S1 before S2, then most overdue,
  then dearest. `PICKS_MAX_AGE_HOURS` is 72h to match.
- On the site: the eBay chase-card banner (real listings, eBay's own photos,
  card art and a search link where there is none yet) sits directly under the
  homepage hero; every card page opens with a big filled eBay button (the
  cheapest fresh listing "from <price>" in the visitor's market, else a search
  for the card), above the art on phones and in the header card on desktop.

## 2026-10-07 (later) — eBay: 2,500 a day after a second approved account

**Owner's call.** A second approved eBay account lifts the allowance to 2,500
Browse calls a day, replacing the 500-a-day plan above. Spend it where clicks
are: the chase cards first, the floor lowered.

- `DAILY_CALL_CAP` 2,500; `EBAY_MAX_CALLS` 2,000 a run; `EBAY_QUOTA_RESERVE` 300
  (a run at the cap leaves 200 of headroom for a dispatch); the assumed eBay
  limit when the live count can't be read is 2,500. Still one run a day
  (05:37 UTC) and the ceiling still counts our own last-24h spend, so a
  dispatch plus the schedule cannot pass 2,500.
- Floors: singles US$20+ (US$40 in the EU), sealed US$30+. Tiers: US$100+ every
  48h (S1: all the chase printings, first in line), the rest every 72h.
- Shares: US 50%, UK 18%, AU 17%, EU 11%, CA 4% (sealed only). Modelled demand
  is about 2,200–2,400 calls a day for the whole catalogue, just above one
  2,000-call run, so the plan stays budget-bound at the edge: the dearest cards
  first, then most overdue, and the cheapest eligible waits a day.
- The first day's spend is split: 50 (smoke test) + ~450 (first full run) on
  2026-10-07, then a 400-call top-up the same evening; the 05:37 run on the 8th
  takes whatever the rolling 24h leaves.

## 2026-10-07 (later still) — the eBay keyset is shared; its 5,000 a day are split

The production keyset's 5,000 Browse calls a day are shared with another site;
OP Compare's half is `DAILY_CALL_CAP` (2,500). eBay's live count therefore
reports 5,000 and the other site's use, which is expected.

- The foreign-spend guard (a pasted RiftCompare keyset would silently spend its
  quota) now allows `dailyLimit − DAILY_CALL_CAP` of other use before it warns:
  used > ourSpend24h + 300 slack + 2,500. Without that allowance every run would
  have been cut to 50 calls once the other site spent its share. Use beyond it
  still trips the warning and the 50-call cap.
- The run budget still takes `liveRemaining − reserve` into account, so when the
  other site has taken more than its half, our run shrinks to what is really left
  rather than starving it.

## 2026-10-08 — A last-good price snapshot on GitHub, so the site survives the database

**Owner's call.** If Postgres does not answer (an outage, a spent Neon transfer
allowance), the public price pages keep serving the last import instead of
failing; old prices fade rather than linger.

- **What.** `scripts/price-snapshot.ts` (run by `import-prices.yml` after every
  import, never failing it) writes the answers the public loaders give, as
  gzipped JSON, to `.snapshot-out`: catalogue facts and prices, card facts,
  sealed, offers sharded by `productId % 64`, the eBay listings panel, the chase
  strip and the site stats (~15 MB, 64 offer shards of ~200 KB). The workflow
  force-pushes it as ONE orphan commit to the `snapshot` branch, so the branch
  is always exactly the newest snapshot and never grows. An offer not refreshed
  in 72 hours is not written. An empty-looking snapshot (<1,000 cards or
  offers) is not published, so a broken import cannot replace the last good one.
- **Reading.** `dbOrSnapshot()` in `lib/data.ts` wraps the eight public loaders:
  database first; on a thrown error or no answer in 6 s, the matching file from
  `raw.githubusercontent.com/.../snapshot/` (10-minute cache), and the database
  is skipped for the next minute so requests do not each wait out the timeout.
  "Not found" is an answer, not a failure. The reader re-applies the 72-hour
  rule (stale store rows show as sold out, stale eBay rows drop), so a snapshot
  that outlives a long outage fades. The history ref no longer blanks the
  charts when the database fails (they read the `data` branch).
- **Not covered.** Anything per user (accounts, watches, alerts, collections,
  the inbox, billing) is private and not in it, and the loaders built from SQL
  aggregations of the whole offer table (Deal Finder, Best Basket, store pages,
  Rising/Demand, Today's top deals, the per-set eBay picks) have no fallback;
  they show their own "unavailable" state while the database is down. The
  IMPORT itself still needs the database to write; the snapshot is the last good
  import, not an import path.
- **Safe by design.** Public price data only (a test fails on any private
  table), `snapshot` is excluded from Vercel builds in `vercel.json`, and
  nothing under `src/app` imports the writer. Verified by pointing a dev site
  at a dead database: the homepage, card page, price guide and sealed page all
  rendered real prices from the snapshot.

## 2026-10-08 — A new Neon database (OP2), weekly deploys, prices read from GitHub

**Owner's call.** OP Compare should run passively and last the whole month on
the free 5 GB of Neon transfer, without switching databases mid-month. Three
changes, one goal: Neon is for accounts and state, not for serving prices.

- **New database.** The connection string is the variable `OP2` (Vercel and
  GitHub, a secret or a repository variable); `DATABASE_URL` stays the fallback,
  so deleting `OP2` undoes the switch (`src/lib/db-url.ts`). `migrate-database.yml`
  created the schema in the new project and `scripts/migrate-db.ts` copied the
  state: accounts and entitlement, watches and alerts, collections, notifications,
  the inbox, the launch-promo counter, Meta, the eBay check history and import-run
  log, and the catalogue the user tables point at. It only READS the old database,
  is idempotent, pages by the whole primary key, and fails if the target ends with
  fewer rows or a table is not in its list. Offer (650,000 rows) and the retired
  ClickEvent are not copied: the next import rebuilds prices. The old database is
  left untouched.
- **Prices from GitHub.** Public price pages read the `snapshot` branch first
  (`snapshotFirst`), Postgres only when it is missing, older than 48 hours or has
  no answer. Card pages, the catalogue, sealed, stats, the eBay panel and the
  chase strip no longer cost Neon anything. The loaders that still read Postgres
  (deals, store pages, baskets, demand, set checklists) refresh every 12 hours
  instead of 6. `PRICES_FROM_DB=1` is the escape hatch.
- **The snapshot costs no transfer to build.** Reading the Offer table back out
  of Neon for every snapshot would have been over 100 MB twice a day. The import
  now writes its offers to a local file (`lib/run-offers.ts`); the snapshot is
  built from that, with a store that failed carried over from the previous
  snapshot on GitHub (72 hours, as the database does) and eBay's few thousand rows
  read from Postgres.
- **Weekly deploys.** `production-deploy.yml` now runs Mondays at 08:00 UTC
  (it was daily). Every build clears the page caches and re-renders from the
  data; with prices on GitHub only code changes need one. "Run workflow" still
  deploys now when the owner says so.
- **Accounts stay in Neon.** Keeping them on GitHub was considered and rejected:
  the repository is public, the data is private, and sessions and writes need a
  database. Accounts are tiny (7 users today); they cost almost no transfer.

## OP18 pre-order page (2026-10-08)

Owner asked for a page like RiftCompare's `/radiance-preorders`, for One Piece's
next release, with eBay and TCGplayer prices.

- **One route per release, self-retiring.** `/op18-preorders` (`SET_CODE` at the
  top; copy the route for the next set). Once the set's products are out or
  past their date it says so and points to the live prices; `/sealed` links to it
  only while OP18 is unreleased. It reads only `lib/data.ts` loaders, `revalidate`
  3600, no `generateStaticParams`: snapshot-first, so it costs Neon nothing.
- **Same ranking as every board.** Stores' pre-order prices, TCGplayer's cheapest
  listing and eBay's rows are ranked by ITEM price (`productBoard` in
  `lib/preorders.ts` reuses `marketRows`/`compareBoardRows`). When the eBay pass
  has no priced offer for a product, the headline listing of the eBay panel in
  that market stands in as one real listing; nothing is estimated. A market with
  no tracked pre-order says so and still offers the TCGplayer and eBay searches.
- **Structured data says PreOrder,** never InStock, because nothing has shipped.
  No price forecasts in the copy: the page explains how to compare, not where
  prices will go.
- **EB05 first (owner, same day).** EB05 (Extra Booster: One Piece Heroines Edition
  Vol. 2) releases 30 October, three weeks before OP18 (20 November), so it is the
  nearer release and gets its own page, `/eb05-preorders`. The page body moved to
  `components/PreorderPage.tsx` (a `PreorderConfig` per release); each route is a
  config and `export const revalidate = 3600`. `PREORDER_PAGES` in `lib/preorders.ts`
  maps a set code to its route: `/sealed` shows one banner per unreleased set,
  soonest first, and the "Also coming soon" headings link to the other page.
  The next release is a new route plus one map entry.
- **Not changed:** eBay budget, deploy cadence. The page rides Monday's release
  unless the owner asks for a deploy now.

## Why EB05 had no eBay prices (2026-10-09)

Owner: "why are there still no eBay prices?" The OP18 page had them (US, AU, UK
rows were live); EB05 had none, and not because of the budget or the plan.

- **Two matcher gaps in `matchSealedTitle`.** TCGplayer's code is `EB05`; a title
  says `EB-05`, and `setCodesIn` returns `EB-05`, so the code never matched
  (`EB03`/`EB05` sets could not be reached by their code at all). And a title with
  no code fell back to the set NAME, where "Extra Booster: One Piece Heroines
  Edition" (EB03) is a substring of the Vol. 2 name, so a Vol. 2 box was matched to
  the first Heroines box and rejected as "other-product". Every EB05 listing was
  therefore dropped. Fixed: codes compare without the hyphen; names compare with
  "Vol. 2" / "Vol.2" / "Vol 2" squashed and punctuation spaced; when several set
  names are in a title only the LONGEST is meant. Nothing was loosened: a title
  naming neither the code nor the full set name is still skipped. Real titles are
  in `tests/match.test.ts`. The same fix lets store listings that say "EB-05"
  match their product at the next import.
- **`EBAY_ONLY_NAME` / workflow input `only_name`.** An EbayCheck row is written
  after every completed search, so EB05's pairs were "checked" with no result and
  would not be due for 72 hours. Narrowing a forced run to products whose name
  contains some text re-searches just those (a few calls), not the catalogue.
- **Buttons.** TCGplayer rows and buttons on the pre-order pages are violet
  (`.btn-tcg`), eBay's stay eBay blue, stores keep the shared red. Colour only;
  rows stay ranked by item price.

## Spend the whole eBay allowance (2026-10-09)

Owner: "we need to use up all the API creds for cards and the most important
sealed products." Yesterday's scheduled run began with 5,000 of 5,000 left on the
shared key, but its budget was 1,600: a per-run cap of 2,000 and 400 calls already
spent inside the rolling 24 hours. It searched ~1,300 pairs and left 1,976 due
(595 UK and 595 AU pairs had never been searched), so cards and sealed outside the
top of the plan had no eBay price. Only 526 cards and 87 sealed products had one.

- **`DEFAULT_MAX_CALLS` is now 2,500, equal to `DAILY_CALL_CAP`.** One run can use
  the whole day. The hard ceiling (2,500 in any 24h, counting every earlier run and
  dispatch) and the live-remaining check are unchanged, so the other site's share
  of the key is still never touched. On a key whose limit is 2,500 the reserve
  still clamps a run to 2,200 (`clampLimits`).
- **Order is unchanged and already puts the important pairs first:** singles of
  US$100+ every 48h, then singles from the floor and sealed of US$30+ (boxes,
  cases, decks, double packs) by value, never-searched ahead of overdue. At about
  3,300 eligible pairs and a 72h cycle the steady state is ~1,100 calls a day, so
  one or two full days clear the backlog and the rest of the allowance goes on
  refreshing the dearest pairs sooner.
- Still true: eBay keeps running only from GitHub Actions; no page calls it.

## eBay: as many cards as the quota allows, all 2,500 every day (2026-10-09)

Owner: eBay prices for all the cards; "not even the top 2000, just as many as the
quota allows, so every day we have exactly 2500 used". Before this the pass only
searched pairs that were DUE (singles of US$20+, every 48h or 72h), so once the
backlog cleared it would have left ~1,400 of the 2,500 calls unspent, and only
~1,093 cards were eligible at all.

- **Per-market depth from the budget (`marketFloors`).** No fixed floor and no top-N:
  each market covers the dearest cards its share of the day keeps inside 72h (an
  eBay row older than 72h is not shown, so a pair rotating slower flickers).
  The US takes every card from US$3 (2,424 today, the absolute minimum); its unused
  share flows to the others pro rata: UK ~1,250 cards (US$15+), AU ~1,160 (US$18+),
  EU ~630 (US$51+, and never under its US$40 floor). Re-derived every run from
  the live prices, so depth grows as the budget or the catalogue does.
  `EBAY_TOP_CARDS` can still cap it; `EBAY_MIN_VALUE_CENTS` still fixes one floor.
- **Top-up (`fillPairs`).** After the due pairs and the overflow, the rest of the
  budget goes to eligible pairs that are NOT due, dearest tier first, oldest first,
  until eBay's own budget gate says stop. The run therefore always spends the day;
  the dear cards just refresh sooner than their interval. Not for a forced or
  name-narrowed run.
- **The day is eBay's quota day, 07:00 to 07:00 UTC (`quotaDayStart`)**, not a rolling
  24h. A rolling window made a run that started earlier than yesterday's (the cron
  is not punctual: the 05:37 run started at 12:12 on 2026-10-08) see yesterday's
  whole spend and underspend. The ceiling is still 2,500 a day including any
  dispatch, and the live-remaining check still protects the other site's share.
- **The run moved from 05:37 to 12:37 UTC**: mid-day, 5h clear of the reset and of
  both import windows, so a delayed cron stays in its day; the 19:07 import
  publishes the rows. The workflow timeout is 90 minutes (2,500 calls ≈ 45).
- **`RETRY_RATE` is 0.05** (measured 0-1% in every market on 2026-10-08/09; the
  25% was RiftCompare's), so the model no longer overstates a singles search.

## The site watches itself (2026-10-14)

Owner: "I'm not going to look at Neon every day or the inbox; the admin dashboard
should keep track of the limits, make sure eBay and everything is healthy, show how
many new inbox items there are, and email me when one comes in (bill.jyang101@gmail.com).
I'm moving to other projects: less maintenance, for every aspect of the site."

- **A watchdog, not a page.** Limits like Neon's transfer cannot be read from a
  request without spending the thing being protected, and a page only helps when
  someone opens it. So a script-side job (`watchdog.yml`, every four hours: six
  wakes a day, about 36 compute hours a month of Neon's allowance at worst, and
  most land inside wakes the imports already cause) collects everything, stores ONE
  report in Meta, and alerts. /admin/health and the admin home only read it.
- **Alerts are state changes, not noise.** `planAlerts`: told when a problem appears
  or worsens, reminded daily while a failure persists (every 72h for a warning),
  told when it clears; `unknown` never alerts or clears; the first run records the
  state silently. The alert state is saved only after the owner was actually told,
  so a failed send is retried. One cause, one alert: an overdue eBay pass is one
  message, not three.
- **Pace, not just level, for limits.** `evalQuota` warns when the month is on course
  to pass 90% of the allowance even if little is used (the failure that took the old
  database down was 5 GB gone by day 9), after the first 15% of the period so one
  busy import is not a trend. Neon's counters come from its API (`NEON_API_KEY`,
  `NEON_PROJECT_ID`, both optional); without them the checks say "not connected",
  never ok, and the database size is still read from Postgres.
- **Two channels, so a missing mail key never means silence.** Email when the mail
  secrets exist; otherwise ONE GitHub issue that @-mentions the owner, edited
  quietly and commented on only when something changes (an edit does not notify).
  The repository is public, so the issue is built from check labels, our own
  sentences and counts; the inbox's text never reaches `health.ts`/`health-issue.ts`.
  The run goes red only if a problem could not be told to anyone (GitHub's own email
  is the last resort).
- **Inbox emails ride the hourly outbox.** No new wake: `email-hourly.ts` already
  connects hourly. One email per run lists everything new since a cursor (Meta
  `inbox-notified-at`); the cursor moves only after the provider accepts it, the
  first run only sets it (no backlog flood), a queue over 25 is cut at the point it
  was read to so nothing is lost or sent twice. Visitor text goes only to the owner's
  mailbox, never to an issue or a log.
- **Every scheduled job is watched** (`JOBS`): a failed run, or silence beyond its
  cadence (GitHub pauses schedules after 60 quiet days), and the live site is probed
  (home, price guide, sealed, sitemap) for a 200 carrying the site's own text.
- **Not done, on purpose:** Vercel's own usage (needs a token with account scope) and
  Stripe webhook health (no record of the last webhook is kept). Both are the next
  checks to add; the watchdog's structure makes each a function and a test.

## 2026-10-14: The public data left Neon; the `snapshot` branch is its only copy

**Why.** RiftCompare and the MTG site already keep their public data in GitHub; OP
Compare still held ~360 MB of catalogue, offers and eBay state in Neon and paid
transfer on every page-cache miss. The owner asked for everything public to move.

**Decisions.**
- **GitHub is the store, a throwaway Postgres is the workbench.** The import and the
  eBay pass keep their SQL (upserts, aggregates, sweeps) unchanged but run it on a
  Postgres service container seeded from the snapshot at the start of each job and
  discarded at the end. This keeps the tested import logic and avoids a rewrite into
  in-memory code. A second Prisma schema (`prisma/public`) and `pub` client; `pubdb`
  refuses Neon URLs.
- **Readers.** Page loaders read files; everything else that used the models (alerts,
  newsletter, inbox, collection, admin) reads `public-data.ts` rows via `publicDb`, a
  small where/orderBy/select evaluator with the Prisma shape, so those modules changed
  their client, not their logic. Derived answers the pages computed in SQL
  (deal inputs, store prices/stats/listings, sold-out sealed) are computed in the job
  and written as files.
- **Never cache "not found".** An unreadable file throws; only an answer from a
  readable snapshot may be null.
- **Retention.** Store offers 14 days (the alert outage window), eBay offers 72 h,
  pages show a row older than 72 h as sold out. `Offer.title` is not kept (no reader
  used it).
- **Offer layout.** By product-id range (1,024 ids; a set's cards are consecutive, so
  a basket is one or two files). The old 64-way `offers/NN` layout is written too
  while `SNAPSHOT_LEGACY_SHARDS` is not `0`, so the live (pre-deploy) site keeps
  working during the rollout; switch it off after the deploy.
- **Private stays private.** Accounts and everything personal remain in Neon (the repo
  is public). The only new private table is `CardDemand` (counters moved off Card).
  Foreign keys from alerts/watches/collections to Card/Sealed were dropped.
- **Retiring the tables is guarded and separate.** The retired models stay declared
  in `prisma/schema.prisma` so `db push` never drops non-empty tables; a manual
  workflow (`retire-public-tables.yml`, input `drop`) drops them after the new site
  is live. A later commit removes the declarations.

**Rollout.** `move-public-data.yml` (builds the first snapshot from Neon; refuses if
one with `ranges` exists) → import + eBay runs → deploy (the owner asked for it ASAP)
→ retire. Public-data tests: `tests/public-data.test.ts`, `tests/price-snapshot.test.ts`.

## 2026-10-16: No drawn share image per card or sealed product

Vercel's bill was dominated by `card/[slug]/opengraph-image` and
`sealed/[slug]/opengraph-image`: ~1.56 GB of ISR writes per 12 h (104-812 KB per
image) and about two thirds of function CPU. Both routes are deleted. The card and
sealed pages now name the product's own image on TCGplayer's CDN as `og:image` and
`twitter:image` (`cardImage.tile`, the sealed `imageUrl`), so nothing is drawn or
stored on our side; a card without art falls back to the site default. The site
default is one static, data-free `src/app/opengraph-image.png` (served at
`/opengraph-image.png`; the old drawn price-guide image showed live prices and cost a
function run). Set, price-guide, blog, deck and rising images stay drawn: they are few
and cached 6 h. Checked and unchanged: no `/card`, `/sealed` or `/price-guide` page
sets a `revalidate` (they are dynamic, the loaders cache), and the only
`revalidatePath`/`revalidateTag` calls are the admin deck and rising-snapshot routes,
one path each, never a loop over cards. Pinned in `tests/og.test.ts`.
## Traffic plan: links without redirects, EB05 buyers, the sister sites (2026-10-14)

Owner's traffic plan: 614 visitors a month, 1.9k pages indexed and 6.3k
"discovered, not indexed". RiftCompare's growth came mostly from pre-release pages
and a "where to buy <new set>" post.

- **No link goes through the `/blog/<guide>` redirect.** A guide lives at
  `/guides/<slug>` and `/blog/<slug>` 308s to it, but the homepage's "Start here",
  the region homes, the tool-guide strips, three hub intros and the 404 page built
  `/blog/${slug}` by hand, so the two most-linked guides (where to buy, rarities)
  were reached through a redirect from every page that linked them. Every post link
  now goes through `postHref(post)`, or `postHrefFor(slug)` where only a slug is
  known (an unpublished slug gives the blog index, never a dead URL); hub-intro
  Markdown names `/guides/<slug>` directly. `tests/guides.test.ts` walks `src/` and
  fails on a guide slug after `/blog/` or on any `/blog/${…}` / `"/blog/" +` built
  outside `postHref` and the news sitemap (which takes blog posts only).
- **A "where to buy EB05" post, and the pre-order boards linked where buyers look.**
  `/blog/where-to-buy-one-piece-eb05` (a dated blog post, not a guide) reads each
  EB05 product's cheapest live listing and seller count per market from the sealed
  catalogue at render time, in that market's currency, and says "not listed yet"
  for a product or market with nothing (the Sleeved Booster Pack had no listing
  anywhere on publication day). The release facts are Bandai's, dated: the English
  page (30 October 2026, US$4.99 MSRP per pack, "75+2 types", the rarity list) and
  the Japanese one (31 October 2026, 6-card packs, the per-rarity split). Bandai's
  English page prints no English pack size or box count, so the post says so
  rather than borrowing the Japanese figure. No forecast and no "buy now": the
  pre-order section explains how each choice works. Links to other posts are
  literal paths in that file (it is imported by `lib/blog/index.ts`, so it cannot
  import `postHrefFor` back); `tests/guides.test.ts` now also checks that every
  literal `/blog/<slug>` or `/guides/<slug>` link names a published post at its own
  URL. `tests/eb05-post.test.ts` renders the post from fixtures and fails on any
  printed price the catalogue does not hold.
- **The boards were reachable only from `/sealed` and the sitemap.** Now the set
  page shows a callout (`PreorderCallout`) and `/release-dates` links the board
  beside the next-set line and under each upcoming set, both through
  `preorderPageFor(set, today)`: a set in `PREORDER_PAGES` whose release date is
  still ahead, else nothing, so every link retires itself on release day. The
  homepage's existing next-set line (in `HomeSections`, below "Explore the
  database") gains a "Pre-orders open" row from `upcomingPreorderPages`: no new
  section, so the pinned section order and the no-cookie rule are untouched, and the
  hourly ISR drops a set the day it releases. A set with no release date gets no
  link (nothing would retire it).
- **Every footer names all three sister sites.** The owner runs four sites and wants
  them cross-linked: `SISTER_SITE` (RiftCompare alone) became `SISTER_SITES` in
  `lib/site.ts` (RiftCompare for Riftbound, DexCompare for Pokémon TCG sealed
  product, MTG Compare for Magic: The Gathering), rendered as one "Also from us"
  line under the footer's link row, which is unchanged. They are our own sites, so
  the links are plain and followed (`target="_blank" rel="noopener"`, no
  nofollow/sponsored, no affiliate tagging); About and Who writes this name all
  three from the same list. `tests/site-chrome.test.ts` requires the three URLs.

## Share images: ISR for a day, drawn at most once a day (2026-10-14)

Owner, on the cost of serving the site: "Social-preview images: make them fixed
images, or cache them for a long time (a day or more), instead of drawing them on
every request." Measured on production the same day: `/opengraph-image` came from
the ISR cache (HIT, `s-maxage=21600`), but the card, set, sealed and blog images
answered `public, max-age=0` with a MISS: a function drew them.

- **Why they were drawn per request.** Not a cookie or header read: nothing in
  their tree reads the request. A route with a dynamic segment (`[slug]`) and no
  `generateStaticParams` is dynamic in Next 14 whatever it exports, so
  `revalidate = 21600` only set the fetch cache's life (the build table said `ƒ`).
  Every image route with a segment now exports an EMPTY `generateStaticParams`
  (nothing drawn at build, each image on its first request, then the ISR cache;
  the build table says `●`), the device `/decks/[slug]` already used.
- **A day, not six hours.** Every route exports `revalidate = 86400`. That alone
  is not enough: Next keeps the LOWEST revalidate any cached read in a render
  declares, and a read tagged `prices` makes the render purgeable by the import's
  `revalidateTag`. Through the pages' loaders (6 h, tagged) every image would live
  six hours and be redrawn after each of the two daily imports. So the images read
  day-old twins of the same snapshot files under their own keys, untagged
  (`getCatalogForImages`, `getSealedCatalogForImages`, `getSiteStatsForImages`,
  `postContextForImages`, `IMAGE_TTL` in `lib/data.ts`), and `getPublishedDeck`
  is held a day (a publish or a hide revalidates `DECKS_TAG` at once anyway). The
  prerendered `/opengraph-image` now records `initialRevalidateSeconds: 86400`
  (was 21600) and carries no `prices` tag. Cost of the choice: an image shows
  prices up to a day behind the page (two days at the very worst: the loader
  entry's age plus the image's). A thumbnail is a preview, and the platforms cache
  it themselves for far longer; the page it links to is current.
- **A fallback is still never pinned.** An error or a slug the data does not have
  draws the data-free fallback, never a 500, and `fallbackOg` cuts that render's
  ISR life to a minute (`expireRenderAfter(60)` in `lib/data.ts`: reading a
  constant `unstable_cache` entry declared with 60 s, which Next's lowest-wins rule
  turns into the render's life; it reads no database and no network) beside the
  one-minute `OG_AFTER_ERROR` header. Locally an unknown card's image goes STALE
  after a minute while a real one stays a HIT. A slug the day-old catalogue lacks
  (a set's release day, a card shared minutes after its import) is looked up in the
  pages' catalogue before the fallback is drawn; that render lives six hours, and
  the next finds it in the day-old one.
- **Headers.** `OG_CACHED` is now `public, max-age=0, s-maxage=86400,
  stale-while-revalidate=86400` (was 6 h), so the CDN header and the ISR life
  agree; never ImageResponse's immutable year (the `?hash` on og:image tracks the
  code, not the prices).
- **Guard.** `tests/og.test.ts` requires the day and, for a `[slug]` route, the
  empty `generateStaticParams`, and walks each image route's imports
  (`tests/helpers/route-tree.ts`) failing on any `next/headers` import,
  `getCountry()`, `unstable_noStore`, `cache: "no-store"`, `force-dynamic` or
  `revalidate = 0` it can reach, plus any page that reads an image loader.
- **Not a fixed file.** Every image here shows data (the fallback is the only
  brand-only drawing, and it must stay a fallback), so none became a static file.
  CLAUDE.md's "Share images" section is updated (it said `revalidate = 21600`
  and a 6 h CDN header).

## The card page is ISR, localised in the browser (2026-10-14)

Owner, on the cost of serving the site: "opcompare /card/[slug]: cache these pages
and refresh them every few hours, the way riftcompare already does." Measured on
production that day: every card page answered `private, no-cache, no-store` and
MISS. It called `getCountry()` (the `country` cookie, then Vercel's geo header),
which makes a route per-request, and as a `[slug]` route without
`generateStaticParams` it could not be cached anyway.

- **RiftCompare's model, ported.** `export const revalidate = 21600` and an EMPTY
  `generateStaticParams` (on demand, nothing prewarmed; the build table now says
  `●` where it said `ƒ`). No cookie, header or session read anywhere in the tree:
  each card renders once on the baseline market (`DEFAULT_COUNTRY`, the US, what
  `CountryProvider` starts from) and is served from the cache to every visitor and
  crawler. Everything that depends on the visitor's market is computed on the
  server for all six markets and drawn by client islands
  (`components/card/CardMarket.tsx`) that pick the market `CountryProvider`
  resolves after hydration (cookie, its localStorage mirror, then `/api/geo`). The
  server render and the first client render agree, so there is no hydration
  mismatch, and a crawler gets complete US prices. Checked in headless Chromium
  against a local `next start`: no cookie shows the US; `country=AU`, `UK`, `EU`
  show that market's tiles, board, chart currency, prose and FAQ, with no console
  error.
- **Ship results, not rows.** `lib/per-market.ts` computes each part for all six
  markets and stores identical values once (a card with no listing anywhere ships
  one "no price" state). The board is a `BoardModel` (`lib/board-model.ts`, the old
  `PriceBoard` rules moved unchanged): labels, postage lines, played-copy notes,
  "Paid link" flags and affiliate-tagged hrefs resolved on the server, so the 87 KB
  store registry and the partner-id environment never reach the browser.
  `PriceBoardView` and `CardMarketsTableView` only draw; the sealed page keeps
  `PriceBoard` / `CardMarketsTable`, which now build the same model for one market
  on the server. Measured locally on the biggest card (adio-op09-023, 146 open
  offers across five markets): the six boards are 58 KB of the RSC payload, and
  the HTML is 398,879 bytes against production's 448,360 (the old page carried the
  US board twice, as HTML and as about 2 KB of RSC per row); gzipped, 53.3 KB
  against 51.8 KB. Marshall.D.Teach OP16-119: 423,512 against 494,911 raw, 56.5 KB
  gzipped on both. The route's own JS grew from 8.7 KB to 15.5 KB.
- **Honest structured data.** Metadata already quoted the US listing. The Product
  JSON-LD's `AggregateOffer` is the US market's, in USD, now with
  `eligibleRegion: US`; the FAQPage JSON-LD is the US FAQ (the visible FAQ follows
  the visitor, and is the US one for a crawler).
- **"Updated 3h ago" stays true.** A six-hour-old page would freeze a relative
  time. `components/Ago.tsx` renders the render-time value (hydration matches) and
  recounts from the browser's clock after mount; the board's lines and the
  "Last seen" tile use it.
- **Six hours, purged by the import.** Every read under the page is tagged
  `prices`, so the import's `revalidateTag("prices")` marks each cached card stale
  (the next visit gets it and re-renders it in the background); the six hours are
  the backstop. A loader under the page with a shorter TTL would become the page's
  (Next keeps the lowest revalidate), so `getDecksUsingCard` moved from an hour to
  `DB_TTL` (a publish or a hide revalidates `DECKS_TAG` at once, which also marks
  every card page stale; decks are rare). `tests/card-isr.test.ts` checks the TTL
  of every loader the page reads. One exception stays: when the history ref cannot
  be read (no database), the chart reads the `data` branch with an hour's fetch
  cache, which caps the page at an hour until the ref is back; with the ref pinned
  (production) the history files are held a month. A local `next start` without a
  database shows exactly that (`s-maxage=3600`), and `s-maxage=21600` once
  `HISTORY_LOCAL_DIR` stands in for the ref.
- **An unknown slug is a cached 404**, carrying the `prices` tag: a card that
  appears in an import is purged with it.
- **Guard.** `tests/card-isr.test.ts`: the exports, no dynamic API in the import
  tree (`tests/helpers/route-tree.ts`, shared with the share images), the baseline
  in metadata and JSON-LD, every market-dependent part drawn by an island, and the
  islands' own tree free of the store registry, the loaders and the database.
  CLAUDE.md's Egress section states the rule.

## IndexNow names the sitemap's host and fails the run on a refusal — 2026-10-16

MTG Compare's daily IndexNow run logged `8479 URLs → HTTP 422 … 0 of 8479 submitted` for a week and stayed green: its `SITE_URL` repository variable still named the old Vercel host, so the request's `host` was not the host of the sitemap's URLs, which IndexNow refuses (422). OP Compare's run works (HTTP 200 for 8,408 URLs on 15 Oct, the same key as RiftCompare and MTG Compare: a key is verified per host), but had the same two weaknesses, so it gets the same fix:

- `submissionPlan()` (`scripts/indexnow-submit.ts`) takes the origin of the sitemap's own URLs, sends only URLs on it and checks the key file there; SITE_URL only says where to read the sitemap, and a SITE_URL on another host earns a warning.
- The run exits 1, with the first 500 characters of IndexNow's answer in the log, when a batch is refused, when `/indexnow.txt` never serves `INDEXNOW_KEY`, or when the sitemap is empty. The watchdog reads the workflow's conclusion, so "0 of N submitted" on a green run was invisible to it. Without `INDEXNOW_KEY` the run still skips quietly.

`tests/indexnow.test.ts` pins both.

## The growth pack's four OP18-era guides: what was checked, what was cut — 2026-10-16

The owner's content pack (16 October) held four OP Compare pieces: leader guides for green Monkey.D.Luffy (OP18-022), Karoo (OP18-001) and Saint Gunko (OP18-060), and a keywords explainer ("what is Rush: Character"). They are published as posts in the site's own system, not pasted Markdown: `src/lib/blog/posts/{op18-green-luffy,op18-karoo,op18-saint-gunko,keywords-explained}.tsx`, facts shared in `op18-shared.tsx`.

- **Guides, not dated posts.** All four are `category: "guide"` at `/guides/<slug>` (the pack's slugs, under /guides/): a card's effect and a keyword's rule are evergreen, and the pack expects them to be revised when Bandai publishes OP18, which is how the existing guides (rarities, where to buy) are treated. They are dated 2026-10-16. There is no per-post "updated" field: ArticleView's Article JSON-LD already carries `datePublished` (the post's date) and `dateModified` (the price data's date); no new schema mechanism was built for this.
- **Every fact has a source, or it went.** Bandai's English product page (read 16 October): 20 November 2026, US$4.99 MSRP per pack, "127+1 types", Water Seven and the Holy Knights of God, Saint Gunko and Saint Shamrock as debuts, legal seven days after release. Bandai's Japanese page: 21 November 2026, 6-card packs. Bandai's English and Japanese card lists have no OP18 series yet, so OP18 card TEXT can only be the pre-release text TCGplayer lists: it is quoted from the catalogue as it stood that day, labelled "reported" with the date on every quote, and never called official. Card numbers, names, colours, rarity, cost, power and Life are read from the catalogue at render time, so a card TCGplayer has not listed drops out instead of being printed from a fan site. That removed the pack's Franky OP18-034, Iceburg OP18-061, Mini Merry OP18-078, both Gunko Characters (numbers the pack itself called disputed) and the "parallel Saint Gunko Leader" (TCGplayer lists only the standard one; the FAQ says so, dated).
- **The pack's open questions, answered from data.** Green cards that untap Luffy: Gonbe, Kokoro, Chimney and Nico Robin, quoted as reported. Karoo's Animal-and-Alabasta pool: the card numbers TCGplayer types both ways (`ANIMAL_ALABASTA`), each shown with its live price only when the catalogue holds it, beside Bandai's Block Number rule (Standard from April 2026 to March 2027 excludes Block 1, booster packs 1 to 4, unless a card's number was updated: Bandai topic 013), because four of them are OP04 cards. Gunko's 8000-power bodies: the pack framed it as Holy Knights of God only; the Leader's text counts any Character, so the post says so and counts both from the catalogue.
- **Rules numbers.** Every number in the keywords guide was checked against the English Comprehensive Rules, version 1.2.1, last updated 28 August 2026 (section 10, plus 2-10, 3-7-4, 4-9-2, 6-5-5-2, 7-1-2 and 7-1-3); the pack's were right. Each keyword links its `/keywords/[slug]` page.
- **No typed price, no decklist, no forecast.** Every `[live price from site]` became the reader's market's cheapest listing (and TCGplayer's market price) of the named Leader or of the OP18 booster box, from the loaders, or "not listed yet"; the only typed figure is Bandai's MSRP. No sample decklist is printed until Bandai publishes the set ("would be a guess"). "Likely to drive box value" and similar lines were cut.
- **Hero cards and share images.** Heroes are the Leaders and OP18 cards a post is about, and only once they have art: today none does, so the hero strip is empty and the share image is the title-only `BlogImage`; an older Karoo printing's art is never used for the OP18 Leader.
- **Linked where an OP18 reader lands.** `SET_GUIDES` / `LEADER_GUIDES` in `lib/content/catalogue-guides.ts`: the OP18 set page's "Read next" and the OP18 pre-order board list the three Leader guides, the three Leader pages link their own guide, and `/keywords` and every keyword page link the explainer. A set or Leader without its own guides renders as before.
- `tests/op18-guides.test.ts` builds each post from fixtures in every market and fails on a printed price the catalogue does not hold, a leftover placeholder, an unlabelled quote, a removed card number, or a link to a route that does not exist. `tests/eb05-post.test.ts` now checks that posts are newest first instead of EB05 being first.

## Pre-order pages: Marketplaces pinned on top, stores priced in order, a summary strip — 2026-10-16

Owner (16 October), after RiftCompare's `/radiance-preorders` did well on Reddit as an "N stores compared" link post: the same for `/eb05-preorders` and `/op18-preorders`, with "the eBay links stay at the very top, alongside the TCG(player) ones, and everything else is priced in order." Both pages change through the shared `components/PreorderPage.tsx` and `PreorderProduct.tsx`.

- **This changes the 2026-10-08 "Same ranking as every board" bullet** (OP18 pre-order page) for these two pages only. Each product now has a labelled **Marketplaces** block at the top: eBay first (the cheapest eBay row `productBoard` holds, the priced eBay offer or else the panel's headline listing, exactly as before, with eBay's own postage line; else a "Search eBay" button), then TCGplayer (its cheapest listing; outside the US, or with no listing, a link with the TCGplayer market price drawn as a muted reference, never as a price to buy at). Under it, **Stores, cheapest first**: every open store pre-order by item price (`compareBoardRows`), numbered, the "Cheapest store" badge on #1, five shown and the rest behind "N more stores".
- **What keeps it honest.** The marketplaces are not re-ranked into the stores: they are outside the ranking, never numbered, never counted as a store, never badged, and the block says "shown first, not ranked with the stores · affiliate links". The badge says "Cheapest store", not "Cheapest", because an eBay listing above it can be cheaper (OP18's US box: eBay US$284.99, the cheapest store US$329.99). The product's "From" price is still `board.rows[0]`, the cheapest open offer from anyone, so the pin never moves the number a product is shown at, and the JSON-LD `AggregateOffer` (still `PreOrder`, never `InStock`) covers every open row. The public promises of a neutral order name the exception instead of being left false: `/about`, `/editorial-policy` and `/methodology` (the ordering sections, including their `ebayLive` sentences), the page's own intro and FAQ (also FAQPage JSON-LD), and the board descriptions in the EB05 post and the OP18 guides' shared box line. RiftCompare made the same call for its pre-order table on 15 October.
- **Sold-out stores are listed, last.** The sealed detail carries store rows that are not open (a fresh read saying sold out, or a row not seen for 72 hours, which `freshFromSnapshot` already marks unavailable). `marketRows` drops them and still does (the card page, quick view and sticky bar share it); `productBoard` now also returns `soldOut`, one row per store (its newest observation), never a store that is open here, never eBay or TCGplayer, read through `offerStock` (`lib/sealed-offers.ts`): "Sold out" or "Not seen lately", under a fold after the open rows (open when no store is), with the last listed price in muted text and a "Check" link: no number, no accent price, no buy button. That is the price board's out-of-stock disclosure, for pre-orders: on 16 October most tracked stores had sold out of the EB05 box (US: four of six; Canada: seven of nine).
- **The summary strip** under the intro is computed by `preorderSummary` from the same products the page draws: stores checked in the visitor's market (`storesIn(country).length`, the registry count the EB05 post prints as "We track N stores"), distinct stores with an open pre-order for any of the release's products there, the cheapest open STORE box and who has it (not the eBay or TCGplayer listing, which sit right under it), and days to release. A small line adds the all-market total from offers the page already loads (no extra read): distinct stores listing the release on a fresh read, open or sold out, the markets they are in, and how many are taking pre-orders. TCGplayer and eBay are never counted as stores, here or anywhere.
- **Removed:** the bar under each product ("Prefer a marketplace? … Search eBay / TCGplayer"); both links now live in the Marketplaces block. When an eBay listing is shown, "More listings on eBay" keeps the search one tap away. The page-level "Prefer a marketplace?" eBay strip under the summary stays.
- **Click surfaces:** `preorder_marketplace_ebay` (the listing or the search, told apart by `data-retailer`: `ebay_<mkt>` or `ebay_search`), `preorder_marketplace_ebay_more`, `preorder_marketplace_tcgplayer`, `preorder_row` (stores), `preorder_sold_out`. `preorder_ebay` and `preorder_tcgplayer` are retired with the bar.
- The panel's eBay row now uses the shared `sourceLabel` and `postageLine` ("eBay Australia", "+ £3.45 postage · ≈ £203.44 delivered"), as every other eBay row; an unknown postage still reads "postage at checkout", never "delivered".
- `tests/preorders.test.ts` pins the split (stores only in the ranking, marketplaces apart, sold-out rows last and deduplicated, the summary's counts) and the component's order and classes. Checked at 1280 and 390 px, US and AU, light and dark: no horizontal scroll.
- **Not changed:** deploy cadence (it rides the next weekly release unless the owner asks), the eBay budget, `marketRows`, the card and sealed boards.

## Card pages leave ISR for the CDN — 2026-10-17

**Owner:** "ISR writes is taking a lot of costs on Vercel… it's costing like almost $10 a day. So we need to significantly reduce the cost."

**What the card page cost.** The page went real ISR on 2026-10-14: six hours, on demand, purged by the import's twice-daily `revalidateTag("prices")`.
- One card page is ~350 KB of HTML and ~165 KB of RSC. ISR writes are billed per 8 KB, so each rewrite was about 65 write units.
- There are 7,306 card URLs in the sitemap, and crawlers walk the long tail. A card could be rewritten up to six times a day: four six-hour lives plus two purges.
- That made one long-tail card cost about as much a day as rendering it two hundred times. A long-tail card fetched on 17 October came back `x-vercel-cache: REVALIDATED`, a rewrite.
- One ISR write of this page is about $0.00026. One render is about $0.00001–0.00004 of CPU and transfer.

**The change.**
- The page is `force-dynamic`, with no `revalidate` and no `generateStaticParams`.
- `next.config.js` sends `Vercel-CDN-Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400` for `/card/:slug` (`CDN_PAGES`). Vercel's CDN reads it before the page's own `private, no-store`, keeps the copy for free and never forwards the header to the browser.
- Checked live on DexCompare the same day, with the same header from `next.config.js`:
  - a second request was a HIT;
  - an `RSC: 1` request was cached apart from the HTML (`Vary`), so it cannot poison the page.
- The page still reads nothing per visitor, so one copy serves everyone (`tests/card-isr.test.ts` walks the imports, as before).
- The loaders keep their own Data Cache, tagged `prices` and purged by the import. A render after a purge reads the new snapshot. The CDN copy is at most six hours old, plus a stale serve while it refreshes: the same freshness the ISR life gave.

**Cost of the change.** A CDN miss is a render: a function invocation and Fluid CPU. The CDN keeps a copy per region, so a card seen from two regions renders twice where ISR rendered once. At ~1/20 of a write per render, that still saves an order of magnitude.

**Unchanged:** every other ISR route. These are the homes (`revalidate = 3600`), the pre-order pages, the decks and the five share images that list their params. They are a few dozen paths, not thousands.

**Reversal:** `export const revalidate = 21600` and the empty `generateStaticParams` back in the page, drop `CDN_PAGES` from `next.config.js`, and restore the first test of `tests/card-isr.test.ts`.

## Previews are off — 2026-10-17

**Owner:** "reduce the cost on Vercel in general for all of these sites."

OP Compare still built a preview for every push to every branch. `scripts/vercel-ignore-build.sh` let them all through ("previews are not gated"), and the sessions push `claude/*` branches several times a day. That cost a full build each time, for a URL nobody opened. The sister sites stopped this on 2026-10-14.

**The change.**
- A preview or development build happens only when the commit SUBJECT carries `[preview]` (any case). Add the marker only when the owner asks for a preview.
- `claude/*` branches get no deployment at all (`vercel.json` `git.deploymentEnabled`, as on RiftCompare).
- An unreadable message never builds a preview.
- Production is unchanged: `[deploy]` subjects only, weekly on Mondays.
- `tests/deploy-gate.test.ts` pins it.

## Last known price where a card has none — 2026-10-18

**Owner:** "There's a lot of cards on all these websites with no prices, but in history they did have a price. So maybe we could still have a price on the card, but we make it a different color, and in very fine print, it's like last known price."

**When.** Only where the site said "No price yet" or "—": in that market the printing has no headline at all (no open listing there and no TCGplayer market price), and either the card page shows a sold-out store row as "Last seen" there or the printing's own published history holds an earlier price for that market. A live listing or reference always wins.

**What.**
- **The card page's "Last seen" row first.** Where the card page's price tile shows a sold-out store row ("US$29.50 · Last seen 7h ago": `lastSeen` in `lib/card-price-state.ts`, the newest sold-out store row in the market's own currency, never eBay), the last known price IS that row: its price and the day it was last seen. The snapshot table and the QuickView pass `lastSeen`'s own answer in (`lastKnownTupleOf`), over the very rows the page reads (the builder applies the page's `freshFromSnapshot` to the rows it writes), so a tile, its popup and its card page show one figure. There is one copy of the rule. Coordinator's follow-up, 18 October: Charlotte Chiffon OP03-109's tile had read "US$58.40 · Last known price · 10 Oct 2026" (history) beside the page's "US$29.50 · Last seen 7h ago"; it now reads "US$29.50 · Last known price · 17 Oct 2026".
- **Else the newest history day.** The headline of the newest history day that had one, for the same product id (one series per printing) and the same market. The history files carry exactly the headline's two figures per day (`[day, marketUsd, lowUS … lowEU]`, written from the aggregates the catalogue's `low` comes from), so: that day's cheapest listing in the market's own currency, else that day's TCGplayer market price, kept in USD and converted where it is shown with the live reference's rate (`usdCentsToCountry`, marked "≈"). Another market's listing never fills this one; a v1 day (US low only) counts for the US alone. At most 365 days back, the chart's window.
- `lib/last-known.ts` (pure, client-safe; it takes `lastSeen`'s answer as an argument rather than importing the store registry).

**Where.**
- Card page: where the tile would say "—" (no "Last seen" row either), it becomes "No live price · <place>", the amount muted, and "Last known price · 12 Sep 2026". Computed on the server for all six markets from the year of history the page already reads for its chart (no new read), carried in `MarketTile.lastKnown`, picked by the `MarketTiles` island. The page's existing "Last seen" tile (main colour, under "Cheapest") is unchanged: changing it is the owner's call. The phone buy block and sticky bar stay empty; the board, FAQ, prose and JSON-LD are unchanged.
- The card page's price-history chart: its summary line said "Now <price>" in the price accent even in a market with no live price, where that number is history. `LineChartInteractive` takes `live` (default true, so every other chart is unchanged); the card page passes, per market, whether the headline is live (a listing or TCGplayer's market price), and where it is not the line reads "Last recorded price US$58.40 · 10 Oct 2026" in the muted colours. The QuickView's US chart does the same from the US's own state (an open row or a TCGplayer price). A market with a live TCGplayer price but no listing keeps "Now" over its listing series, as asked ("unchanged where a live price exists").
- Lists: the card tile wherever it is drawn from the catalogue (set pages and galleries, browse and search, colours, the card page's rails), `PriceLine` (the card link grids of leaders and keywords) and the price guide's price cell, through an optional `CardLite.lastKnown`.
- The QuickView popup a tile opens, from the history its API route already loads, so the tile and the popup agree.

**How the lists get it cheaply.** `prices.json.gz` gains an ADDITIVE field, `lastKnown`: card id → one tuple per market (`[YYYYMMDD, cents]` a history listing, `[YYYYMMDD, usdCents, 1]` a history reference, `[YYYYMMDD, cents, 2]` the page's "Last seen" row, `0` nothing), only for cards with an entry. The import builds it in `buildSnapshot` once the offers are grouped (`prices.json.gz` is now written after them): `lastSeen` over each candidate's rows, else the local history checkout (`HISTORY_DIR`, which `recordHistory` has just written), reading only the buckets of cards unpriced somewhere and keeping only their series. The eBay pass has no history checkout and does not aggregate (the prices it publishes are the import's), so it carries the previous snapshot's table over unchanged, read before the output directory is cleared; with neither, the snapshot simply has none and the tiles say "No price yet" as before. Older snapshots lack the field; the seed, the alert rows and an older site ignore it. Measured on the 17 October snapshot and history: 412 of 7,307 cards are unpriced in some market; 410 get a last known price (1,105 market entries from "Last seen" rows, 38 from history, which only started on 3 October), 28 KB of JSON, +4.2 KB gzipped; the catalogue's prices cache entry stays at about 0.5 MB. Per-card history files are never fetched for a tile.

**Never a price.** It lives in its own field (`lastKnown`), never `low` or `marketUsd`, so `headline`, `sortPrice`, `runBrowse`, `sortGuide` and `guideStats` cannot see it: no sort, filter, ranking, index, movers, deals, Rising/Demand, alerts, baskets, collection values or eBay reference uses it, and nothing says "cheapest" or "from" about it. The card page's Product JSON-LD still offers only live US listings; its title, description, FAQ (and FAQPage JSON-LD) and narrative are untouched; the share images decode the catalogue without it (`catalogOf(core, pr, false)`); the sitemap and indexability never read prices. `tests/last-known.test.ts` pins the selection (a sold-out row from yesterday beats an older history point; another currency or an eBay row never does), the builder's use of the page's own `lastSeen` and `freshFromSnapshot`, the ranking functions, an allowlist of the only files that may name the field (a new reader fails), the card page's JSON-LD, metadata, FAQ and prose, the images' catalogue, the snapshot's additive write and carry-over, the drawing, the popup and the chart's summary line.

**Look.** The amount in the secondary text colour (`text-slate-400`, the fine print `text-slate-500`), never the price accent; the words "Last known price" and the date always beside it, so colour is never the only signal; a reference keeps its "≈"; no link, no buy button; a hover title says where the number came from ("a store's listing …, sold out when we last saw it" for a "Last seen" row) and "Not a current price". The date is the site's day-month-year short date spelled with a fixed three-letter month (`fixedShortDate` in `lib/format.ts`, like the share images' `ogDate`): ICU versions disagree on en-GB's "Sep"/"Sept", and a tile renders on the server and again in the browser, which must agree.

**Caching.** The card page is unchanged in kind: `force-dynamic`, the same `CDN_PAGES` rule, nothing in its tree reads a cookie, header or session (`tests/card-isr.test.ts`), no new `revalidate`; the payload grows by one small field for at most six markets.

**Judgement calls.**
- Today the cards with a last known price are mostly promo, event, trophy and serial-numbered printings, and some figures are single asks: the history's US$20,000 listing for Rebecca OP15-039 Flame-Flame Fruit Coliseum on 12 October, or sold-out rows such as A$202,999 for the Monkey.D.Luffy ST01-001 Serial Number. A tile shows exactly what the card page already shows as "Last seen" (or what the live headline showed that day); the date and the muted "Last known price" say what it is.
- The card page's existing "Last seen" tile (a sold-out store row's price, in the accent colour, under "Cheapest") is left as it was; it predates this rule, and changing it is put to the owner.
- Not done: the set page's "price guide" table (its column is the cheapest in-stock listing only, so its "—" is already the truth), sealed products, the watchlist, the binder and its share page (values), the deck pricer.

## BeachesTCG (AU) joins as a sealed-only store; event entries are never products — 2026-10-19

**Owner:** "Can we add this website to the stores for all the relevant compare sites? I think they might only do sealed products, not sure about singles. Australian. https://beachestcg.com.au/"

**What the store is** (read 19 October). Shopify (`qf1nsm-k0.myshopify.com`), AUD, ships within Australia only (`/meta.json`), robots.txt allows `/collections/*/products.json`. Its sitemap has one One Piece collection, `one-piece`: 27 products (page 2 empty), 3 in stock. English sealed (Set Sail SD-01, starter decks ST-06 to ST-28, OP-07 to OP-13 packs, OP-10/OP-13/OP-17 boxes), 8 Japanese packs and boxes, and one event entry. No singles.

**The entry.** `beachestcg`, "BeachesTCG" (the store's own name), AU, `collections: ["one-piece"]`, `sealedOnly: true`.

**Sealed only (`StoreInfo.sealedOnly`, new).** The store's listings go through `matchSealedTitle` alone. A title with a card number is the miss `sealed-only-single`, so nothing it lists is ever priced as a single, even if singles appear in that collection later. /admin/store-health would then show the misses, and dropping the flag lets the singles matcher read them. That is the owner's call.

**Event entries are never products, at every store and on every path** (`isEventListing` in `lib/match.ts`, the miss `event`). Beaches lists "One Piece - Pirates Party 2026 Vol.3 2-on-2 Battle format - Sat. September 12, 2026 01:00 PM" inside its One Piece collection. Its product type is "Event Entry" and it is tagged SEALED. It was skipped only because no product word happened to fit. Two things now mark a listing as an event:
- a product type that says it is an entry or a ticket ("Event Entry", "Tournament Entry", "Tickets");
- a title that states a time of day ("01:00 PM", "@ 1:00pm", "10am Start").

The rule only takes listings away. In the 18 October snapshot, none of the 657,673 store offers has a URL handle that states a time of day, so the title test removes nothing priced today. The snapshot keeps no product types, so the type test could not be replayed; it names only entry and ticket types. Real titles from Beaches' One Piece and events collections are in `tests/match.test.ts`.

**One sealed rule, for a real naming difference.** A title with no set code and no set name that says "starter deck NN" names the set TCGplayer calls "Starter Deck NN: …", and no other. The real title is Beaches' "starter deck 24", which is ST-24.
- ST-10 and ST-13 are Ultra Decks, so "starter deck 10" names nothing.
- ST-01 and its Super Pre-Release edition share the number, so a bare "starter deck 1" stays ambiguous.
- A number followed by pack, x or bundle is a count, not a deck.

Before this rule, such a title found no product at all (with no code and no name, no set fitted). So the rule never moves an existing match: it only turns `sealed-no-product` misses into matches.

"Op13 booster box English" and "ST22 - starter deck" already matched (OP13 box, ST-22) and needed no rule.

**Japanese product** is skipped as `foreign` (FOREIGN_LANG: "JAPANESE", "JPN"), never matched to the English product. The catalogue is TCGplayer's English list.

**Dry run.** The import's own per-product path (matcher with the store's tags, product type and sealed-only flag; the shared-title guard; best variant; AUD→USD; the plausibility check) was run over the saved products.json (`tests/fixtures/stores/beaches-one-piece-products.json`) against the 18 October snapshot's catalogue, writing nothing. `scripts/probe-stores.ts --key=beachestcg` (the live reader, read-only) found the same collection and the same 18 matches before the price check. The result: 15 offers, 2 in stock (Set Sail Deck Set A$34.99, Starter Deck 22 A$34.99). 8 were skipped as foreign and 1 as an event. 3 matched but were refused as implausible: ST-23, ST-28 and the OP-09 pack, all sold out and under half of TCGplayer's market. 3 of 27 is over `IMPLAUSIBLE_SHARE`, so /admin/store-health will list Beaches under "Needs a look" with an implausible-prices alert while those stale prices stand. The threshold is unchanged.

**Postage.** There is no `/policies/shipping-policy` (404). The FAQ gives no rate. The terms (`/pages/terms-conditions`, §4) say "Shipping costs and estimated delivery times are provided at checkout and may vary based on your location and chosen shipping method." So there is no `shippingCents`, no `policyUrl`, and an `"unmeasured"` line in `shipping-rates.json` (the market estimate, never a measured rate). The postage probe carts singles, so it cannot measure this store.

**Health.** No new check. The watchdog's store check (`collectStores`) and every store-health alert (failing, empty read, no listings, stale, listings or match rate dropped, implausible prices) run over the whole registry, so Beaches is counted like any store.

**Before the release.** The import runs from `main`, but the site runs the last release. The site deployed now (8a7d22c) does not know the key. Rendering its board with an offer from `store:beachestcg` gives no crash and no hidden row: the row is labelled with the raw key "beachestcg", with "postage at checkout", on AU sealed pages and quick views. The store is missing from /stores and the sitemap. That lasts until the next Monday release, or about an hour if the change lands on `main` before the 07:07 UTC import on a release Monday. Best Basket prices only its own registry's stores (`basketStoresFor`), so the deployed site leaves Beaches out of it. Beaches lists no singles anyway.

## A search box inside the card filters — 2026-10-19

**Owner:** "In the database, when you have the filters, there should be a search bar in the filters as well — a filter by just keywords — so you don't need to use the search bar at the top of the website."

**What.** `BrowseFilters` opens with a "Search" box (`type="search"`, `name="q"`, placeholder "Card name or number…", `maxLength` = `QUERY_MAX`, 80, what `parseBrowse` reads). It writes the same `q` the header search writes, so it matches what `lib/search.ts` matches (name, number, printing, rarity, type, set, nicknames), ANDed with every other filter. It is the named field the hidden `q` input used to be, so the GET form still works without JavaScript. On /sealed's terms: it applies as you type after a 350 ms pause, and at once on Enter or blur. Every change goes through `withKeywords` and `canonical()`, so the other params stay and the page goes back to 1.

**Where.** /browse and every set page (the set stays fixed; `runBrowse` already searched before it filtered by set). Not in the price guide's panel: its toolbar already has a search box for the same `q` directly above it. Two boxes for one param on one screen would be one too many. There the panel takes `hide={["q"]}` and carries the words as a hidden field. The guide's `runGuide` honours `q` either way.

**The words are a filter now, so they count and they clear** (this reverses "the search words (q) are not a chip" in `lib/filter-chips.ts`, from the 2026-10-03 filter-chips work). The panel's "Clear (n)" counts them, as /sealed's does. `FilterChips` shows them first, quoted (“zoro”), with one tap to remove. "Clear" and "Clear all" empty them, as /sealed's "Clear" does, and the box empties with them. Sort and page size still stay. A panel that does not show the box (the price guide's) neither counts nor clears the words; its chip and "Clear all" still do, so each control clears exactly what it shows.

**Keeping the box and the URL in step.** The box refills whenever `q` changes from elsewhere: the header search, a chip, Back/Forward, "Clear". The one exception is while the visitor is typing in it and the URL is only catching up with what this panel last sent. Without that, a slow render of "luffy" would wipe the " gear" typed since. The pause timer calls the latest render's apply, so a tick made during the pause is not undone by a query read before it.

**A comma in the words.** `canonical()` used to split every key on commas, so "luffy, zoro" became "luffy" on the next filter change. Single-value keys now keep their whole value.

Pinned by `tests/browse-filters-search.test.ts` (the field rendered through Next's router contexts, the pages that show or hide it, the set page's and the guide's `q`) and `tests/filter-chips.test.ts` (`withKeywords`, `filterCount`, the chip, `clearFilters`). No loader, cache, `revalidate` or database read was added.

## 2026-10-19: A third Neon database (OP3), and fewer wakes of it

**Why.** OP2 reached Neon's monthly compute limit. A new project resets the allowance;
the code also asks for less of it.

**Decisions.**
- **`OP3` wins over `OP2`, then `DATABASE_URL`** (`src/lib/db-url.ts`, `db-push-safe.sh`,
  every workflow's `DATABASE_URL` expression). The **Migrate database** workflow now copies
  OP2 (else the old one) to OP3, PRIVATE tables only: the catalogue, offers and eBay state
  are the snapshot branch since 2026-10-14, so Set/Card/Sealed/Ebay* are in `SKIPPED`.
  Order: create the project, set `OP3` in GitHub and Vercel, run the migration (dry run
  first), run the import, then deploy (a Vercel env change needs a build). The old project
  is only read.
- **Compute is time the database is awake** (it suspends after about five idle minutes), so
  every request-time or scheduled query is a wake. Cut: card views are counted in memory
  and written in one batch per half hour per instance, not one write per view
  (`card-views-server.ts`); the launch-promo counter is cached 15 minutes, not 30 seconds
  (every popup view woke it); the email outbox runs every three hours, not hourly; the
  watchdog three times a day, not six.
- **Cost of that:** welcome and confirmation emails wait up to three hours; the health report
  is up to eight hours old; popularity counts lose what an instance holds when it is
  recycled; a new sign-up shows in the promo counter within 15 minutes.

## 2026-10-22: Don Games asked to be listed more fully

The owner of Don Games (AU, already a store here) wrote through the inbox asking for a
wider range of their cards, then made a Shopify collection "One Piece Singles" for us.
That handle was already read (the importer discovers `*one-piece*` collections from the
sitemap), so the change is that it and the two English sealed collections are now
CONFIGURED handles: a configured collection that cannot be read fails the store's read
and keeps its last offers instead of publishing a part-read store. The old
`st05-one-piece-film-edition` handle is no longer needed (the singles collection holds it).

Measured the same day against their live feed (4,459 singles): 3,642 matched (82%), 2,822 in
stock. The misses are, by reason: 525 "no printing" (their names for stamped and promo
variants: "Gift Collection Alternate Art", "Dash Pack", "Extended Art", event names where
TCGplayer says "Gift Collection 2023", "Box Topper", "Pre-Release", "Judge Pack Vol. 6",
"Premium Card Collection -Best Selection Vol. 5-", "Promotion Pack 2022", "Full Art"), 204
DON!! cards with no card number, 25 ambiguous (mostly P- promos), 38 Japanese. No matcher
rule was loosened: an ambiguous listing is skipped, not guessed. The owner offered to rename
variants to TCGplayer's wording, which is the safe fix; the exact wording was sent back to him.

## 2026-10-23: SEO sprint: one store count per framing, sister-site block, three query guides

The homepage meta description said "375 stores" (every market's live stores) while the body
said "139 stores" (the US). Both are real counts from the same stats, so the framing is now
explicit, not one number: titles, meta and social copy say "N stores in six markets"
(`liveStoresAll`), and on-page US counts say "N US stores" (`statsByCountry.US`). The
homepage FAQ questions are real `<h3>`s inside their `<summary>`, so the visible questions
match the FAQPage JSON-LD. Organization and WebSite stay site-wide in the root layout (one
node each, `@id`-referenced); BreadcrumbList stays in `Breadcrumbs.tsx`; card and sealed
pages keep their Product + AggregateOffer from live offers only (never `lastKnown`).

A static "Compare other TCGs" block (`CompareOtherTcgs.tsx`, from `SISTER_SITES`, game-named
anchors, followed links) sits on the homepage, card, sealed and article pages; it reads no
request, so the CDN-cached card page is unaffected. Sealed product pages now show
RelatedGuides (the set's own guide first). Three guides each target one query
(`op17-booster-box-price`, `one-piece-booster-pack-price`, `one-piece-starter-deck-prices`),
built at render from the snapshot like every other post, so a figure always matches the
page it links to.

## 2026-10-24 — Halloween ("Thriller Bark awaits"), ported from RiftCompare

Owner: make the site Halloween-themed like RiftCompare, reverting by itself.
`src/lib/season.ts` is RiftCompare's: 16-31 October in the VISITOR's local
time, `SEASON_BOOT_SCRIPT` stamps `data-season` on `<html>` before paint (no
cookie or header, so the CDN-cached `/card` page stays one copy), `?season=
halloween|off` previews it. Only the home hero carries markup
(`HalloweenDecor`, `ThrillerBarkComing`, in the HTML a day either side of the
window via `seasonMarkupLive`); CSS shows it only under the attribute, so on
1 November it is gone with no deploy. Decor (cobwebs, spiders, bats,
jack-o'-lanterns) sits in the hero's aria-hidden background layer under the
content; on phones bats and spiders sit out and pumpkins shrink into the
corners, so nothing crosses text. Reduced motion stops it. The dark theme's ink
ramp turns violet at the same lightness; brand red, buy and eBay colours are
untouched. The teaser links to `/search?q=Brook` (no card slug is guessed).
`tests/season.test.ts` pins the window and the gating.

## 2026-10-24 — Dark theme is the default again

Owner: new visitors get dark, as on RiftCompare. Reverses "Light theme is the
default" (2026-10-03). `DEFAULT_THEME` is `dark`; the root layout renders
`<html data-theme="dark">`, the boot script's fallback is `DEFAULT_THEME` (no
second literal to drift), `viewport.themeColor` is the dark page colour and the
toggle hydrates as dark. A saved `theme` cookie (either value) and the legacy
`op:theme` migration are unchanged, so nobody who chose light loses it. Still no
server-side cookie read and no `prefers-color-scheme`: the CDN-cached pages stay
one copy, and the inline script stamps the choice before first paint.
`tests/theme.test.ts` pins the dark fallback.

## 2026-10-24 — Blog thumbnails and in-post card tiles; cards without a scan

**Blog (owner: "like RiftCompare's").** The `/blog` index card's thumbnail is now
the post's own share image (`/blog/<slug>/opengraph-image`, 1.91:1, RiftCompare's
hero-strip shape), not three raw card scans: the share image draws only cards
that have art (or its data-free fallback), so an OP18 post whose cards have no
scan yet still shows a real picture, and the index no longer builds every post
to find hero cards. It is the same ISR image (a day) social sites fetch, so it
is drawn at most once a day. Posts embed RiftCompare-style tile grids
(`CardGrid` in `components/blog/BlogBits.tsx`: the site's own `CardTile`, price
in the reader's market) for their chase and key-card lists; long ranked lists
(top 20, card lists by rarity) stay tables.

**Cards without a scan.** 234 of 7,329 printings in the snapshot have
`hasImage` false (2026-10-24): every OP18 card (41, before release), OP16
release-event cards (75), promos (48), LT-01 (35), EB05 (19), demo-deck cards
(12), 4 others. The import is right: TCGplayer has published no image
(`tcgplayer-cdn …/<id>_400w.jpg` answers 403 for them). Bandai's card list
(`en.onepiece-cardgame.com/images/cardlist/card/<CODE>.png`) has EB05 base
cards but not OP18 yet, maps parallels to `_pN` files we cannot match to a
TCGplayer printing without guessing, and sends `Cross-Origin-Resource-Policy:
same-site`, so browsers refuse it as a hotlinked `<img>`. No fallback source,
then: such a printing shows a card-shaped "Image not published yet" frame
(`CardImage`/`CardArt`), never another printing's art, and picks up its scan
from the next import once TCGplayer posts it.

## 2026-10-24: The eBay quota goes to what visitors click, never under US$20

**Why.** The owner saw US$5 cards with eBay prices while US$50 cards had none. The
2026-10-09 "as many as the quota allows" rule (`marketFloors`) let each market's floor sink
to US$3 and ranked cards by price alone, so quota went to cheap, unwanted cards and the
dearer, searched ones waited. A US$5 click earns almost nothing; the quota is the scarce
thing.

**Decisions.**
- **Hard floor US$20** for singles and sealed in every market (US$40 EU kept), whatever the
  demand (`SINGLES_ABS_MIN_CENTS`, `SEALED_MIN_CENTS`; the env floor can only raise it).
  `marketFloors` and `EBAY_TOP_CARDS` are removed. The pass now also deletes eBay price rows
  and panels left under the floor by earlier runs, so cheap cards lose their eBay price at the
  next pass instead of after 72h.
- **Demand decides the queue.** Points = searches x 3 + opens (`CardDemand`; half after 45
  quiet days), for sealed the `sealedview:<id>` Counter rows (new: sealed opens were not
  counted at all; written by `SealedViewBeacon` and the sealed quick view through the same
  batched endpoint). HOT = 10 points, or a single of US$100+: tier S1, every 48h, first.
  Everything else above the floor is tier S2/P1, every 72h, most overdue first (the rotation),
  ties by price x (1 + demand). The top-up of a run's leftover budget uses the same order, so
  hot pairs are refreshed ahead of schedule before cold ones.
- **Not done:** outbound-click data (`ClickEvent`) is retired, so "clicking sealed" means
  opening the product page or quick view. If click tracking returns, feed it into the same
  `demand` field.

## 2026-10-26: Pack opening simulator (`/tools/pack-sim`)

**Why.** Owner: add features beyond price comparison that bring visits and buy clicks.
RiftCompare's pack simulator is the only one of its games Google sends people to (124
clicks in 90 days to 2026-10-16; the rest 0 or 1, TCGEmpire DECISIONS "Seraphine's
Piano"), "one piece pack simulator" is a common search, and every pull ends beside a
real box. OP Compare already had the pack and the community pull rates (Box EV).

**Decisions.**
- **Same pack, same rates as Box EV.** `lib/pack-sim.ts` deals 7 C, 3 UC, an extra slot
  (Manga, Treasure, SP, Parallel or Leader at each one's per-pack rate, rarest first,
  else a common) and the rare slot last (SEC, SR, else R), using `derivedRates()`, so the
  simulator and the calculator never disagree. A pool the set lacks never pays out.
  `tests/pack-sim.test.ts` pins the shape and that the rates are Box EV's.
- **Prices are TCGplayer US market, converted in the browser,** as Box EV; an unpriced
  card is bulk (worth nothing). One render serves every visitor.
- **One page per released booster/extra/premium set** (`/tools/pack-sim/<set>`, for
  "OP13 pack simulator" searches) plus the hub on the newest set. Set pages are
  `force-dynamic` and CDN-cached through `CDN_PAGES` (6 h + a day stale), never ISR or
  prewarmed; the hub is ISR 86400 like `/tools/box-ev`. Each page ships only its own
  set's pools.
- **"Open a box"** deals a whole box and sets its pull against the cheapest in-stock
  box we track in the visitor's market, with the affiliate link (`data-page="pack_sim"`),
  "compare box prices" and "buy the singles". No score is stored server-side: the best
  pack lives in `localStorage` only, so the page writes nothing.
- **The pull tracker (`/tools/pull-tracker`, same day)** reads the same set data
  (`tools/pack-sim/load.ts`): tap what a real box pulled, see it against what you paid
  (pre-filled with the cheapest box in your market). Pulls live in `localStorage`; a
  shared result rides in the link's `#fragment` as card ids (`lib/pull-tracker.ts`), so
  the server never sees it and every visitor gets the one CDN-cached render. No binder
  save yet (RiftCompare's sends the pulls through the collection import); add it if
  people use the tracker.

## Store partner codes — 2026-10-26

Owner, after the strategy review: "execute on all the recommended items". The same
program as RiftCompare's (its DECISIONS.md, "Store partner codes: the store links
start earning"): store links earned nothing, eBay and TCGplayer were the only paid
links. `src/lib/store-partner-deals.ts` lists partners: an exclusive discount code
shown by `StoreCodeChip` beside that store's rows (the card board, both quick
views, the store page) and/or the commission parameter of its affiliate app, which
`affiliateUrl` adds, so `isPaidLink` labels the row. The offer is
`/stores/partners`, linked from `/stores` and the editorial policy. Empty until a
store signs.

- A label, never a position: the board stays cheapest first, the shown price is
  before the code, and nothing that ranks reads the list
  (`tests/store-partner-deals.test.ts`).
- A code hides 30 days after its last checkout test or on its end date, decided
  after mount (pages are cached for hours). The watchdog's `store-codes` check warns
  a week ahead.
- **Store links now carry `utm_source=opcompare`** (`utm_medium=referral`,
  `utm_campaign=<page>`), as RiftCompare's have since 2026-10-22: anchors are
  noreferrer, so a store could not see what we send, which is the evidence a
  partnership needs. An existing `utm_source` is kept; eBay, TCGplayer and partner
  links keep their own tagging.
- Who to approach first: each store page's "Cheapest in <market>" count.

## One family of sites — 2026-10-26

Same review: one family people recognise, no domain moved. The footer line reads
"Part of the Compare Empire family" and adds Gundam Compare and Lorcana Compare to
`SISTER_SITES` (so About and Who writes this name them too). YGO Compare joins once
it is public.

## The phone Cheapest block names the paid marketplace — 2026-10-27

Owner: more eBay and TCGplayer clicks, placed where buyers see them on a phone
and clicked because they are worth it. Below lg `CardTopBuy` showed one row
under the card's name, and in the snapshot of 2026-10-27 a store that pays
nothing is the cheapest row on 517 US cards (TCGplayer within 20% on 289) and on
most cards elsewhere (eBay within 20% on 134 in AU, 100 in CA, 38 in the UK).

When the cheapest open row is not a paid link, the block now adds one muted line,
"or US$10.80 on TCGplayer (+8%) →" with a Paid link tag, for the cheapest paid
row within 20% (`paidAlternativeRow` in `lib/quick-view.ts`, computed per market
on the server like `best`). A real row of the board at its real item price with
how much more it is: never called cheaper, never reordered, and the Buy button
stays on the cheapest. Its clicks are `buy_click` with `surface: card_top_alt`
in Vercel Analytics. Same change as RiftCompare's of the same day.

## No email per feedback or rating — 2026-10-27

The owner, across the sites: "stop sending me emails for every single feedback
… and every single rating … I can check in the admin dashboard." The hourly
outbox (`owner-notify.ts`) no longer reads feedback, and feedback no longer
counts toward `inboxTotal` or the oldest-waiting date, so the watchdog never
alerts over it. It still shows in `/admin/inbox`. Contact messages, support
tickets, price reports and store suggestions are still emailed, since those
need a reply or a fix.

## eBay and TCGplayer lead every price board — 2026-10-27

Owner: eBay and TCGplayer at the very top of every price list, even when they
are not the cheapest. `PriceBoardView` now draws the market's cheapest eBay row,
then its cheapest TCGplayer row, then the stores by price. With no eBay row the
eBay search is the first row (it moved up from under the board); outside the US,
with no TCGplayer row, TCGplayer's market price is a labelled reference row
("may not ship to your country") and the card page's separate `TcgMarketPrice`
block shows in the US only. Pinned rows carry "Shown first" beside "Paid link",
keep their PRICE rank in the number column, say "+N% vs cheapest" when dearer,
and "Cheapest" stays on the real cheapest. Clicks: surface `board_pinned`. The
headline, `CardTopBuy`, the sticky bar and JSON-LD still read the price order.
`/methodology`, `/about` and `/editorial-policy` say so. Same change as
RiftCompare's that day.

## Every site links the whole family — 2026-10-27

The owner, once YGO Compare existed: "our website should all have all of our
compare websites now in the suite of websites … just try to backlink all of
it." Every site's footer now links the other eight: RiftCompare, OP Compare,
DexCompare, MTG Compare, Gundam Compare, Lorcana Compare, YGO Compare
(ygocompare.com), CamCompare (www.camcompare.app) and Compare Empire
(www.compareempire.com, Australian tech prices), each on the host it already
uses (no apex or www change). Plain followed links, never sponsored: they are
our own sites. The link text says what each compares ("Yu-Gi-Oh! card prices",
"Camera and lens prices"), with the site's name after it, rather than the
brand alone. MTG Compare is sealed-only since 2026-10-21, so its anchor now
says "Magic: The Gathering sealed prices" everywhere.

Footer only. In-page blocks ("Compare other TCGs" on card and product pages,
the article blocks) keep to card games, and the two sites that are not card
games are labelled as the wider family, so nine look-alike sites linked from
every page body never read as a link network.

`SISTER_SITES` gains YGO, CamCompare and Compare Empire; the two non-TCGs
carry `notTcg`, so `CompareOtherTcgs` and About's one-per-game line read
`TCG_SISTER_SITES`, and About names the other two separately.
