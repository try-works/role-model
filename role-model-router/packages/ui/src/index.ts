/**
 * @role-model/ui — role-model design system (React).
 *
 * Import: `import { PageShell, PageFilters, … } from "@role-model/ui"`
 * Deep: `@role-model/ui/<module>`
 * Specimens stay deep-import only (playground / visual review).
 */

export {
  Sidebar,
  SidebarModelInventory,
  SidebarCache,
  SidebarRouterEndpoint,
  MODEL_STATUS_DOT_CLASS,
  formatRequestCount,
  clampCacheHitRate,
  formatCacheHitRate,
  type SidebarModel,
  type SidebarNavItem,
  type SidebarIntegration,
  type ModelStatus,
  type SidebarProps,
} from "./sidebar";

export { Badge, type BadgeTone, type BadgeProps } from "./badge";

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
  chartCssVariableName,
  chartCssColorValue,
  type ChartConfig,
} from "./chart";

export {
  ChartCard,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardDescription,
  ChartCardPlot,
  ChartCardLegend,
  type ChartCardChrome,
  type ChartCardProps,
  type ChartLegendItem,
} from "./chart-card";

export {
  ChartGrid,
  ChartGridCell,
  useChartGridChrome,
  type ChartGridCellProps,
} from "./chart-grid";

export {
  TimeSeriesAreaChart,
  TimeSeriesLineChart,
  TimeSeriesBarChart,
  ChartCartesianGridLines,
  ChartTimeAxis,
  ChartValueAxis,
  ChartTimeTick,
  CHART_TIME_TICKS,
  CHART_TIME_BUCKETS,
  chartBarBucketCenter,
  chartBarSizeForPlotWidth,
  formatChartTimeTick,
  chartValueDomain,
  resolveSeriesColor,
  seriesToChartConfig,
  seriesNeedsDualY,
  type ChartSeries,
  type ChartSeriesYAxis,
  type ChartTimeHour,
  type TimeSeriesChartProps,
} from "./chart-time-series";

export {
  RankingBarChart,
  rankingPlotHeight,
  resolveRowColor,
  type RankingChartRow,
  type RankingBarChartProps,
} from "./chart-ranking";

export {
  CompositionChart,
  CompositionStrip,
  defaultRanks,
  totalValue,
  type CompositionSegment,
  type CompositionRankRow,
  type CompositionChartProps,
} from "./chart-composition";

export {
  PageFilters,
  FilterSelect,
  TimeRangeControl,
  DEFAULT_PAGE_TIME_RANGES,
  type PageFilterOption,
  type PageFilterField,
  type PageTimeRange,
  type PageFiltersProps,
  type TimeRangeControlProps,
} from "./page-filters";

export {
  SegmentedControl,
  type SegmentedControlOption,
  type SegmentedControlProps,
} from "./segmented-control";

export {
  MetricStrip,
  STUDIO_USAGE_METRICS,
  STUDIO_USAGE_METRICS_BADGE,
  type MetricItem,
  type MetricStripVariant,
  type MetricStripProps,
} from "./metric-strip";

export {
  SubPageHeaderBar,
  PageContent,
  PageShell,
  Rm3PageShell,
  type ThemeMode,
  type SubPageHeaderBarProps,
  type PageContentProps,
  type PageShellProps,
  type Rm3PageShellProps,
} from "./page-shell";

export {
  RuntimeOverview,
  OverviewFilters,
  groupOverviewChartRows,
  groupChartRows,
  OVERVIEW_TIME_RANGES,
  DEFAULT_OVERVIEW_NAV,
  type OverviewTimeRange,
  type OverviewFilterOption,
  type OverviewFiltersState,
  type RuntimeOverviewChartBlock,
  type RuntimeOverviewProps,
} from "./runtime-overview";

export {
  ObservePageNav,
  ObserveChartGrid,
  ObserveChartBlockView,
  OBSERVE_PAGE_OPTIONS,
  observeNavItems,
  groupObserveChartRows,
  type ObservePageId,
  type ObserveChartBlock,
} from "./observe-shared";

export {
  ObserveRequests,
  ObserveRequestsLedger,
  type ObserveRequestsFiltersState,
  type ObserveRequestLedgerRow,
  type ObserveRequestsProps,
} from "./observe-requests";

export {
  ObserveRouting,
  ObserveRoutingRail,
  type ObserveRoutingFiltersState,
  type ObserveRoutingRoleRow,
  type ObserveRoutingSliceSummary,
  type ObserveRoutingProps,
} from "./observe-routing";

export {
  ObserveActivity,
  type ObserveActivityEntry,
  type ObserveActivityCapture,
  type ObserveActivityProps,
} from "./observe-activity";

export {
  ObserveLogs,
  type ObserveLogRow,
  type ObserveLogsProps,
} from "./observe-logs";

export { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
