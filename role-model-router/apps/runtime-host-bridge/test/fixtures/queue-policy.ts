/**
 * Run 101 R3 (Phase 5 repair): the release staging now requires the private
 * distribution's queue policy beside the activation policy, exactly as run 99's
 * R23 required the activation policy. Packaging tests that build a minimal source
 * root need this document; keeping it in one place stops the three fixtures from
 * drifting apart.
 */
export const QUEUE_NAMES = [
  "replay.dispatch",
  "evaluation.score",
  "learner.derive",
  "learner.promote",
] as const;

export function queuePolicyFixture(): string {
  const parameters = {
    mode: "legacy",
    concurrency: 1,
    attempts: 3,
    backoffBaseMs: 1_000,
    backoffCapMs: 60_000,
    lockRefreshMs: 30_000,
    lockExpirationMs: 900_000,
    retentionDays: 30,
  };
  return JSON.stringify({
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: Object.fromEntries(QUEUE_NAMES.map((name) => [name, { ...parameters }])),
    updatedAt: null,
    receipts: [],
  });
}
