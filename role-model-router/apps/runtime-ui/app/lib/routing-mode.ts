import type { WorkbenchChatInput } from "./runtime-api";

export type RuntimeRoutingMode = NonNullable<WorkbenchChatInput["routingModeOverride"]>;

export const ROUTING_MODE_OPTIONS: ReadonlyArray<{
  readonly value: RuntimeRoutingMode;
  readonly label: string;
  readonly detail: string;
}> = [
  {
    value: "baseline",
    label: "Strategy A - Baseline",
    detail: "Use the deterministic baseline route without controller or difficulty guidance.",
  },
  {
    value: "controller",
    label: "Strategy B - Intelligent",
    detail: "Use controller-guided endpoint selection when the routing controller is available.",
  },
  {
    value: "difficulty",
    label: "Strategy C - Difficulty",
    detail: "Use difficulty-aware routing that matches the request to endpoint difficulty bounds.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    detail: "Blend controller guidance with difficulty-aware fallback behavior.",
  },
] as const;

export function normalizeRoutingModeValue(value: string | null | undefined): RuntimeRoutingMode | null {
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
