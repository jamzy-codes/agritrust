import Link from "next/link";
import { ArrowLeft, Construction, type LucideIcon } from "lucide-react";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export default function FeaturePlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: FeaturePlaceholderProps) {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-4 py-10 sm:px-8 lg:min-h-[calc(100vh-4rem)]">
      <section className="w-full max-w-xl rounded-2xl border border-agri-border bg-agri-surface p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-purple/15 text-accent-purple">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-accent-purple">
          {title}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-agri-text">
          This feature is still in development.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-agri-muted">
          {description}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-purple px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Dashboard
        </Link>
      </section>
    </div>
  );
}