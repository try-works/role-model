/**
 * Run 99 R33 live finding (stage v146): the runtime forwarded a 2,340,111-byte prompt — 630,034
 * estimated tokens — to `deepseek…flash-max`. The router filters candidates whose *declared* context
 * is too small (`CONTEXT_TOO_SMALL`), but nothing checked the selected candidate at dispatch time, so
 * an oversized prompt reached a model that could not hold it and the overflow surfaced as a
 * provider/client error (`pi-ai detected context overflow`) instead of a clear runtime answer.
 *
 * The guard is deliberately conservative: it only refuses when the endpoint *declares* a finite
 * context window and the estimate exceeds it. An undeclared limit stays allowed, because inventing a
 * bound would silently shrink what the operator asked the runtime to accept.
 */
export const DISPATCH_CONTEXT_GUARD_CODE = "context_window_exceeded";

export interface DispatchContextAlternative {
  readonly endpointId: string;
  readonly modelId: string;
  readonly maxContextTokens: number;
}

export type DispatchContextGuardResult =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly code: typeof DISPATCH_CONTEXT_GUARD_CODE;
      readonly reason: string;
      readonly endpointId: string;
      readonly modelId: string;
      readonly estimatedContextTokens: number;
      readonly maxContextTokens: number;
      readonly reroute?: DispatchContextAlternative;
    };

export function evaluateDispatchContextGuard(input: {
  readonly estimatedContextTokens: number | null | undefined;
  readonly maxContextTokens: number | null | undefined;
  readonly modelId: string;
  readonly endpointId: string;
  readonly alternatives?: readonly DispatchContextAlternative[];
}): DispatchContextGuardResult {
  const estimated = Number.isFinite(input.estimatedContextTokens)
    ? Number(input.estimatedContextTokens)
    : 0;
  const limit = Number.isFinite(input.maxContextTokens) ? Number(input.maxContextTokens) : 0;
  if (limit <= 0 || estimated <= limit) return { allowed: true };
  const alternatives = Array.isArray(input.alternatives) ? input.alternatives : [];
  const reroute = alternatives
    .filter(
      (candidate) =>
        candidate.endpointId !== input.endpointId &&
        Number.isFinite(candidate.maxContextTokens) &&
        candidate.maxContextTokens >= estimated,
    )
    .sort((left, right) => left.maxContextTokens - right.maxContextTokens)[0];
  return {
    allowed: false,
    code: DISPATCH_CONTEXT_GUARD_CODE,
    reason: `the selected model cannot hold this prompt: ${estimated} estimated tokens against a declared context of ${limit}`,
    endpointId: input.endpointId,
    modelId: input.modelId,
    estimatedContextTokens: estimated,
    maxContextTokens: limit,
    ...(reroute
      ? {
          reroute: {
            endpointId: reroute.endpointId,
            modelId: reroute.modelId,
            maxContextTokens: reroute.maxContextTokens,
          },
        }
      : {}),
  };
}
