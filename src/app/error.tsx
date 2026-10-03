"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-app flex flex-col items-center py-24 text-center">
      <h1 className="font-brand text-4xl font-normal text-white">Rough seas</h1>
      <p className="mt-3 max-w-md text-slate-300">Prices could not be loaded just now. Try again in a moment.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Home</Link>
      </div>
    </div>
  );
}
