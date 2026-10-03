// Outbound scraping helpers, ported from RiftCompare's lib/scrape-http.ts:
// realistic browser UA + From header, a polite per-store delay, 429 backoff and
// a robots.txt check that fails OPEN (a parsing gap can never block a store
// that was working; it can only under-enforce).
import { CONTACT_EMAIL } from "./site";

export const SCRAPE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  From: CONTACT_EMAIL,
};

export const REQUEST_DELAY_MS = 300;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isRateLimited(res: Response): boolean {
  return res.status === 429;
}

export async function fetchWithTimeout(url: string, ms = 20000, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, headers: { ...SCRAPE_HEADERS, ...(init.headers as Record<string, string>) }, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetchWithTimeout(url);
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

interface RobotsRules {
  disallow: string[];
  allow: string[];
}
const robotsCache = new Map<string, Promise<RobotsRules | null>>();

async function fetchRobots(base: string): Promise<RobotsRules | null> {
  const text = await fetchText(`${base}/robots.txt`);
  if (!text) return null;
  const rules: RobotsRules = { disallow: [], allow: [] };
  let inWildcard = false;
  let sawWildcard = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      inWildcard = value === "*";
      if (inWildcard) sawWildcard = true;
      continue;
    }
    if (!inWildcard) continue;
    if (field === "disallow" && value) rules.disallow.push(value);
    if (field === "allow" && value) rules.allow.push(value);
  }
  return sawWildcard ? rules : null;
}

export async function robotsAllows(base: string): Promise<(path: string) => boolean> {
  let pending = robotsCache.get(base);
  if (!pending) {
    pending = fetchRobots(base);
    robotsCache.set(base, pending);
  }
  const rules = await pending;
  if (!rules) return () => true;
  return (path: string) => {
    const longest = (list: string[]) => list.filter((p) => path.startsWith(p)).sort((a, b) => b.length - a.length)[0];
    const dis = longest(rules.disallow);
    if (!dis) return true;
    const allow = longest(rules.allow);
    return !!allow && allow.length >= dis.length;
  };
}
