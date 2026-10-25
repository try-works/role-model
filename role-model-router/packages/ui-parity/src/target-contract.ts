/**
 * Pure target-identity guard for the runtime verification harness.
 *
 * This module performs no I/O. It cannot resolve real paths, inspect processes,
 * read files, or prove that an observation came from a live environment.
 * The adapter that collects an observation must resolve realpath identities and
 * verify the actual process, files, and served artifacts before this guard is
 * treated as useful evidence.
 *
 * Path comparison is deliberately platform-scoped: Windows roots are treated as
 * slash- and case-insensitive, while POSIX roots stay case-sensitive. Forbidden
 * roots exclude that boundary and its descendants, not similarly named siblings.
 * Only explicit caller entries are used. Symlinks and realpath aliases remain
 * the observing adapter's responsibility.
 */

import { posix, win32 } from "node:path";

export type TargetPlatform = "windows" | "posix";

export type BuildProvenance = "packaged" | "source_qa";

export type BuildMode = "packaged" | "source_qa";

export type HealthState = "ready" | "provisional" | "not_ready" | "unavailable";

export interface VerificationTargetIntent {
  readonly platform: TargetPlatform;
  readonly expectedClientHost: string;
  readonly expectedClientPort: number;
  readonly expectedArtifactSha256: string;
  readonly expectedSourceTree: string;
  readonly expectedPrivateDistribution: string;
  readonly expectedUiTree: string;
  readonly expectedPid: number;
  readonly expectedStateRoot: string;
  readonly expectedConfigRoot: string;
  readonly forbiddenRoots: readonly string[];
  readonly requirePackaged: boolean;
}

export interface VerificationTargetObservation {
  readonly clientUrl: string;
  readonly artifactSha256: string;
  readonly sourceTree: string;
  readonly privateDistribution: string;
  readonly uiTree: string;
  readonly pid: number;
  readonly stateRoot: string;
  readonly configRoot: string;
  readonly health: HealthState;
  readonly provenance: BuildProvenance;
  readonly buildMode: BuildMode;
}

export type TargetFindingCode =
  | "invalid_value"
  | "protected_port"
  | "non_loopback_host"
  | "client_host_mismatch"
  | "client_port_mismatch"
  | "artifact_sha_mismatch"
  | "source_tree_mismatch"
  | "private_distribution_mismatch"
  | "ui_tree_mismatch"
  | "pid_mismatch"
  | "state_root_mismatch"
  | "config_root_mismatch"
  | "forbidden_root"
  | "health_not_ready"
  | "packaged_artifact_required"
  | "build_mode_not_packaged";

export type TargetFindingField =
  | "intent.platform"
  | "intent.expectedClientHost"
  | "intent.expectedClientPort"
  | "intent.expectedArtifactSha256"
  | "intent.expectedSourceTree"
  | "intent.expectedPrivateDistribution"
  | "intent.expectedUiTree"
  | "intent.expectedPid"
  | "intent.expectedStateRoot"
  | "intent.expectedConfigRoot"
  | "intent.forbiddenRoots"
  | "intent.requirePackaged"
  | "observation.clientUrl"
  | "observation.clientUrl.host"
  | "observation.clientUrl.port"
  | "observation.artifactSha256"
  | "observation.sourceTree"
  | "observation.privateDistribution"
  | "observation.uiTree"
  | "observation.pid"
  | "observation.stateRoot"
  | "observation.configRoot"
  | "observation.health"
  | "observation.provenance"
  | "observation.buildMode";

export interface TargetFinding {
  readonly code: TargetFindingCode;
  readonly field: TargetFindingField;
}

export interface TargetValidationResult {
  readonly ok: boolean;
  readonly findings: readonly TargetFinding[];
}

export type VerificationStatus = "VERIFIED" | "NOT_RUN" | "FAILED";

export type VerificationOutcomeCode =
  | "target_contract_failed"
  | "execution_not_run"
  | "provider_missing"
  | "execution_failed"
  | "correlated_evidence_missing"
  | "correlated_evidence_invalid"
  | "pure_guard_pass_not_environment_verification"
  | "adapter_must_resolve_realpath_and_check_processes";

export interface VerificationOutcomeFinding {
  readonly code: VerificationOutcomeCode;
}

