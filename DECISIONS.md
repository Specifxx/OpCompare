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
