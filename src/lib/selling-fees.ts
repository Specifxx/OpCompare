// The selling-fee calculator's maths and fee schedules (/tools/selling-fees),
// pure so tests/selling-fees.test.ts pins it. Ported from RiftCompare's
// lib/selling-fees.ts, with per-market schedules added.
//
// THE SCHEDULES ARE DATED AND SOURCED, and a rate we could not confirm from the
// marketplace's own page is left BLANK (commissionPct: null) rather than guessed
// — RiftCompare's rule: a stale or invented percentage is worse than asking the
// seller for theirs. Every field stays editable on the page.
//
// What each commission is charged ON: eBay's final value fee on the total the
// buyer pays (item + postage); TCGplayer's commission on the item price, its
// payment processing on item + postage.

export type CommissionBase = "item" | "itemPlusShipping";

export interface FeeInputs {
  /** Money in major units (dollars), as typed. */
  price: number;
  shipCharged: number;
  shipCost: number;
  /** null = not entered yet: no payout is shown. */
  commissionPct: number | null;
  commissionBase: CommissionBase;
  /** A cap on the commission per item (TCGplayer: $75). */
  commissionCap?: number | null;
  /** A lower rate above a threshold (eBay US: 2.35% above $7,500). */
  tier?: { above: number; pct: number } | null;
  processingPct: number;
  fixedFee: number;
  /** A higher fixed fee above an order total (eBay US: $0.40 over $10). */
  fixedFeeOver?: { above: number; fee: number } | null;
}

