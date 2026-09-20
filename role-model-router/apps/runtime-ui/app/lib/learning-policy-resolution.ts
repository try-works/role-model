/**
 * Run 98 addendum 44 `A44-S4`: what the Configuration page says about policy provenance.
 *
 * The page renders the sidecar's stored document *and* the host's router resolution. When the router could
 * not use a valid policy source it serves the base route (stage `S0`) and the readback carries the bounded
 * degradation that says why. Presenting the stored version as if it were in effect is the defect this
 * module prevents, so the derivation lives here with tests rather than inline in the page.
 */

export interface PolicyDegradationView {
  readonly reason?: string | null;
  readonly detail?: string | null;
  readonly field?: string | null;
  readonly version?: string | null;
  readonly source?: string | null;
  readonly atMs?: number | null;
}

export interface RouterPolicyResolutionView {
  readonly stage?: string | null;
  readonly policyVersion?: number | null;
  readonly digest?: string | null;
  readonly source?: string | null;
  readonly degraded?: PolicyDegradationView | null;
}

export interface PolicyReadbackView {
  readonly policyVersion?: number | null;
  readonly digest?: string | null;
  readonly authoritative?: boolean | null;
  readonly degraded?: PolicyDegradationView | null;
  readonly routerResolution?: RouterPolicyResolutionView | null;
}

export interface PolicyResolutionSummary {
  /** True only when neither side of the boundary reported a degradation. */
  readonly authoritative: boolean;
  /** The stage the router is actually enforcing, when the runtime reported one. */
  readonly routerStage: string | null;
  readonly routerDigest: string | null;
  readonly routerSource: string | null;
  readonly storedPolicyVersion: number | null;
  readonly storedDigest: string | null;
  /** Bounded, human-readable degradation text; null when both sides are clean. */
  readonly warning: string | null;
}

const bounded = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const degradationText = (
  where: "router" | "readback",
  degradation: PolicyDegradationView,
): string => {
  const parts: string[] = [];
  parts.push(bounded(degradation.reason) ?? "policy_degraded");
  const named = bounded(degradation.field) ?? bounded(degradation.version);
  if (named) parts.push(`field/version: ${named}`);
  if (where === "router") parts.push("the router is serving the base route (stage S0)");
  const source = bounded(degradation.source);
  if (source) parts.push(`source: ${source}`);
  const detail = bounded(degradation.detail);
  return `${where === "router" ? "Router" : "Stored policy"} degraded — ${parts.join("; ")}${
    detail ? `. ${detail}` : ""
  }`;
};

export function summarizePolicyResolution(view: PolicyReadbackView | null | undefined): PolicyResolutionSummary {
  const router = view?.routerResolution ?? null;
  const routerDegradation = router?.degraded ?? null;
  const readbackDegradation = view?.degraded ?? null;
  const warnings: string[] = [];
  if (routerDegradation) warnings.push(degradationText("router", routerDegradation));
  if (readbackDegradation) warnings.push(degradationText("readback", readbackDegradation));
  return {
    authoritative:
      !routerDegradation && !readbackDegradation && (view?.authoritative ?? true) !== false,
    routerStage: bounded(router?.stage),
    routerDigest: bounded(router?.digest),
    routerSource: bounded(router?.source),
    storedPolicyVersion:
      typeof view?.policyVersion === "number" && Number.isFinite(view.policyVersion)
        ? view.policyVersion
        : null,
    storedDigest: bounded(view?.digest),
    warning: warnings.length > 0 ? warnings.join(" ") : null,
  };
}
