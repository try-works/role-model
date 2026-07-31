"use client";

import * as React from "react";

import {
  MetricStrip,
  type MetricStripVariant,
  STUDIO_USAGE_METRICS,
  STUDIO_USAGE_METRICS_BADGE,
} from "./metric-strip";

const VARIANTS: readonly {
  variant: MetricStripVariant;
  title: string;
  note: string;
  items?: typeof STUDIO_USAGE_METRICS;
}[] = [
  {
    variant: "inline",
    title: "inline · B",
    note: "Mono key/value row · Studio Chat default",
  },
  {
    variant: "inventory",
    title: "inventory · C",
    note: "Sidebar MODELS rows · label left / value right",
  },
  {
    variant: "badge",
    title: "badge · E",
    note: "Value-first pills",
    items: STUDIO_USAGE_METRICS_BADGE,
  },
  {
    variant: "panel",
    title: "panel · F",
    note: "Unified bordered strip · internal columns",
  },
];

/** Interactive MetricStrip fixtures for visual review and Paper sync. */
export function MetricStripSpecimensDemo() {
  return (
    <div className="flex flex-col gap-10 p-6">
      {VARIANTS.map(({ variant, title, note, items }) => (
        <section key={variant} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
              MetricStrip · {title}
            </h2>
            <p className="text-xs text-muted-foreground">{note}</p>
          </div>
          <MetricStrip variant={variant} items={items ?? STUDIO_USAGE_METRICS} aria-label="Usage" />
        </section>
      ))}
    </div>
  );
}
