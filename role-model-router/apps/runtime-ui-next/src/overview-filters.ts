export const OVERVIEW_BREAKDOWNS = ["all", "endpoint", "model", "provider"] as const;
export type OverviewBreakdown = (typeof OVERVIEW_BREAKDOWNS)[number];
export const OVERVIEW_SOURCES = ["all", "local", "remote"] as const;
export type OverviewSource = (typeof OVERVIEW_SOURCES)[number];
export const OVERVIEW_STATUSES = ["all", "success", "failure", "unknown"] as const;
export type OverviewStatus = (typeof OVERVIEW_STATUSES)[number];
export const OVERVIEW_DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;
export type OverviewDifficulty = (typeof OVERVIEW_DIFFICULTIES)[number];

export interface OverviewFilters {
  readonly breakdown: OverviewBreakdown;
  readonly breakdownValue: string;
  readonly source: OverviewSource;
  readonly status: OverviewStatus;
  readonly difficulty: OverviewDifficulty;
}

export const DEFAULT_OVERVIEW_FILTERS: OverviewFilters = {
  breakdown: "all",
  breakdownValue: "",
  source: "all",
  status: "all",
  difficulty: "all",
};

export const overviewQuery = (filters: OverviewFilters, windowMs: number): string => {
  const params = new URLSearchParams();
  params.set("windowMs", String(windowMs));
  if (filters.source !== "all") params.set("sourceTypes", filters.source);
  if (filters.status !== "all") params.set("statusFamilies", filters.status);
  if (filters.difficulty !== "all") params.set("difficultyBuckets", filters.difficulty);
  if (filters.breakdown !== "all" && filters.breakdownValue.length > 0) {
    params.set(filters.breakdown === "endpoint" ? "endpointIds" : filters.breakdown === "model" ? "modelIds" : "providerIds", filters.breakdownValue);
  }
  return "?" + params.toString();
};

export const overviewSummary = (filters: OverviewFilters): string => {
  const parts = [
    "Source: " + (filters.source === "all" ? "all" : filters.source),
    "Status: " + (filters.status === "all" ? "all" : filters.status),
    "Difficulty: " + (filters.difficulty === "all" ? "all" : filters.difficulty),
    "Breakdown: " + (filters.breakdown === "all" ? "all" : filters.breakdown + (filters.breakdownValue === "" ? "" : "=" + filters.breakdownValue)),
  ];
  return parts.join(" · ");
};
