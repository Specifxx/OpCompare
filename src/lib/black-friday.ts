// The Black Friday page (/black-friday): its dates and what it lists. Pure: tests/black-friday.test.ts.
//
// WHAT IT LISTS, AND WHAT IT NEVER SAYS. Sealed products whose cheapest US listing we track is under TCGplayer's
// market price today (US dollars on both sides, nothing converted), and the cheapest in-stock booster boxes in each
// market in its own currency. One URL kept every year, so links and rankings carry over. Never a "was" price, a
// countdown, "ends soon" or an invented sale: we only know what a listing asked when the prices were last read.

export function blackFriday(year: number): string {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstThursday = 1 + ((4 - first + 7) % 7);
  return `${year}-11-${String(firstThursday + 22).padStart(2, "0")}`;
}

/** Cyber Monday: three days after Black Friday. */
export function cyberMonday(year: number): string {
  return addDays(blackFriday(year), 3);
}

/** The season the page is about: this year's, or next year's once a week past Cyber Monday. */
export function seasonYear(today: string): number {
  const y = Number(today.slice(0, 4));
  return today > addDays(cyberMonday(y), 7) ? y + 1 : y;
}

/** Whether the homepage links the page: 1 November to a week after Cyber Monday. */
export function inSeason(today: string): boolean {
  const y = Number(today.slice(0, 4));
  return today >= `${y}-11-01` && today <= addDays(cyberMonday(y), 7);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Friday 27 November" */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export interface UnderRow { id: number; marketUsd: number | null; low: { US: number | null }; presale: boolean }

/** Sealed under TCGplayer market in the US: 5% to 60% under, products worth $10+, biggest saving first. */
export function underMarket<T extends UnderRow>(list: T[], limit = 30): (T & { saving: number })[] {
  const out: (T & { saving: number })[] = [];
  for (const s of list) {
    const m = s.marketUsd;
    const low = s.low.US;
    if (s.presale || m == null || low == null || m < 1000) continue;
    const saving = Math.round((1 - low / m) * 100);
    if (saving >= 5 && saving <= 60) out.push({ ...s, saving });
  }
  return out.sort((a, b) => b.saving - a.saving).slice(0, limit);
}