export interface VerificationOutcome {
  readonly status: VerificationStatus;
  readonly findings: readonly VerificationOutcomeFinding[];
}

export type VerificationExecutionState =
  | {
      readonly kind: "not_run";
      readonly reason: "missing_provider" | "missing_prerequisite" | "not_configured";
    }
  | { readonly kind: "executed"; readonly provider: "available" | "missing" }
  | { readonly kind: "failed" };

export type CorrelatedEvidenceState = "complete" | "missing" | "invalid";

const PROTECTED_PORTS: ReadonlySet<number> = new Set([3456, 3457, 3458]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isPort(value: number): boolean {
  return isPositiveInteger(value) && value <= 65535;
}

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function addFinding(
  findings: TargetFinding[],
  code: TargetFindingCode,
  field: TargetFindingField,
): void {
  findings.push({ code, field });
}

function stripTrailingSlash(value: string): string {
  if (/^[A-Za-z]:\/$/.test(value) || value === "/") {
    return value;
  }
  return value.replace(/\/+$/, "");
}

function canonicalRoot(value: string, platform: TargetPlatform): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }
  if (platform === "windows") {
    if (!/^[A-Za-z]:[\\/]/.test(value)) {
      return null;
    }
    return stripTrailingSlash(
      win32.normalize(value).replace(/\\/g, "/").toLowerCase(),
    );
  }
  if (!value.startsWith("/")) {
    return null;
  }
  return stripTrailingSlash(posix.normalize(value));
}

function canonicalHost(value: string): string {
  return value.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isLoopbackHost(value: string): boolean {
  const host = canonicalHost(value);
  if (host === "localhost" || host === "::1") {
    return true;
  }
  const parts = host.split(".");
  if (parts.length !== 4) {
    return false;
  }
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : -1));
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return false;
  }
  return octets[0] === 127;
}

interface ParsedClientUrl {
  readonly host: string;
  readonly port: number;
}

