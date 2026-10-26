import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageOg } from "@/lib/og/meta";
import { simSetData, simSets } from "../load";
import { PackSimView, packSimDescription, packSimTitle } from "../view";

// /tools/pack-sim/<set> — one page per released booster set. Cached by Vercel's
// CDN, like /card/[slug] (next.config.js CDN_PAGES), never ISR and never
// prewarmed: nothing in this tree reads a cookie, a header or the session.
export const dynamic = "force-dynamic";

type Props = { params: { set: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bySlug } = await simSets();
  const s = bySlug.get(params.set);
  if (!s) return { title: "Set not found", robots: { index: false } };
  const path = `/tools/pack-sim/${s.slug}`;
  return {
    title: { absolute: packSimTitle(s) },
    description: packSimDescription(s),
    alternates: { canonical: path },
    openGraph: pageOg(path, { title: `${s.code} Pack Opening Simulator`, description: packSimDescription(s) }),
  };
}

export default async function PackSimSetPage({ params }: Props) {
  const { sets, bySlug } = await simSets();
  if (!bySlug.has(params.set)) notFound();
  const path = `/tools/pack-sim/${params.set}`;
  const data = await simSetData(params.set, path);
  if (!data) notFound();
  return <PackSimView sets={sets} set={data} path={path} />;
}
