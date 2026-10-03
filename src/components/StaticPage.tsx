import { Breadcrumbs } from "./ui";

export function StaticPage({ title, crumb, children }: { title: string; crumb: string; children: React.ReactNode }) {
  return (
    <div className="container-app py-6">
      <Breadcrumbs items={[{ label: crumb }]} />
      <article className="prose-op max-w-3xl">
        <h1 className="mb-4 text-3xl text-white sm:text-4xl">{title}</h1>
        {children}
      </article>
    </div>
  );
}
