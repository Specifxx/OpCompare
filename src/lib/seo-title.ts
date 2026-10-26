// Page titles that stay unique when a long name has to be shortened. A sealed
// product's name can run past a search result's width, and cutting its END made
// "Booster Pack", "Sleeved Booster Pack" and "Display" of one set share a title.
// The distinguishing words come last, so the middle is cut instead.
export const TITLE_MAX = 62;

/** `${name}${suffix}` when it fits, else the name with its middle cut so the start and the end both survive. */
export function fitTitle(name: string, suffix: string, max: number = TITLE_MAX): string {
  const full = `${name}${suffix}`;
  if (full.length <= max) return full;
  const budget = max - suffix.length - 1; // the "…"
  const head = Math.ceil(budget * 0.55);
  return `${name.slice(0, head).trimEnd()}…${name.slice(name.length - (budget - head)).trimStart()}${suffix}`;
}
