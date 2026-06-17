import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import {
  bodyTextClassName,
  cardClassName,
  codeBlockClassName,
  eyebrowClassName,
  largeValueClassName,
  mutedPanelClassName,
  raisedPanelClassName,
  sectionTitleClassName,
  utilityLabelClassName,
} from "../lib/design-system";

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
    <section className={cn(`${cardClassName} px-5 py-5 md:px-6 md:py-6`, className)}>
      <div className="mb-5">
        <h2 className={`text-[var(--rm-fg)] ${sectionTitleClassName}`}>{title}</h2>
        {description ? (
          <p className={`mt-2 max-w-[60ch] ${bodyTextClassName} text-[var(--rm-secondary)]`}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function RegistryDetailLayout({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] xl:items-start",
        className,
      )}
    >
      <div className="min-w-0 space-y-6">{primary}</div>
      <div className="min-w-0 space-y-6">{secondary}</div>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${raisedPanelClassName} p-5`}>
      <p className={eyebrowClassName}>{label}</p>
      <p className={`mt-4 text-[var(--rm-fg)] ${largeValueClassName}`}>{value}</p>
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
    <div
      className={cn(
        `${emphasis ? raisedPanelClassName : mutedPanelClassName} p-4 md:p-5`,
        className,
      )}
    >
      <p className={eyebrowClassName}>{label}</p>
      <p
        className={`mt-3 break-words tabular-nums text-[var(--rm-fg)] ${largeValueClassName}`}
      >
        {value}
      </p>
      {detail ? (
        <p className={`mt-2 max-w-[28ch] ${bodyTextClassName} text-[var(--rm-secondary)]`}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function TelemetryFactCard({
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
    <div
      className={cn(
        `${emphasis ? raisedPanelClassName : mutedPanelClassName} p-5 md:p-6`,
        className,
      )}
    >
      <p className={eyebrowClassName}>{label}</p>
      <p
        className={`mt-4 break-words tabular-nums text-[var(--rm-fg)] ${largeValueClassName}`}
      >
        {value}
      </p>
      {detail ? (
        <p className={`mt-3 max-w-[24ch] text-[var(--rm-secondary)] ${utilityLabelClassName}`}>
          {detail}
        </p>
      ) : null}
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
      ? "border-[color:var(--rm-accent-muted)] bg-transparent text-[var(--rm-accent)]"
      : tone === "warning"
        ? "border-[var(--rm-warning)] bg-transparent text-[var(--rm-warning)]"
        : tone === "success"
          ? "border-[var(--rm-success)] bg-transparent text-[var(--rm-success)]"
          : "border-[var(--rm-border)] bg-transparent text-[var(--rm-secondary)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--rm-radius-pill)] border px-3 py-1.5 text-[12px] font-normal uppercase tracking-[0.16em] leading-3",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p className={`${mutedPanelClassName} border-dashed p-6 text-sm text-[var(--rm-secondary)]`}>
      {label}
    </p>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <p className={`${mutedPanelClassName} border-dashed p-6 text-sm text-[var(--rm-secondary)]`}>
      {label}
    </p>
  );
}

export function ErrorState({ label }: { label: string }) {
  return (
    <p className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-error)] bg-[var(--rm-error-ghost)] p-6 text-sm text-[var(--rm-error)]">
      {label}
    </p>
  );
}

export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <pre className={cn(codeBlockClassName, className)}>{children}</pre>;
}

export function DisclosureSection({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={`${cardClassName} px-5 py-4 md:px-6`} open={defaultOpen ? true : undefined}>
      <summary
        className={`cursor-pointer list-none text-[var(--rm-fg)] marker:content-none [&::-webkit-details-marker]:hidden ${sectionTitleClassName}`}
      >
        {summary}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
