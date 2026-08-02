import type { WorkbenchChatInput } from "./runtime-api";

export type RuntimeRoutingMode = NonNullable<WorkbenchChatInput["routingModeOverride"]>;

export type RoutingModeOption = {
  readonly value: RuntimeRoutingMode;
  readonly label: string;
  readonly detail: string;
  readonly guidance: string;
  readonly bestFor: string;
  readonly needsController: boolean;
};

export const ROUTING_MODE_OPTIONS: ReadonlyArray<RoutingModeOption> = [
  {
    value: "baseline",
    label: "Strategy A - Baseline",
    detail:
      "Fixed hybrid alias — predictable local + remote split. Deterministic and fast to reason about.",
    guidance: "none · fixed alias",
    bestFor: "predictable hybrid split",
    needsController: false,
  },
  {
    value: "controller",
    label: "Strategy B - Intelligent",
    detail: "Use controller-guided endpoint selection when the routing controller is available.",
    guidance: "controller-guided",
    bestFor: "live endpoint ranking",
    needsController: true,
  },
  {
    value: "difficulty",
    label: "Strategy C - Difficulty",
    detail: "Use difficulty-aware routing that matches the request to endpoint difficulty bounds.",
    guidance: "difficulty-aware",
    bestFor: "quality-bounded routing",
    needsController: false,
  },
  {
    value: "hybrid",
    label: "Hybrid",
    detail: "Blend controller guidance with difficulty-aware fallback behavior.",
    guidance: "controller + difficulty",
    bestFor: "guided hybrid fallback",
    needsController: true,
  },
] as const;

export function normalizeRoutingModeValue(
  value: string | null | undefined,
): RuntimeRoutingMode | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "baseline":
    case "basic":
    case "balanced":
    case "latency":
    case "quality":
    case "cost":
    case "low-latency":
    case "high-quality":
    case "low-cost":
    case "latency-first":
      return "baseline";
    case "controller":
    case "intelligent":
      return "controller";
    case "difficulty":
      return "difficulty";
    case "hybrid":
      return "hybrid";
    default:
      return null;
  }
}

export function formatRoutingModeLabel(value: string | null | undefined): string {
  const normalized = normalizeRoutingModeValue(value);
  if (!normalized) {
    return value?.trim().length ? value.trim() : "unset";
  }
  return ROUTING_MODE_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized;
}

export function describeRoutingMode(value: string | null | undefined): string | null {
  const normalized = normalizeRoutingModeValue(value);
  if (!normalized) {
    return null;
  }
  return ROUTING_MODE_OPTIONS.find((option) => option.value === normalized)?.detail ?? null;
}

export function formatExecutionModeAliasSegment(executionMode: string): string {
  return executionMode.trim().toLowerCase().replaceAll("_", "-");
}

export function formatDraftRoutingAlias(
  strategyValue: string | null,
  executionMode: string,
): string {
  const executionSegment = formatExecutionModeAliasSegment(executionMode);
  if (!strategyValue) {
    return `default.${executionSegment}`;
  }
  if (strategyValue.includes(".")) {
    return strategyValue;
  }
  return `${strategyValue}.${executionSegment}`;
}
