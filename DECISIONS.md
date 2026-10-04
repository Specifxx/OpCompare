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

## 2026-10-03 — Light theme is the default

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
