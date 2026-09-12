import type { ReplayLedger } from "./track-b-replay-ledger.js";
import {
  type ReplayPolicySet,
  type ReplayRefusalCode,
  type ReplayToolPolicy,
  decideReplayAdmission,
  resolveReplayToolPolicy,
  selectReplayCandidates,
} from "./track-b-replay-policy.js";

/**
 * Run 97 automatic replay producer.
 *
 * One bounded tick enumerates pending captures, applies the admission decision
 * table, selects candidates from the configured set, reserves budget, executes
 * supervised replay through the injected executor, records every dispatch in the
 * ledger, and reports a per-capture disposition plus a resumable cursor. The CLI
 * wires the real capture source and executor; tests drive it with fakes.
 */

export const DEFAULT_MAX_CAPTURES_PER_TICK = 8;

/**
 * Refusal codes that reflect runtime state which can change (configuration, budget
 * window, dependencies). These defer the capture so a later tick can replay it;
 * every other code is terminal for the budget window.
 */
const RETRYABLE_REPLAY_REFUSAL_CODES: ReadonlySet<string> = new Set([
  "replay_disabled_channel",
  "capture_unavailable",
  "no_distinct_candidate_configured",
  "budget_exhausted",
  "policy_unknown",
  "dependency_unavailable",
]);

export function retryableReplayRefusalCodes(): ReadonlySet<string> {
  return RETRYABLE_REPLAY_REFUSAL_CODES;
}

export interface AutoReplayCapture {
  readonly captureRef: string;
  readonly sourceEndpointId: string | null;
  readonly hasRecordedToolResults: boolean;
  readonly replayProduced?: boolean;
}

export interface AutoReplayBranch {
  readonly endpointId: string;
  readonly outcome: "complete" | "failed" | "refused";
}

export interface AutoReplayExecution {
  readonly terminal: boolean;
  readonly branches: readonly AutoReplayBranch[];
  /** Bounded, operator-visible reason when the executor could not reach a terminal state. */
  readonly failureDetail?: string;
  readonly dispatches?: readonly {
    readonly kind: "candidate" | "retry" | "derived";
    readonly endpointId: string;
    readonly attempt: number;
    readonly costMicros: number;
    readonly bytes: number;
    readonly outcome: "complete" | "failed" | "refused";
  }[];
}

export interface AutoReplayDisposition {
  readonly captureRef: string;
  readonly outcome: "replayed" | "refused" | "deferred";
  readonly code?: ReplayRefusalCode | "replay_failed";
  readonly detail?: string;
  readonly branches?: number;
}

export interface AutoReplayTickResult {
  readonly processed: number;
  readonly replayed: number;
  readonly refused: number;
  readonly deferred: number;
  readonly dispositions: readonly AutoReplayDisposition[];
  readonly cursor: string | null;
}

