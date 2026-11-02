import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { autoPreorderConfig, PreorderPage, preorderMetadata } from "@/components/PreorderPage";
import { getCatalog } from "@/lib/data";
import { PREORDER_PAGES, preorderPageRetired, setForPreorderSlug } from "@/lib/preorders";

// /preorders/<code>: the AUTOMATIC pre-order page (2026-11-02) for every
// upcoming booster, extra or premium set without a dedicated route
// (lib/preorders.ts AUTO_PREORDER_KINDS). Its config comes from the catalogue's
// set row (autoPreorderConfig), so a set TCGplayer lists tomorrow has a page
// tomorrow. A set with a dedicated route (PREORDER_PAGES) redirects there; one
// released more than RETIRE_AFTER_DAYS ago redirects to its set page.
// Six hours like every page buyers act on (it reads the visitor's market, so it
// renders per request anyway); nothing prerendered at build.
export const revalidate = 21600;

type Params = { params: { code: string } };

async function setFor(slug: string) {
  const cat = await getCatalog();
  const set = setForPreorderSlug(cat.sets, slug);
  if (!set) notFound();
  if (PREORDER_PAGES[set.code]) permanentRedirect(PREORDER_PAGES[set.code]);
  if (preorderPageRetired(set, new Date().toISOString().slice(0, 10))) permanentRedirect(`/sets/${set.slug}`);
  return set;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const set = await setFor(params.code);
  return preorderMetadata(autoPreorderConfig(set));
}

export default async function AutoPreorderPage({ params }: Params) {
  const set = await setFor(params.code);
  return <PreorderPage cfg={autoPreorderConfig(set)} />;
}