function parseClientUrl(value: string): ParsedClientUrl | null {
  if (!isNonEmptyString(value) || value.trim() !== value) {
    return null;
  }
  if (!/^https?:\/\//i.test(value)) {
    return null;
  }
  if (value.includes("?") || value.includes("#")) {
    return null;
  }
  // Reject raw syntax WHATWG URL parsing would otherwise erase.
  const authorityAndPath = value.slice(value.indexOf("://") + 3);
  const pathStart = authorityAndPath.indexOf("/");
  if (/[\s\\]/.test(value) || (pathStart !== -1 && authorityAndPath.slice(pathStart) !== "/")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  if (url.username !== "" || url.password !== "") {
    return null;
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    return null;
  }
  if (url.search !== "" || url.hash !== "") {
    return null;
  }
  if (url.port === "") {
    return null;
  }
  const port = Number(url.port);
  if (!isPort(port)) {
    return null;
  }
  return { host: canonicalHost(url.hostname), port };
}

function isForbiddenRoot(
  root: string,
  forbiddenRoots: readonly string[],
  platform: TargetPlatform,
): boolean {
  const canonical = canonicalRoot(root, platform);
  if (canonical === null) {
    return false;
  }
  return forbiddenRoots.some((forbidden) => {
    const boundary = canonicalRoot(forbidden, platform);
    if (boundary === null) return false;
    const prefix = boundary.endsWith("/") ? boundary : `${boundary}/`;
    return canonical === boundary || canonical.startsWith(prefix);
  });
}

/**
 * Compare an observed verification target with the explicit intent.
 *
 * An empty finding list means only that the supplied values are internally
 * consistent under this pure contract. It is not proof of a live environment.
 */
export function validateVerificationTarget(
  intent: VerificationTargetIntent,
  observation: VerificationTargetObservation,
): TargetValidationResult {
  const findings: TargetFinding[] = [];
  const platform = intent.platform;

  const expectedHost = canonicalHost(intent.expectedClientHost);
  const expectedHostValid =
    isNonEmptyString(intent.expectedClientHost) && isLoopbackHost(expectedHost);
  if (!isNonEmptyString(intent.expectedClientHost)) {
    addFinding(findings, "invalid_value", "intent.expectedClientHost");
  } else if (!isLoopbackHost(expectedHost)) {
    addFinding(findings, "non_loopback_host", "intent.expectedClientHost");
  }

  const expectedPortValid = isPort(intent.expectedClientPort);
  if (!expectedPortValid) {
    addFinding(findings, "invalid_value", "intent.expectedClientPort");
  } else if (PROTECTED_PORTS.has(intent.expectedClientPort)) {
    addFinding(findings, "protected_port", "intent.expectedClientPort");
  }

  const expectedShaValid = SHA256_PATTERN.test(intent.expectedArtifactSha256);
  if (!expectedShaValid) {
    addFinding(findings, "invalid_value", "intent.expectedArtifactSha256");
  }

  const expectedSourceTreeValid = isNonEmptyString(intent.expectedSourceTree);
  if (!expectedSourceTreeValid) {
    addFinding(findings, "invalid_value", "intent.expectedSourceTree");
  }
  const expectedPrivateValid = isNonEmptyString(intent.expectedPrivateDistribution);
  if (!expectedPrivateValid) {
    addFinding(findings, "invalid_value", "intent.expectedPrivateDistribution");
  }
  const expectedUiValid = isNonEmptyString(intent.expectedUiTree);
  if (!expectedUiValid) {
    addFinding(findings, "invalid_value", "intent.expectedUiTree");
  }

  const expectedPidValid = isPositiveInteger(intent.expectedPid);
  if (!expectedPidValid) {
    addFinding(findings, "invalid_value", "intent.expectedPid");
  }

  for (const forbidden of intent.forbiddenRoots) {
    if (canonicalRoot(forbidden, platform) === null) {
      addFinding(findings, "invalid_value", "intent.forbiddenRoots");
      break;
    }
  }

  const expectedStateRoot = canonicalRoot(intent.expectedStateRoot, platform);
  if (expectedStateRoot === null) {
    addFinding(findings, "invalid_value", "intent.expectedStateRoot");
  } else if (isForbiddenRoot(intent.expectedStateRoot, intent.forbiddenRoots, platform)) {
    addFinding(findings, "forbidden_root", "intent.expectedStateRoot");
  }

  const expectedConfigRoot = canonicalRoot(intent.expectedConfigRoot, platform);
  if (expectedConfigRoot === null) {
    addFinding(findings, "invalid_value", "intent.expectedConfigRoot");
  } else if (isForbiddenRoot(intent.expectedConfigRoot, intent.forbiddenRoots, platform)) {
    addFinding(findings, "forbidden_root", "intent.expectedConfigRoot");
  }

  const parsedClientUrl = parseClientUrl(observation.clientUrl);
  if (parsedClientUrl === null) {
    addFinding(findings, "invalid_value", "observation.clientUrl");
  } else {
    if (PROTECTED_PORTS.has(parsedClientUrl.port)) {
      addFinding(findings, "protected_port", "observation.clientUrl");
    } else if (expectedPortValid && parsedClientUrl.port !== intent.expectedClientPort) {
      addFinding(findings, "client_port_mismatch", "observation.clientUrl.port");
    }
    if (!isLoopbackHost(parsedClientUrl.host)) {
      addFinding(findings, "non_loopback_host", "observation.clientUrl");
    } else if (
      expectedHostValid &&
      parsedClientUrl.host !== expectedHost
    ) {
      addFinding(findings, "client_host_mismatch", "observation.clientUrl.host");
    }
  }

  const observedShaValid = SHA256_PATTERN.test(observation.artifactSha256);
  if (!observedShaValid) {
    addFinding(findings, "invalid_value", "observation.artifactSha256");
  } else if (
    expectedShaValid &&
    observation.artifactSha256.toLowerCase() !==
      intent.expectedArtifactSha256.toLowerCase()
  ) {
    addFinding(findings, "artifact_sha_mismatch", "observation.artifactSha256");
  }

  if (!isNonEmptyString(observation.sourceTree)) {
    addFinding(findings, "invalid_value", "observation.sourceTree");
  } else if (expectedSourceTreeValid && observation.sourceTree !== intent.expectedSourceTree) {
    addFinding(findings, "source_tree_mismatch", "observation.sourceTree");
  }

  if (!isNonEmptyString(observation.privateDistribution)) {
    addFinding(findings, "invalid_value", "observation.privateDistribution");
  } else if (
    expectedPrivateValid &&
    observation.privateDistribution !== intent.expectedPrivateDistribution
  ) {
    addFinding(
      findings,
      "private_distribution_mismatch",
      "observation.privateDistribution",
    );
  }

  if (!isNonEmptyString(observation.uiTree)) {
    addFinding(findings, "invalid_value", "observation.uiTree");
  } else if (expectedUiValid && observation.uiTree !== intent.expectedUiTree) {
    addFinding(findings, "ui_tree_mismatch", "observation.uiTree");
  }

  const observedPidValid = isPositiveInteger(observation.pid);
  if (!observedPidValid) {
    addFinding(findings, "invalid_value", "observation.pid");
  } else if (expectedPidValid && observation.pid !== intent.expectedPid) {
    addFinding(findings, "pid_mismatch", "observation.pid");
  }

  const observedStateRoot = canonicalRoot(observation.stateRoot, platform);
  if (observedStateRoot === null) {
    addFinding(findings, "invalid_value", "observation.stateRoot");
  } else if (isForbiddenRoot(observation.stateRoot, intent.forbiddenRoots, platform)) {
    addFinding(findings, "forbidden_root", "observation.stateRoot");
  } else if (
    expectedStateRoot !== null &&
    observedStateRoot !== expectedStateRoot
  ) {
    addFinding(findings, "state_root_mismatch", "observation.stateRoot");
  }

  const observedConfigRoot = canonicalRoot(observation.configRoot, platform);
  if (observedConfigRoot === null) {
    addFinding(findings, "invalid_value", "observation.configRoot");
  } else if (isForbiddenRoot(observation.configRoot, intent.forbiddenRoots, platform)) {
    addFinding(findings, "forbidden_root", "observation.configRoot");
  } else if (
    expectedConfigRoot !== null &&
    observedConfigRoot !== expectedConfigRoot
  ) {
    addFinding(findings, "config_root_mismatch", "observation.configRoot");
  }

  if (observation.health !== "ready") {
    addFinding(findings, "health_not_ready", "observation.health");
  }

  if (intent.requirePackaged && observation.provenance !== "packaged") {
    addFinding(findings, "packaged_artifact_required", "observation.provenance");
  }

  if (intent.requirePackaged && observation.buildMode !== "packaged") {
    addFinding(findings, "build_mode_not_packaged", "observation.buildMode");
  }

  return { ok: findings.length === 0, findings };
}

/**
 * Distinguish a pure guard pass from actual environment verification.
 *
 * A VERIFIED result means only that this pure contract passed. It always names
 * the unresolved adapter work: resolving real roots and checking the actual
 * process, files, and served artifacts.
 */
export function evaluateVerificationOutcome(
  targetFindings: readonly TargetFinding[],
  executionState: VerificationExecutionState,
  receiptCompleteness: CorrelatedEvidenceState,
): VerificationOutcome {
  if (targetFindings.length > 0) {
    return {
      status: "FAILED",
      findings: [{ code: "target_contract_failed" }],
    };
  }

  if (executionState.kind === "failed") {
    return {
      status: "FAILED",
      findings: [{ code: "execution_failed" }],
    };
  }

  if (receiptCompleteness === "invalid") {
    return {
      status: "FAILED",
      findings: [{ code: "correlated_evidence_invalid" }],
    };
  }

  if (executionState.kind === "not_run") {
    const findings: VerificationOutcomeFinding[] = [{ code: "execution_not_run" }];
    if (executionState.reason === "missing_provider") {
      findings.push({ code: "provider_missing" });
    }
    return { status: "NOT_RUN", findings };
  }

  if (executionState.provider === "missing") {
    return {
      status: "NOT_RUN",
      findings: [
        { code: "execution_not_run" },
        { code: "provider_missing" },
      ],
    };
  }

  if (receiptCompleteness === "missing") {
    return {
      status: "NOT_RUN",
      findings: [{ code: "correlated_evidence_missing" }],
    };
  }

  return {
    status: "VERIFIED",
    findings: [
      { code: "pure_guard_pass_not_environment_verification" },
      { code: "adapter_must_resolve_realpath_and_check_processes" },
    ],
  };
}


