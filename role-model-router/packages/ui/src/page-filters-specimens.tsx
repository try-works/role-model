"use client";

import * as React from "react";

import {
  DEFAULT_PAGE_TIME_RANGES,
  type PageFilterField,
  PageFilters,
  type PageTimeRange,
} from "./page-filters";

const DEMO_FIELDS: PageFilterField[] = [
  {
    id: "breakdown",
    label: "Breakdown",
    value: "endpoint",
    options: [
      { value: "endpoint", label: "By endpoint" },
      { value: "model", label: "By model" },
    ],
  },
  {
    id: "source",
    label: "Source filter",
    value: "all",
    options: [
      { value: "all", label: "All sources" },
      { value: "local", label: "Local" },
      { value: "remote", label: "Remote" },
    ],
  },
  {
    id: "status",
    label: "Status",
    value: "all",
    options: [
      { value: "all", label: "All statuses" },
      { value: "ok", label: "OK" },
      { value: "error", label: "Error" },
    ],
  },
  {
    id: "difficulty",
    label: "Difficulty",
    value: "all",
    options: [
      { value: "all", label: "All buckets" },
      { value: "easy", label: "Easy" },
      { value: "hard", label: "Hard" },
    ],
  },
];

/** Interactive PageFilters fixtures for visual review and Paper sync. */
export function PageFiltersSpecimensDemo() {
  const [timeRange, setTimeRange] = React.useState<PageTimeRange>("week");
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(DEMO_FIELDS.map((f) => [f.id, f.value])),
  );

  const fields = DEMO_FIELDS.map((f) => ({
    ...f,
    value: fieldValues[f.id] ?? f.value,
  }));

  const onFieldChange = (id: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="flex w-full flex-col gap-10 bg-background p-6 text-foreground">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">PageFilters · full (overview-class)</h2>
        <p className="text-xs text-muted-foreground">
          Shared top filter bar: time range left, labeled selects right. Import from{" "}
          <code className="font-mono">@role-model/ui</code>.
        </p>
        <PageFilters
          timeRange={timeRange}
          timeRangeOptions={DEFAULT_PAGE_TIME_RANGES}
          onTimeRangeChange={setTimeRange}
          fields={fields}
          onFieldChange={onFieldChange}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">PageFilters · time range only</h2>
        <PageFilters timeRange={timeRange} onTimeRangeChange={setTimeRange} fields={[]} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">PageFilters · selects only</h2>
        <PageFilters fields={fields.slice(0, 2)} onFieldChange={onFieldChange} />
      </section>
    </div>
  );
}
