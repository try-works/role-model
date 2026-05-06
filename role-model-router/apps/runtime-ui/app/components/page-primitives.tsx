import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { cardClassName, codeBlockClassName, mutedPanelClassName, raisedPanelClassName } from "../lib/design-system";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="space-y-3">
        {eyebrow ? <p className="text-xs font-normal uppercase tracking-[0.24em] text-[var(--rm-muted)]">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-[var(--rm-fg)] md:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--rm-secondary)] md:text-[15px]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        `${cardClassName} p-5`,
        className,
      )}
    >
      <div className="mb-5 border-b border-[var(--rm-border)] pb-4">
        <h2 className="text-lg font-normal text-[var(--rm-fg)]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--rm-secondary)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${raisedPanelClassName} p-5`}>
      <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">{label}</p>
      <p className="mt-4 text-3xl font-light text-[var(--rm-fg)]">{value}</p>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "neutral" | "accent" | "warning" | "success";
  children: ReactNode;
}) {
  const toneClass =
    tone === "accent"
      ? "border-[var(--rm-accent)]/40 bg-[var(--rm-accent-subtle)] text-[var(--rm-accent)]"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[var(--rm-border)] bg-[var(--rm-bg)] text-[var(--rm-secondary)]";

  return (
    <span className={cn("inline-flex items-center rounded-none border px-2.5 py-1 text-xs font-medium tracking-[0.14em] uppercase", toneClass)}>
      {children}
    </span>
  );
}

export function LoadingState({ label }: { label: string }) {
  return <p className={`${mutedPanelClassName} border-dashed p-6 text-sm text-[var(--rm-secondary)]`}>{label}</p>;
}

export function EmptyState({ label }: { label: string }) {
  return <p className={`${mutedPanelClassName} border-dashed p-6 text-sm text-[var(--rm-secondary)]`}>{label}</p>;
}

export function ErrorState({ label }: { label: string }) {
  return <p className="rounded-none border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{label}</p>;
}

export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <pre className={cn(codeBlockClassName, className)}>{children}</pre>;
}
