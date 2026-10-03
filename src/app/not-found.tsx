import Link from "next/link";
import { HatMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="container-app flex flex-col items-center py-24 text-center">
      <HatMark size={64} />
      <h1 className="mt-6 font-brand text-5xl font-normal text-white">Lost at sea</h1>
      <p className="mt-3 max-w-md text-slate-300">That page is not on our chart. The card or set may have been renamed, or the link is mistyped.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/browse" className="btn-primary">Search the card database</Link>
        <Link href="/" className="btn-ghost">Home</Link>
      </div>
    </div>
  );
}
