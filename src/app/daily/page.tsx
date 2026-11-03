import type { Metadata } from "next";
import { getCatalog } from "@/lib/data";
import { cardImage } from "@/lib/images";
import { pageOg } from "@/lib/og/meta";
import { dayKey, upcomingPuzzles, type DailyCard } from "@/lib/daily";
import { DailyGame } from "./DailyGame";

// The daily Price Duel (lib/daily.ts; DECISIONS.md 2026-11-03). Real ISR like
// /tools/pack-sim: nothing here reads the visitor, prices are TCGplayer US
// market (USD, never converted), and the page carries a week of puzzles so
// the client switches to the next one at midnight UTC without a render.
export const revalidate = 86400;

const TITLE = "One Piece Price Duel: the Daily One Piece Card Price Game | OP Compare";
const DESCRIPTION =
  "Ten pairs of One Piece Card Game cards a day: pick the one worth more at TCGplayer market price. The same puzzle for everyone, keep your streak, share your score. Free, no account.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/daily" },
  openGraph: pageOg("/daily", { title: "One Piece Price Duel", description: "Which One Piece card is worth more? Ten pairs a day. Share your score." }),
};

export default async function DailyPage() {
  const cat = await getCatalog().catch(() => null);
  const cards: DailyCard[] = [];
  for (const c of cat?.cards ?? []) {
    if (!c.hasImage || c.marketUsd == null) continue;
    const set = cat!.setById.get(c.setId)?.name ?? "";
    if (/\btokens?\b|\bdon!!/i.test(`${set} ${c.cardType ?? ""}`)) continue;
    cards.push({ id: c.id, slug: c.slug, name: c.name, set, image: cardImage.tile(c.id), cents: Math.round(c.marketUsd * 100) });
  }
  const puzzles = upcomingPuzzles(cards, dayKey(new Date()));
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">One Piece Price Duel</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Ten pairs of cards. Tap the one worth more at TCGplayer&apos;s US market price. A new puzzle every day at midnight UTC, the same for everyone, so you can compare scores with your crew.
      </p>
      {puzzles.length ? <DailyGame puzzles={puzzles} game="One Piece" /> : <p className="mt-6 text-slate-400">Today&apos;s puzzle isn&apos;t ready yet. Check back soon.</p>}
    </div>
  );
}
