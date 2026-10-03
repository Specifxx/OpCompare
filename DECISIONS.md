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
