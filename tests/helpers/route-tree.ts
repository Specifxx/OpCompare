// The source files a route can execute, followed through its imports, and the
// dynamic Next APIs among them (tests/og.test.ts, tests/card-isr.test.ts). Not a
// test file itself (npm test globs tests/*.test.ts).
//
// Why: an ISR route stays cached only while nothing in its render reads the
// request. One cookies()/headers() read (getCountry() is one), one
// unstable_noStore(), one `cache: "no-store"` fetch or one force-dynamic export
// anywhere in the tree turns the whole route into a per-request render, and
// nothing fails: the page just stops being cached. This walks the static and
// dynamic imports from a route file (the "@/…" alias and relative paths; type-
// only imports are skipped, they never run) and reports every such use, so a
// dynamic read creeping into a cached route fails a test instead.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveSpec(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(from), spec);
  else return null; // a package: reported by name, not followed
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXTS) if (fs.existsSync(base + e)) return base + e;
  return null;
}

/** Comments out, so a sentence that NAMES an API (like this file's header) is not a use of it. */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

const IMPORT_RE = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

export interface RouteTree {
  /** Every src/ file the route can run, the entry first (repo-relative). */
  files: string[];
  /** Every package specifier imported somewhere in the tree. */
  packages: Set<string>;
}

export function routeTree(entry: string): RouteTree {
  const start = path.resolve(ROOT, entry);
  const seen = new Set<string>([start]);
  const queue = [start];
  const packages = new Set<string>();
  while (queue.length) {
    const file = queue.shift()!;
    const src = stripComments(fs.readFileSync(file, "utf8"));
    for (const m of src.matchAll(IMPORT_RE)) {
      if (m[2]) continue; // import type … / export type …
      const spec = m[3] ?? m[4];
      if (!spec) continue;
      const hit = resolveSpec(file, spec);
      if (!hit) {
        if (!spec.startsWith(".") && !spec.startsWith("@/")) packages.add(spec);
        continue;
      }
      if (!seen.has(hit)) {
        seen.add(hit);
        queue.push(hit);
      }
    }
  }
  return { files: [...seen].map((f) => path.relative(ROOT, f)), packages };
}

/** The dynamic-rendering APIs a cached route must never reach. */
const DYNAMIC_USES: [RegExp, string][] = [
  [/from\s+["']next\/headers["']|require\(\s*["']next\/headers["']\s*\)/, "imports next/headers (cookies()/headers())"],
  [/\bgetCountry\s*\(/, "calls getCountry() (the visitor's cookie and geo header)"],
  [/\b(?:unstable_)?noStore\s*\(/, "calls unstable_noStore()"],
  [/cache:\s*["']no-store["']/, 'fetches with cache: "no-store"'],
  [/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/, 'exports dynamic = "force-dynamic"'],
  [/export\s+const\s+revalidate\s*=\s*0\b/, "exports revalidate = 0"],
  [/\bdraftMode\s*\(/, "calls draftMode()"],
];

/**
 * Every dynamic API use in the route's tree, as "file: what". A "use client"
 * file is skipped: it runs in the browser (and on the server only to prerender
 * HTML, where it cannot reach next/headers), so its document.cookie reads are
 * the localisation this design relies on, not a server read.
 */
export function dynamicApiUses(tree: RouteTree): string[] {
  const out: string[] = [];
  for (const rel of tree.files) {
    const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (/^\s*["']use client["']/.test(stripComments(raw).trimStart())) continue;
    const src = stripComments(raw);
    for (const [re, what] of DYNAMIC_USES) if (re.test(src)) out.push(`${rel}: ${what}`);
  }
  if (tree.packages.has("next/headers")) out.push("the tree imports next/headers");
  return out;
}
