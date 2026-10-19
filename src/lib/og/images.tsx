// Load + draw for every share image. The routes in src/app/**/opengraph-image.tsx
// are one-liners over these, so scripts and tests can render exactly what a
// route serves. Data comes only from the cached loaders in lib/data, and the
// catalogue, sealed and stats reads from their day-old IMAGE twins
// (getCatalogForImages…: the routes are ISR for a day, and the pages' 6-hour,
// "prices"-tagged loaders would cut that to six hours; see lib/data.ts). No new
// DB read; no getCardDetail / getSealedDetail, which each read offer files. The
// market is fixed at US (an OG PNG has no visitor), and any failure draws
// FallbackImage: an unfurl must produce an image, never a 500. Every image is
// sent with OG_CACHED; every fallback with OG_AFTER_ERROR and an ISR life of a
// minute (see respond.ts).
import type { ImageResponse } from "next/og";
import { PRINTINGS, SET_KINDS, rarityLabel } from "../constants";
import {
  expireRenderAfter,
  getCatalog,
  getCatalogForImages,
  getPublishedDeck,
  getRisingSnapshot,
  getSealedCatalog,
  getSealedCatalogForImages,
  getSiteStatsForImages,
  type Catalog,
} from "../data";
import { hotListName } from "../rising-snapshot";
import { cardImage } from "../images";
import { postBySlug } from "../blog";
import { postContextForImages } from "../blog/context";
import { ogArt, withThumbs } from "./art";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BlogImage, CardImage, FallbackImage, GuideImage, PreorderImage, SealedImage, SetImage, type GuideVariant } from "./compose";
import { OG_AFTER_ERROR, OG_CACHED, OG_FALLBACK_TTL, ogResponse } from "./respond";
import { ogDate } from "./theme";
import { findSealed, ogPriceLines, setBoxImage, pickGuideRows, setPreviewCards, setTopRows, storesTracked } from "./select";

function warn(where: string, err: unknown) {
  console.error(`[og] ${where} fell back:`, err instanceof Error ? err.message : err);
}

/**
 * The data-free fallback. It also cuts this render's ISR life to a minute, so a
 * read error or a slug the data does not have yet is never cached for the day a
 * real image is (respond.ts).
 */
export async function fallbackOg(): Promise<ImageResponse> {
  await expireRenderAfter(OG_FALLBACK_TTL);
  return ogResponse(<FallbackImage />, OG_AFTER_ERROR);
}

/**
 * The image catalogue is up to a day old, so a card or set added since (a set's
 * release day, a card shared minutes after its import) is looked up in the
 * pages' fresher catalogue before the fallback is drawn. That render then lives
 * as long as the pages' loaders (six hours), and the next one finds it in the
 * day-old catalogue.
 */
async function catalogWith(has: (cat: Catalog) => boolean): Promise<Catalog | null> {
  const day = await getCatalogForImages();
  if (has(day)) return day;
  const fresh = await getCatalog();
  return has(fresh) ? fresh : null;
}

/** (a) the site default and (b) /price-guide. */
export async function guideOg(variant: GuideVariant): Promise<ImageResponse> {
  try {
    const [cat, stats] = await Promise.all([getCatalogForImages(), getSiteStatsForImages().catch(() => null)]);
    const rows = pickGuideRows(cat, "US", 5);
    if (rows.length < 3) return fallbackOg();
    return ogResponse(<GuideImage rows={await withThumbs(rows)} cards={cat.cards.length} stores={storesTracked(stats)} variant={variant} />, OG_CACHED);
  } catch (err) {
    warn(`guide(${variant})`, err);
    return fallbackOg();
  }
}

