import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Faq, JsonLd } from "@/components/ui";
import { breadcrumbLd, faqLd, itemListLd } from "@/lib/jsonld";
import { pageOg } from "@/lib/og/meta";
import { FREE_DEAL_ROWS } from "@/lib/plans";

// /tools — every OP Compare tool in one place (RiftCompare's /tools hub). The
// badges state who can use each tool, the same gating its own page applies:
// Deal Finder's full list is Plus (a free account sees the top rows), the
// Buy List Planner's store plan is Premium (a free account sees its total),
// and everything else needs no account.
export const metadata: Metadata = {
  title: "One Piece Card Game Tools & Calculators",
  description:
    "Every OP Compare tool: a free One Piece deck price calculator, box value, selling fees and market records, plus Deal Finder and the Buy List Planner for buying a whole list for less.",
  alternates: { canonical: "/tools" },
  openGraph: pageOg("/tools"),
};

type Badge = "Free" | "Plus" | "Premium";
interface Tool {
  href: string;
  title: string;
  desc: string;
  badge: Badge;
  note?: string;
}

const GROUPS: { label: string; tools: Tool[] }[] = [
  {
    label: "Buying & value",
    tools: [
      {
        href: "/tools/deal-finder",
        title: "Deal Finder",
        desc: "One Piece cards a store sells for less than TCGplayer's market price, in your currency, biggest saving first.",
        badge: "Plus",
        note: `Top ${FREE_DEAL_ROWS} free with an account`,
      },
      {
        href: "/tools/buy-list",
        title: "Buy List Planner",
        desc: "Paste a decklist or use your watchlist: the cheapest single store and the cheapest split across stores in your market, at the condition you want.",
        badge: "Premium",
        note: "Your total free with an account",
      },
      {
        href: "/market/records",
        title: "Market records",
        desc: "The biggest gaps between markets and the all-time price records, from the six markets OP Compare reads.",
        badge: "Free",
      },
    ],
  },
  {
    label: "Decks & sealed",
    tools: [
      {
        href: "/deck",
        title: "Deck price calculator",
        desc: "Paste any One Piece decklist and price every card at the cheapest in-stock store, with each printing, a total and a share link.",
        badge: "Free",
      },
      {
        href: "/tools/box-value",
        title: "Box value",
        desc: "Is a booster box worth opening? The box price beside the value of its set's cards, and how concentrated that value is.",
        badge: "Free",
      },
    ],
  },
  {
    label: "Selling",
    tools: [
      {
        href: "/tools/selling-fees",
        title: "Selling fee calculator",
        desc: "What you keep selling a One Piece card on TCGplayer, eBay or Cardmarket, after commission, processing and postage.",
        badge: "Free",
      },
    ],
  },
];

const FAQS = [
  {
    q: "Are the OP Compare tools free?",
    a: `Most of them. The deck price calculator, box value, selling fee calculator and market records need no account. Deal Finder shows nothing when you're signed out, the top ${FREE_DEAL_ROWS} deals with a free account, and every deal with Plus or Premium. The Buy List Planner shows any signed-in account its own total; which stores to buy from is part of Premium.`,
  },
  {
    q: "Which tool should I use to buy a whole One Piece deck?",
    a: "Start with the deck price calculator: paste the list and it prices every card at the cheapest in-stock store in your market, grouped by store. The Buy List Planner (Premium) adds the cheapest single-store orders and a minimum condition.",
  },
  {
    q: "Is a One Piece booster box worth opening?",
    a: "Use Box value: it puts a box's live price beside the value of its set's cards. Bandai does not publish pull rates, so it shows the facts you can check rather than a guessed expected value.",
  },
];

const BADGE_CLASS: Record<Badge, string> = {
  Free: "bg-brand-500/15 text-brand-300",
  Plus: "bg-slate-500/20 text-slate-200",
  Premium: "bg-gold/20 text-gold",
};

export default function ToolsHub() {
  const all = GROUPS.flatMap((g) => g.tools);
  return (
    <div className="mx-auto max-w-5xl">
      <JsonLd data={breadcrumbLd([{ name: "Tools", path: "/tools" }])} />
      <JsonLd data={itemListLd("OP Compare tools", "/tools", all.map((t) => ({ name: t.title, path: t.href })))} />
      <JsonLd data={faqLd(FAQS)} />
      <Breadcrumbs items={[{ label: "Tools" }]} />
      <h1 className="text-3xl text-white sm:text-4xl">Tools &amp; calculators</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-300">
        Every OP Compare tool in one place. Price a deck, check whether a box is worth opening, work out what you keep when you sell, and find the
        cheapest way to buy a list. Most need no sign-up; a free account adds the top Deal Finder deals and your Buy List total, Plus shows every deal
        with no ads, and <span className="text-gold">Premium</span> plans which stores to buy a whole list from.
      </p>
      {GROUPS.map((g) => (
        <section key={g.label} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{g.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.tools.map((t) => (
              <Link key={t.href} href={t.href} className="card-surface group flex flex-col gap-1 p-4 hover:border-ink-600">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white group-hover:text-brand-400">{t.title}</span>
                  <span className={`chip text-[10px] font-semibold ${BADGE_CLASS[t.badge]}`}>{t.badge}</span>
                </span>
                <span className="text-sm leading-relaxed text-slate-400">{t.desc}</span>
                {t.note ? <span className="text-xs text-slate-500">{t.note}</span> : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
      <section className="mt-10 max-w-3xl">
        <h2 className="mb-3 text-2xl text-white">Questions</h2>
        <Faq items={FAQS} />
      </section>
    </div>
  );
}