export async function runAutoReplayTick(input: {
  readonly captures: readonly AutoReplayCapture[];
  readonly configuredEndpointIds: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
  readonly ledger: ReplayLedger;
  readonly policySet: ReplayPolicySet;
  readonly executor: (input: {
    readonly capture: AutoReplayCapture;
    readonly candidates: readonly string[];
    readonly toolPolicy: ReplayToolPolicy;
    readonly policySet: ReplayPolicySet;
    readonly reservationId: string;
  }) => Promise<AutoReplayExecution>;
  readonly dispositionSink?: (disposition: AutoReplayDisposition) => void;
  readonly maxCapturesPerTick?: number;
  readonly startCursor?: string | null;
  readonly channelReplayEnabled?: boolean;
  readonly dependenciesAvailable?: boolean;
}): Promise<AutoReplayTickResult> {
  const maxCapturesPerTick = input.maxCapturesPerTick ?? DEFAULT_MAX_CAPTURES_PER_TICK;
  const dispositions: AutoReplayDisposition[] = [];
  const emit = (row: AutoReplayDisposition): void => {
    dispositions.push(row);
    input.dispositionSink?.(row);
  };

  let skipped = false;
  let pending = input.captures;
  if (input.startCursor) {
    const index = pending.findIndex((capture) => capture.captureRef === input.startCursor);
    if (index !== -1) {
      pending = pending.slice(index + 1);
    } else {
      skipped = true;
    }
  }
  if (skipped && pending.length === 0) pending = [];

  let processed = 0;
  let replayed = 0;
  let refused = 0;
  let deferred = 0;
  let cursor: string | null = input.startCursor ?? null;

  for (const capture of pending) {
    if (processed >= maxCapturesPerTick) break;
    processed += 1;
    cursor = capture.captureRef;

    const candidates = selectReplayCandidates({
      configuredEndpointIds: input.configuredEndpointIds,
      ...(input.healthyEndpointIds ? { healthyEndpointIds: input.healthyEndpointIds } : {}),
      sourceEndpointId: capture.sourceEndpointId,
    });
    const status = input.ledger.status();
    const admission = decideReplayAdmission({
      channelReplayEnabled: input.channelReplayEnabled ?? true,
      captureAvailable: true,
      scopeAuthorized: true,
      authorizationEpochValid: true,
      retentionReplayable: true,
      privacyReplayable: true,
      distinctCandidateCount: candidates.length,
      budgetAvailable: status.dispatches + status.reservedDispatches < status.dispatchLimit,
      alreadyProcessed: input.ledger.hasTerminalCounterfactual(
        capture.captureRef,
        input.policySet.policySetDigest,
      ),
      sourceIsReplayProduced: capture.replayProduced === true,
      policyIdsResolvable: true,
      dependenciesAvailable: input.dependenciesAvailable ?? true,
    });
    if (!admission.admitted) {
      const outcome = RETRYABLE_REPLAY_REFUSAL_CODES.has(admission.code) ? "deferred" : "refused";
      if (outcome === "deferred") deferred += 1;
      else refused += 1;
      emit({
        captureRef: capture.captureRef,
        outcome,
        code: admission.code,
        detail: admission.detail,
      });
      continue;
    }

    const reservation = input.ledger.reserve({
      captureRef: capture.captureRef,
      policySetDigest: input.policySet.policySetDigest,
      candidateDispatches: candidates.length,
    });
    if (!reservation.accepted) {
      const outcome = reservation.code === "budget_exhausted" ? "deferred" : "refused";
      if (outcome === "deferred") deferred += 1;
      else refused += 1;
      emit({
        captureRef: capture.captureRef,
        outcome,
        code: reservation.code,
        detail: reservation.detail,
      });
      continue;
    }

    const { toolPolicy } = resolveReplayToolPolicy({
      hasRecordedToolResults: capture.hasRecordedToolResults,
    });
    let execution: AutoReplayExecution;
    try {
      execution = await input.executor({
        capture,
        candidates,
        toolPolicy,
        policySet: input.policySet,
        reservationId: reservation.reservationId,
      });
    } catch (error) {
      input.ledger.release(reservation.reservationId);
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "replay_failed",
        detail: error instanceof Error ? error.message.slice(0, 200) : "replay execution failed",
      });
      continue;
    }

    const dispatches =
      execution.dispatches ??
      execution.branches.map((branch) => ({
        kind: "candidate" as const,
        endpointId: branch.endpointId,
        attempt: 1,
        costMicros: 0,
        bytes: 0,
        outcome: branch.outcome,
      }));
    let completedBranches = 0;
    for (const dispatch of dispatches) {
      const recorded = input.ledger.record({
        reservationId: reservation.reservationId,
        captureRef: capture.captureRef,
        policySetDigest: input.policySet.policySetDigest,
        counterfactualRef: `cf:${capture.captureRef}`,
        dispatchKind: dispatch.kind,
        candidateEndpointId: dispatch.endpointId,
        attempt: dispatch.attempt,
        costMicros: dispatch.costMicros,
        bytes: dispatch.bytes,
        outcome: dispatch.outcome,
      });
      if (recorded.accepted && dispatch.outcome === "complete") completedBranches += 1;
    }
    if (completedBranches === 0) {
      input.ledger.release(reservation.reservationId);
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "replay_failed",
        detail:
          execution.failureDetail ??
          (execution.terminal
            ? "no candidate branch completed"
            : "replay did not reach a terminal state"),
      });
      continue;
    }
    input.ledger.release(reservation.reservationId);
    replayed += 1;
    emit({
      captureRef: capture.captureRef,
      outcome: "replayed",
      branches: completedBranches,
    });
  }

  return { processed, replayed, refused, deferred, dispositions, cursor };
}