/** (c) /sets/[slug]: the set's own mini price guide, or its art when unpriced. */
export async function setOg(slug: string): Promise<ImageResponse> {
  try {
    const cat = await catalogWith((c) => c.setBySlug.has(slug));
    const set = cat?.setBySlug.get(slug);
    if (!cat || !set) return fallbackOg();
    const cards = cat.cards.filter((c) => c.setId === set.id);
    const rows = setTopRows(cat, set, 5);
    const priced = rows.length >= 3;
    const preview = priced ? [] : await withThumbs(setPreviewCards(cat, set, 4), "tile");
    // No card art yet (an upcoming set): its booster box, from the cached sealed catalogue.
    const boxArt = priced || preview.some((r) => r.art) ? null : await ogArt(setBoxImage(await getSealedCatalogForImages().catch(() => []), set.id));
    const today = new Date().toISOString().slice(0, 10);
    return ogResponse(
      <SetImage
        code={set.code}
        name={set.name}
        kindLabel={SET_KINDS[set.kind]?.label ?? "Set"}
        printings={cards.length}
        topCard={rows[0]?.marketUsd ?? null}
        released={ogDate(set.releasedOn)}
        upcoming={!!set.releasedOn && set.releasedOn > today}
        rows={priced ? await withThumbs(rows) : []}
        preview={preview.filter((r) => r.art)}
        boxArt={boxArt}
      />,
      OG_CACHED,
    );
  } catch (err) {
    warn(`set(${slug})`, err);
    return fallbackOg();
  }
}

/** (c) /sealed/[slug]: the product on a white plate with its price. */
export async function sealedOg(slug: string): Promise<ImageResponse> {
  try {
    const [day, cat] = await Promise.all([getSealedCatalogForImages(), getCatalogForImages()]);
    // A product added since the day-old list was read: the pages' fresher one (see catalogWith).
    const s = findSealed(day, slug) ?? findSealed(await getSealedCatalog(), slug);
    if (!s) return fallbackOg();
    const { head, others } = ogPriceLines(s, 4);
    return ogResponse(
      <SealedImage
        name={s.name}
        kindLabel={s.kind}
        setCode={s.setId ? (cat.setById.get(s.setId)?.code ?? null) : null}
        art={await ogArt(s.imageUrl)}
        marketUsd={s.marketUsd}
        packCount={s.packCount}
        head={head}
        others={others}
      />,
      OG_CACHED,
    );
  } catch (err) {
    warn(`sealed(${slug})`, err);
    return fallbackOg();
  }
}

/** (d) /card/[slug]: art, printing, rarity and the cheapest price per market. */
export async function cardOg(slug: string): Promise<ImageResponse> {
  try {
    const cat = await catalogWith((x) => x.bySlug.has(slug));
    const c = cat?.bySlug.get(slug);
    if (!cat || !c) return fallbackOg();
    const { head, others } = ogPriceLines(c, 5);
    return ogResponse(
      <CardImage
        name={c.name}
        variant={c.variant}
        printing={c.printing}
        printingLabel={PRINTINGS[c.printing]?.label ?? "Standard"}
        rarity={c.rarity}
        rarityLabel={c.rarity ? rarityLabel(c.rarity) : null}
        number={c.number}
        setName={cat.setById.get(c.setId)?.name ?? ""}
        art={c.hasImage ? await ogArt(cardImage.tile(c.id)) : null}
        marketUsd={c.marketUsd}
        head={head}
        others={others}
      />,
      OG_CACHED,
    );
  } catch (err) {
    warn(`card(${slug})`, err);
    return fallbackOg();
  }
}

/** (d) /blog/[slug]: the post title beside its three hero cards. */
export async function blogOg(slug: string): Promise<ImageResponse> {
  const post = postBySlug(slug);
  if (!post) return fallbackOg();
  try {
    const ctx = await postContextForImages("US");
    const title = post.title(ctx);
    const ids = post
      .build(ctx)
      .heroCards.filter((c) => c.hasImage)
      .slice(0, 3)
      .map((c) => c.id);
    const arts = await Promise.all(ids.map((id) => ogArt(cardImage.tile(id))));
    return ogResponse(<BlogImage title={title} arts={arts} />, OG_CACHED);
  } catch (err) {
    warn(`blog(${slug})`, err);
    return fallbackOg();
  }
}

