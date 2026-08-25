import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-6">
      <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="max-w-md space-y-4 text-center">
        <p className="t-slate">Error 404</p>
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-fg">
          Nothing logged here.
        </h1>
        <p className="text-sm leading-relaxed text-fg-muted">
          That page either does not exist yet or never did. Most of JobOS is
          still ahead of us.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent transition-colors duration-200 ease-out hover:bg-accent-hover"
        >
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
