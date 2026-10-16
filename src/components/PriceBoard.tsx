import type { Country } from "@/lib/country";
import type { OfferRow } from "@/lib/data";
import { boardModel } from "@/lib/board-model";
import { PriceBoardView } from "./PriceBoardView";

// The price comparison for ONE market, resolved and drawn on the server (the
// sealed page, which renders per request for the visitor's market). The rules
// live in lib/board-model.ts and the markup in PriceBoardView, which the ISR
// card page draws from every market's model in a client island instead
// (components/card/CardMarket.tsx).
export function PriceBoard({
  productId,
  offers,
  country,
  ebayQuery,
  page,
  title,
  noun,
  id,
  slug,
  name,
  preRelease = false,
}: {
  productId: number;
  offers: OfferRow[];
  country: Country;
  ebayQuery: string;
  page: string;
  title?: string;
  noun?: string;
  /** Anchor id (the card page's sticky buy bar hides while this is on screen). */
  id?: string;
  /** data-card on every outbound link: the product's slug. */
  slug?: string;
  /** Display name for the eBay fallback block ("Search eBay for <name>"). */
  name?: string;
  /** The set has not released: the eBay copy says nothing ships yet. */
  preRelease?: boolean;
}) {
  return (
    <PriceBoardView
      model={boardModel(offers, country, { page, ebayQuery })}
      productId={productId}
      country={country}
      page={page}
      now={Date.now()}
      title={title}
      noun={noun}
      id={id}
      slug={slug}
      name={name}
      preRelease={preRelease}
    />
  );
}