/** (e) /decks/[slug]: the deck's title and what it costs to build (US), beside its Leader and two dearest cards. */
export async function deckOg(slug: string): Promise<ImageResponse> {
  try {
    const [deck, cat] = await Promise.all([getPublishedDeck(slug), getCatalogForImages()]);
    if (!deck) return fallbackOg();
    let total: number | null = 0;
    for (const l of deck.lines) {
      const p = cat.byId.get(l.cardId)?.low.US ?? null;
      if (p == null) {
        total = null;
        break;
      }
      total += p * l.qty;
    }
    const cards = deck.lines.map((l) => cat.byId.get(l.cardId)).filter((c): c is NonNullable<typeof c> => !!c && c.hasImage);
    const leader = cards.find((c) => c.id === deck.leaderCardId);
    const rest = cards.filter((c) => c.id !== deck.leaderCardId).sort((a, b) => (b.marketUsd ?? 0) - (a.marketUsd ?? 0));
    const ids = [...(leader ? [leader] : []), ...rest].slice(0, 3).map((c) => c.id);
    const arts = await Promise.all(ids.map((id) => ogArt(cardImage.tile(id))));
    const title = total != null ? `${deck.title}: ${ogDollars(total)} to build` : deck.title;
    return ogResponse(<BlogImage title={title} arts={arts} badge="DECK" footer={`${deck.leaderName} · ${deck.cardCount} cards, priced in six markets`} />, OG_CACHED);
  } catch (err) {
    warn(`deck(${slug})`, err);
    return fallbackOg();
  }
}

/**
 * A minted Hot 40 snapshot (/rising/[token]): its frozen title beside the top
 * three cards' art — every figure from the frozen row (getRisingSnapshot),
 * nothing recomputed. A missing token or an empty run draws the fallback.
 */
export async function risingOg(token: string): Promise<ImageResponse> {
  try {
    const snap = await getRisingSnapshot(token);
    if (!snap || !snap.data.picks.length) return fallbackOg();
    const top = snap.data.picks.slice(0, 3);
    const arts = await Promise.all(top.map((p) => (p.imageThumbUrl ? ogArt(cardImage.tile(Number(p.id))) : Promise.resolve(null))));
    const day = new Date(snap.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return ogResponse(<BlogImage title={snap.title} arts={arts} badge={hotListName(snap.data.picks.length).replace("OP Compare ", "").toUpperCase()} footer={`A frozen snapshot of Rising Cards, ${day}`} />, OG_CACHED);
  } catch (err) {
    warn(`rising(${token.slice(0, 6)}…)`, err);
    return fallbackOg();
  }
}

/** US cents as "$123" / "$12.34" for an image headline. */
function ogDollars(cents: number): string {
  return cents >= 100_000 ? `$${Math.round(cents / 100).toLocaleString("en-US")}` : `$${(cents / 100).toFixed(2)}`;
}

/**
 * The pre-order pages' static share images (/eb05-preorders, /op18-preorders).
 * No data read: the release dates are Bandai's (TCGplayer's group dates agree:
 * EB05 2026-10-30, OP18 2026-11-20) and the art is the set's own product shots
 * in public/preorders (traced in by next.config.js), so no network either.
 */
const PREORDER_OG = {
  EB05: { name: "Extra Booster: Heroines Edition Vol. 2", out: "30 OCTOBER 2026" },
  OP18: { name: "The Dominance of God", out: "20 NOVEMBER 2026" },
} as const;

async function localArt(file: string): Promise<string | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "preorders", file));
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function preorderOg(code: keyof typeof PREORDER_OG): Promise<ImageResponse> {
  const c = PREORDER_OG[code];
  const slug = code.toLowerCase();
  const arts = await Promise.all([localArt(`${slug}-pack.jpg`), localArt(`${slug}-box.jpg`)]);
  return ogResponse(<PreorderImage code={code} name={c.name} out={c.out} arts={[arts[0], arts[1]]} />, OG_CACHED);
}