export interface FeeResult {
  totalCollected: number;
  shipCost: number;
  commissionBaseAmount: number;
  commission: number;
  processing: number;
  fixedFee: number;
  totalFees: number;
  net: number;
  /** Fees plus your own postage, as a share of the sale price. */
  effectiveFeePct: number;
  complete: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeFees(i: FeeInputs): FeeResult {
  const totalCollected = i.price + i.shipCharged;
  const base = i.commissionBase === "itemPlusShipping" ? totalCollected : i.price;
  const pct = i.commissionPct ?? 0;
  let commission = i.tier && base > i.tier.above ? (pct / 100) * i.tier.above + (i.tier.pct / 100) * (base - i.tier.above) : (pct / 100) * base;
  if (i.commissionCap != null && i.commissionCap > 0) commission = Math.min(commission, i.commissionCap);
  const fixedFee = i.fixedFeeOver && totalCollected > i.fixedFeeOver.above ? i.fixedFeeOver.fee : i.fixedFee;
  const processing = (i.processingPct / 100) * totalCollected;
  const totalFees = commission + processing + fixedFee;
  const net = totalCollected - totalFees - i.shipCost;
  return {
    totalCollected: round2(totalCollected),
    shipCost: round2(i.shipCost),
    commissionBaseAmount: round2(base),
    commission: round2(commission),
    processing: round2(processing),
    fixedFee: round2(fixedFee),
    totalFees: round2(totalFees),
    net: round2(net),
    effectiveFeePct: i.price > 0 ? ((totalFees + i.shipCost) / i.price) * 100 : 0,
    complete: i.commissionPct != null,
  };
}

/** A typed field as a number; blank or junk is null, never a silent 0. */
export function parseRate(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export interface FeeSchedule {
  id: string;
  label: string;
  /** The market whose currency the fixed amounts are in. */
  market: "US" | "AU" | "UK" | "SG" | "CA" | "EU";
  commissionPct: number | null;
  commissionBase: CommissionBase;
  commissionCap: number | null;
  tier: { above: number; pct: number } | null;
  processingPct: number;
  fixedFee: number;
  fixedFeeOver: { above: number; fee: number } | null;
  /** What the schedule says, in a sentence, and where it comes from. */
  note: string;
  source: { label: string; url: string };
  checked: string; // YYYY-MM-DD
}

export const FEES_CHECKED = "2026-10-03";

export const FEE_SCHEDULES: FeeSchedule[] = [
  {
    id: "tcgplayer",
    label: "TCGplayer",
    market: "US",
    commissionPct: 10.75,
    commissionBase: "item",
    commissionCap: 75,
    tier: null,
    processingPct: 2.5,
    fixedFee: 0.3,
    fixedFeeOver: null,
    note: "Standard marketplace seller: 10.75% commission on the item price (raised from 10.25% on 10 February 2026, capped at $75 per item), plus 2.5% + $0.30 payment processing on the item price and postage. Pro and Direct sellers pay different rates.",
    source: { label: "TCGplayer Help Center: Fees", url: "https://help.tcgplayer.com/hc/en-us/articles/201357836-Fees" },
    checked: FEES_CHECKED,
  },
  {
    id: "ebay-us",
    label: "eBay (US)",
    market: "US",
    commissionPct: 13.25,
    commissionBase: "itemPlusShipping",
    commissionCap: null,
    tier: { above: 7500, pct: 2.35 },
    processingPct: 0,
    fixedFee: 0.3,
    fixedFeeOver: { above: 10, fee: 0.4 },
    note: "Trading cards, no eBay Store: 13.25% final value fee on the whole sale (item, postage and tax) up to $7,500 and 2.35% above it, plus $0.30 per order ($0.40 over $10). Sales tax is not modelled here, so the real fee is slightly higher.",
    source: { label: "eBay: Selling fees", url: "https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822" },
    checked: FEES_CHECKED,
  },
  {
    id: "ebay-uk-private",
    label: "eBay UK (private seller)",
    market: "UK",
    commissionPct: 0,
    commissionBase: "itemPlusShipping",
    commissionCap: null,
    tier: null,
    processingPct: 0,
    fixedFee: 0,
    fixedFeeOver: null,
    note: "UK-based private sellers pay no final value fee or regulatory operating fee; listing fees (after the free monthly allowance) and international fees can still apply. Business sellers pay a final value fee: enter yours.",
    source: { label: "eBay UK: Selling fees for private sellers", url: "https://www.ebay.co.uk/help/selling/fees-credits-invoices/selling-fees-private-sellers?id=4822" },
    checked: FEES_CHECKED,
  },
  {
    id: "ebay-au",
    label: "eBay Australia",
    market: "AU",
    commissionPct: null,
    commissionBase: "itemPlusShipping",
    commissionCap: null,
    tier: null,
    processingPct: 0,
    fixedFee: 0.3,
    fixedFeeOver: null,
    note: "eBay Australia charges a final value fee on the item price plus postage, and $0.30 per order. Its fee page did not state the trading-card category's rate when we checked, so enter the rate from your Seller Hub.",
    source: { label: "eBay Australia: Selling fees", url: "https://www.ebay.com.au/help/selling/fees-credits-invoices/selling-fees?id=4822" },
    checked: FEES_CHECKED,
  },
  {
    id: "ebay-ca",
    label: "eBay Canada",
    market: "CA",
    commissionPct: null,
    commissionBase: "itemPlusShipping",
    commissionCap: null,
    tier: null,
    processingPct: 0,
    fixedFee: 0,
    fixedFeeOver: null,
    note: "eBay Canada charges a final value fee on the total sale. Enter the trading-card rate and per-order fee from your Seller Hub.",
    source: { label: "eBay Canada: Selling fees", url: "https://www.ebay.ca/help/selling/fees-credits-invoices/selling-fees?id=4822" },
    checked: FEES_CHECKED,
  },
  {
    id: "cardmarket",
    label: "Cardmarket",
    market: "EU",
    commissionPct: null,
    commissionBase: "item",
    commissionCap: null,
    tier: null,
    processingPct: 0,
    fixedFee: 0,
    fixedFeeOver: null,
    note: "Cardmarket takes a commission on each sale's item value, and its Trustee service adds a fee on some orders. We could not confirm the current rate from Cardmarket's own help pages, so enter the one shown in your account.",
    source: { label: "Cardmarket Help", url: "https://help.cardmarket.com/" },
    checked: FEES_CHECKED,
  },
  {
    id: "custom",
    label: "Another marketplace",
    market: "US",
    commissionPct: null,
    commissionBase: "item",
    commissionCap: null,
    tier: null,
    processingPct: 0,
    fixedFee: 0,
    fixedFeeOver: null,
    note: "Enter the marketplace's own commission, processing rate and per-order fee.",
    source: { label: "Your marketplace's fee page", url: "" },
    checked: FEES_CHECKED,
  },
];

/** The schedule a visitor starts on, by market. */
export function defaultScheduleFor(market: string): string {
  switch (market) {
    case "UK":
      return "ebay-uk-private";
    case "AU":
      return "ebay-au";
    case "CA":
      return "ebay-ca";
    case "EU":
      return "cardmarket";
    case "SG":
      return "custom";
    default:
      return "tcgplayer";
  }
}
