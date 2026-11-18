"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usd } from "@/lib/format";
import { gradeMath, type GradeRow } from "@/lib/grade-math";

// The "Should I grade this?" calculator (lib/grade-math.ts). The rows are the
// /graded guide's US rows (live eBay PSA 10 / PSA 9 asking prices, TCGplayer raw
// market), passed in by the page. The grading cost is never pre-filled: graders
// change their tiers often, so the visitor types what they will actually pay.

const parseDollars = (s: string): number | null => {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return s.trim() && Number.isFinite(n) ? Math.round(n * 100) : null;
};

export function GradeCalculator({ rows }: { rows: GradeRow[] }) {
  const [q, setQ] = useState("");
  const [slug, setSlug] = useState(rows[0]?.slug ?? "");
  const [p10, setP10] = useState(50);
  const [cost, setCost] = useState("");

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? rows.filter((r) => `${r.name} ${r.number ?? ""} ${r.variant ?? ""}`.toLowerCase().includes(t)) : rows;
    return list.slice(0, 60);
  }, [q, rows]);
  const card = rows.find((r) => r.slug === slug) ?? matches[0];
  if (!card) return <p className="card-surface p-5 text-sm text-slate-400">No card has both a raw price and a live US PSA 10 listing right now.</p>;
  const r = gradeMath({ raw: card.raw, psa10: card.psa10, psa9: card.psa9, p10: p10 / 100, cost: parseDollars(cost) });

  return (
    <div className="card-surface p-5">
      <label className="block text-sm font-semibold text-slate-200" htmlFor="grade-q">Find your card</label>
      <input
        id="grade-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Name or number, e.g. Luffy or OP01-120"
        className="mt-1 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white"
      />
      <select
        aria-label="Card"
        value={card.slug}
        onChange={(e) => setSlug(e.target.value)}
        className="mt-2 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white"
      >
        {matches.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.name}{m.number ? ` · ${m.number}` : ""}{m.variant ? ` · ${m.variant}` : ""}
          </option>
        ))}
      </select>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg bg-ink-900 p-3"><dt className="text-xs text-slate-500">Raw (TCGplayer)</dt><dd className="num font-bold text-white">{usd(card.raw)}</dd></div>
        <div className="rounded-lg bg-ink-900 p-3"><dt className="text-xs text-slate-500">PSA 9 (eBay ask)</dt><dd className="num font-bold text-white">{card.psa9 != null ? usd(card.psa9) : "none listed"}</dd></div>
        <div className="rounded-lg bg-ink-900 p-3"><dt className="text-xs text-slate-500">PSA 10 (eBay ask)</dt><dd className="num font-bold text-white">{usd(card.psa10)}</dd></div>
      </dl>

      <label className="mt-5 block text-sm font-semibold text-slate-200" htmlFor="grade-p10">
        Your chance of a PSA 10: <span className="num text-brand-300">{p10}%</span>
      </label>
      <input id="grade-p10" type="range" min={0} max={100} step={5} value={p10} onChange={(e) => setP10(Number(e.target.value))} className="mt-1 w-full" />
      <p className="text-xs text-slate-500">Your own guess from the card&apos;s centring, corners and surface. A copy that misses is valued at PSA 9{card.psa9 == null ? " (none listed, so at the raw price)" : ""}.</p>

      <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="grade-cost">What grading costs you per card (fee + postage), US$</label>
      <input
        id="grade-cost"
        inputMode="decimal"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        placeholder="Type your grader's current fee"
        className="mt-1 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white"
      />

      <div className="mt-5 rounded-lg border border-ink-600 p-4 text-sm" aria-live="polite">
        <p className="text-slate-300">
          At {p10}% a graded copy averages <strong className="num text-white">{usd(r.expected)}</strong>, so grading pays only if it costs under{" "}
          <strong className="num text-white">{usd(Math.max(0, r.breakEven))}</strong> a card.
        </p>
        <p className="mt-2 text-base font-bold">
          {r.verdict === "grade" && <span className="text-emerald-400">Worth grading: about {usd(r.gain)} ahead on asking prices.</span>}
          {r.verdict === "keep-raw" && <span className="text-amber-300">Keep it raw: grading costs more than it adds ({usd(r.gain != null ? -r.gain : 0)} behind).</span>}
          {r.verdict === "need-cost" && <span className="text-slate-300">Type your grading cost to get a verdict.</span>}
          {r.verdict === "never" && <span className="text-amber-300">Keep it raw: at these odds the slab is not worth more than the raw card.</span>}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          eBay asking prices before eBay&apos;s fees and postage, not sale prices. Work out what you would keep with the{" "}
          <Link href="/tools/selling-fees" prefetch={false} className="text-brand-400 hover:underline">selling fee calculator</Link>.
        </p>
      </div>
      <p className="mt-3 text-xs">
        <Link href={`/card/${card.slug}`} prefetch={false} className="text-brand-400 hover:underline">See every store and graded listing for {card.name}</Link>
      </p>
    </div>
  );
}
