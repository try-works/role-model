"use client";

import * as React from "react";

import {
  ChartCard,
  ChartCardDescription,
  ChartCardHeader,
  ChartCardLegend,
  ChartCardPlot,
  ChartCardTitle,
} from "./chart-card";
import { resolveSeriesColor } from "./chart-time-series";
import { cn } from "./lib/utils";

/** One share segment in a composition strip (optional nested children). */
export type CompositionSegment = {
  key: string;
  label: string;
  value: number;
  /** CSS color or `var(--chart-*)`. Defaults to categorical chart tokens by index. */
  color?: string;
  children?: readonly CompositionSegment[];
};

/** Optional ranking row under the nest (top contributors). */
export type CompositionRankRow = {
  key: string;
  label: string;
  value: number;
  color?: string;
};

export type CompositionChartProps = {
  title: string;
  description?: string;
  segments: readonly CompositionSegment[];
  /** Ranking rows under the strip. Defaults to top segments by value (no children). */
  ranks?: readonly CompositionRankRow[];
  /** Max ranking rows when `ranks` omitted. Default 3. */
  topN?: number;
  valueLabel?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
  /** Show nested child strip when any segment has children. Default true. */
  showChildren?: boolean;
  /** Override ChartCard chrome; omit to inherit `ChartGrid` context. */
  chrome?: "standalone" | "cell";
};

function resolveSegmentColor(segment: CompositionSegment, index: number): string {
  return resolveSeriesColor(
    { key: segment.key, label: segment.label, color: segment.color },
    index,
  );
}

function totalValue(segments: readonly CompositionSegment[]): number {
  return segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
}

function defaultRanks(segments: readonly CompositionSegment[], topN: number): CompositionRankRow[] {
  const flat: CompositionRankRow[] = [];
  for (const [i, seg] of segments.entries()) {
    if (seg.children && seg.children.length > 0) {
      for (const [j, child] of seg.children.entries()) {
        flat.push({
          key: child.key,
          label: child.label,
          value: child.value,
          color: resolveSegmentColor(child, i * 8 + j + 1),
        });
      }
    } else {
      flat.push({
        key: seg.key,
        label: seg.label,
        value: seg.value,
        color: resolveSegmentColor(seg, i),
      });
    }
  }
  return [...flat].sort((a, b) => b.value - a.value).slice(0, topN);
}

function CompositionStrip({
  segments,
  height,
  radius,
}: {
  segments: readonly { key: string; value: number; color: string }[];
  height: number;
  radius: number;
}) {
  const total = totalValue(segments.map((s) => ({ ...s, label: s.key, key: s.key })));
  if (total <= 0) {
    return <div className="w-full bg-muted" style={{ height, borderRadius: radius }} />;
  }

  return (
    <div
      className="flex w-full flex-row gap-0.5 overflow-hidden"
      style={{ height, borderRadius: radius }}
    >
      {segments.map((seg) => (
        <div
          key={seg.key}
          className="h-full min-w-0 shrink-0"
          style={{
            width: `${(Math.max(0, seg.value) / total) * 100}%`,
            backgroundColor: seg.color,
          }}
          title={seg.key}
        />
      ))}
    </div>
  );
}

/**
 * Nested partition composition (parent share + optional child mix) with
 * compact ranking rows — for roles / capabilities / tools / tasks.
 */
function CompositionChart({
  title,
  description,
  segments,
  ranks: ranksProp,
  topN = 3,
  valueLabel = "share",
  className,
  valueFormatter = (v) => String(v),
  showChildren = true,
  chrome,
}: CompositionChartProps) {
  const parentTotal = totalValue(segments);
  const parentSegs = segments.map((seg, i) => ({
    key: seg.key,
    value: seg.value,
    color: resolveSegmentColor(seg, i),
    label: seg.label,
  }));

  const hasChildren = showChildren && segments.some((s) => (s.children?.length ?? 0) > 0);

  const childSegs = hasChildren
    ? segments.flatMap((seg, i) => {
        const kids = seg.children ?? [];
        if (kids.length === 0) {
          return [
            {
              key: `${seg.key}__self`,
              value: seg.value,
              color: resolveSegmentColor(seg, i),
            },
          ];
        }
        return kids.map((child, j) => ({
          key: child.key,
          value: child.value,
          color: resolveSegmentColor(child, i * 8 + j + 1),
        }));
      })
    : [];

  const ranks = ranksProp ?? defaultRanks(segments, topN);
  // Legend keys/colors match the primary (parent) strip only — never a
  // different dimension (e.g. roles on a capability chart). Nest children
  // are a secondary detail strip; put the chart’s subject in `segments`.
  const legendItems = parentSegs.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
  }));

  const maxRank = ranks.reduce((m, r) => Math.max(m, r.value), 0) || 1;

  return (
    <ChartCard className={className} chrome={chrome}>
      <ChartCardHeader>
        <ChartCardTitle>{title}</ChartCardTitle>
        {description ? <ChartCardDescription>{description}</ChartCardDescription> : null}
      </ChartCardHeader>
      <ChartCardPlot className="flex flex-col gap-3">
        <div className="flex w-full flex-col gap-0.5">
          <CompositionStrip segments={parentSegs} height={22} radius={5} />
          {hasChildren ? <CompositionStrip segments={childSegs} height={12} radius={3} /> : null}
        </div>
        {parentTotal > 0 ? <ChartCardLegend items={legendItems} className="pl-0" /> : null}
        {ranks.length > 0 ? (
          <div className="flex w-full flex-col border-t border-border">
            {ranks.map((row, i) => {
              const color = row.color ?? resolveSeriesColor({ key: row.key, label: row.label }, i);
              return (
                <div
                  key={row.key}
                  className={cn(
                    "flex h-9 items-center gap-2",
                    i < ranks.length - 1 && "border-b border-border",
                  )}
                >
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
                    {row.label}
                  </div>
                  <div className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {valueFormatter(row.value)}
                  </div>
                  <div className="h-1.5 w-[72px] shrink-0 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full"
                      style={{
                        width: `${(row.value / maxRank) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {ranks.length === 0 && valueLabel ? <div className="sr-only">{valueLabel}</div> : null}
      </ChartCardPlot>
    </ChartCard>
  );
}

export { CompositionChart, CompositionStrip, defaultRanks, totalValue };
