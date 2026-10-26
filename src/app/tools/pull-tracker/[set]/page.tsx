import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageOg } from "@/lib/og/meta";
import { simSetData, simSets } from "../../pack-sim/load";
import { PullTrackerView, pullTrackerDescription, pullTrackerTitle } from "../view";

// /tools/pull-tracker/<set> — cached by Vercel's CDN like /tools/pack-sim/<set>
// (next.config.js CDN_PAGES), never ISR or prewarmed. A shared result rides in
// the #fragment, so every visitor gets this one cached render.
export const dynamic = "force-dynamic";

type Props = { params: { set: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bySlug } = await simSets();
  const s = bySlug.get(params.set);
  if (!s) return { title: "Set not found", robots: { index: false } };
  const path = `/tools/pull-tracker/${s.slug}`;
  return {
    title: { absolute: pullTrackerTitle(s) },
    description: pullTrackerDescription(s),
    alternates: { canonical: path },
    openGraph: pageOg(path, { title: `${s.code} Pull Tracker`, description: pullTrackerDescription(s) }),
  };
}

export default async function PullTrackerSetPage({ params }: Props) {
  const { sets, bySlug } = await simSets();
  if (!bySlug.has(params.set)) notFound();
  const path = `/tools/pull-tracker/${params.set}`;
  const data = await simSetData(params.set, path);
  if (!data) notFound();
  return <PullTrackerView sets={sets} set={data} path={path} />;
}
