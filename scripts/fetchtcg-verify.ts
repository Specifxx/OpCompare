// temporary
import { readFileSync } from "node:fs";
const f = JSON.parse(readFileSync("data/fetch-live/au.json", "utf8")) as { cards: { s: string; no: string; n: string; f: string; c: string; p: number }[] };
for (const no of ["OP01-001", "OP01-016", "OP01-035"]) console.log(no, JSON.stringify(f.cards.filter((c) => c.no === no).map((c) => `${c.s}|${c.n}|${c.f}|${c.p}`)));
const sets = new Set(f.cards.map((c) => c.s)); console.log("sets", [...sets].slice(0, 8).join(" ;; "));
