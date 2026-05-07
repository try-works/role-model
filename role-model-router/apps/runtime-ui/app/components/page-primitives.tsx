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
    <div className="grid gap-5 border-b border-[var(--rm-border)] pb-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="space-y-4">
        <div className="h-px w-10 bg-[var(--rm-accent)]" />
        {eyebrow ? <p className="text-xs font-normal uppercase tracking-[0.24em] text-[var(--rm-muted)]">{eyebrow}</p> : null}
        <div className="space-y-3">
          <h1 className="max-w-[16ch] text-balance text-3xl font-light tracking-tight text-[var(--rm-fg)] md:text-4xl">{title}</h1>
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)] md:text-[15px]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 xl:justify-end xl:self-end">{actions}</div> : null}
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
        `${cardClassName} px-5 py-5 md:px-6 md:py-6`,
        className,
      )}
    >
      <div className="mb-5 border-b border-[var(--rm-border)] pb-4">
        <div className="mb-3 h-px w-8 bg-[var(--rm-border-strong)]" />
        <h2 className="text-lg font-normal text-[var(--rm-fg)]">{title}</h2>
        {description ? <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">{description}</p> : null}
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

export function FactCard({
  label,
  value,
  detail,
  emphasis = false,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(`${emphasis ? raisedPanelClassName : mutedPanelClassName} p-4 md:p-5`, className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">{label}</p>
      <p className="mt-3 break-words text-xl font-light leading-snug tabular-nums text-[var(--rm-fg)] md:text-2xl">{value}</p>
      {detail ? <p className="mt-2 max-w-[28ch] text-sm leading-6 text-[var(--rm-secondary)]">{detail}</p> : null}
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
      ? "border-[color:var(--rm-accent-muted)] bg-[var(--rm-accent-ghost)] text-[var(--rm-accent)]"
      : tone === "warning"
        ? "border-[var(--rm-accent)] bg-[var(--rm-accent-subtle)] text-[var(--rm-accent)]"
        : tone === "success"
          ? "border-[color:var(--rm-accent-subtle)] bg-[var(--rm-accent-ghost)] text-[var(--rm-fg)]"
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
  return <p className="rounded-none border border-[var(--rm-accent)] bg-[var(--rm-accent-ghost)] p-6 text-sm text-[var(--rm-accent)]">{label}</p>;
}

export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <pre className={cn(codeBlockClassName, className)}>{children}</pre>;
}
