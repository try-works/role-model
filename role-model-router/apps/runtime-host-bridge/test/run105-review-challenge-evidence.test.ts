import { createHash } from "node:crypto";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import ts from "typescript";
import { DatabaseSync } from "node:sqlite";
import { Effect, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";
import { makeQueueStoreLayer, resolveQueueStorePath } from "../src/queue-runtime/store.js";
import { resolveDurableReplayJobScope } from "../src/supervised-replay-handoff-recovery.js";
import { initializeSqliteMemory, persistRuntimeTelemetryFailure } from "@role-model-router/sqlite-memory";
import type { AutoReplayCapture } from "../src/track-b-auto-replay.js";
import type { RouteChallengeReadRequest, FinalizedRouteChallenge } from "../src/track-b-auto-replay-runtime.js";
type Row = Record<string, unknown>;
type PendingReader = (input: { request: { roleId: string; taskTypeId: string }; invoke: Invoke; readCapture: (id: string) => Promise<unknown>; readQueueJobs: () => Promise<unknown>; readQueueJob: (id: string) => Promise<unknown> }) => Promise<readonly { sourceType: "replay" | "queue"; replayJobId: string | null; queueJobId: string | null; dispatchRoundId?: string; captureRef: string; newEndpointId: string; againstEndpointId: string; createdAtMs: number; state: string }[] | null>;
let pendingReader: PendingReader | null;
let queueReads: { readQueueJobs(options: Row): unknown; readQueueJob(options: Row): unknown };
let actualReplayJob: Row;
type HistoryReader = (input: { runtimeStateRoot: string; scopeId: string; channel: string; request: { roleId: string; taskTypeId: string }; readCapture: (requestId: string) => Promise<unknown> }) => Promise<readonly AutoReplayCapture[] | null>;
interface RetentionService {
 recordRouteCapture(value: Row): Promise<Row>; readRouteCapture(value: Row): Promise<Row>;
 recordReplayDisposition(value: Row): Promise<unknown>; listPendingReplayCaptures(value: Row): Promise<{ pending: Row[] }>; close(): Promise<void>;
}
let history: HistoryReader | null;
let historyState: { runtimeStateRoot: string; scopeId: string; databasePath: string };
let retention: RetentionService;
let retainedCapture: Row;
const historicalId = "req-history-real";

type Invoke = (id: string, capability: string, value: Row) => Promise<unknown>;
type EnumerableReader = (input: { request: { roleId: string; taskTypeId: string; endpointId: string; sinceMs?: number }; invoke: Invoke; pageLimit?: number }) => Promise<readonly (FinalizedRouteChallenge & { captureRef: string; newEndpointId: string; againstEndpointId: string; judgeConfidence: number; endpointConfidence: number })[] | null>;
let enumerate: EnumerableReader | null;
type Reader = (input: { request: RouteChallengeReadRequest; invoke: Invoke; pageLimit?: number }) => Promise<FinalizedRouteChallenge | null>;
interface Trial { trialId: string; leaseId: string }
interface Core {
 registerScorerManifest(v: Row): unknown; createJob(v: Row): unknown; claimTrial(v: Row): Trial;
 submitTrialResult(v: Row): unknown; recordTrialScore(v: Row): unknown; finalizeComparisonGroup(v: Row): Row; close(): void;
}
interface EvaluationModule { EvaluationCore: new (v: Row) => Core; run(v: Row): Promise<unknown> }
interface ReplayModule { ReplayCore: new (v: Row) => { createJob(v: Row): Row }; run(v: Row): Promise<unknown> }
const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const privateRoot = process.env.ROLE_MODEL_INTERNAL_WORKTREE ?? path.resolve(publicRoot, "../../../role-model-internal/.worktrees", path.basename(publicRoot));
const request: RouteChallengeReadRequest = { roleId: "role:operator", taskTypeId: "task:summarize", captureRef: "capture-real", newEndpointId: "endpoint:new", againstEndpointId: "endpoint:source" };
const time = 1_700_000_111_111, groupId = "comparison:unrelated-to-capture";
const ref = (s: string) => "artifact:" + createHash("sha256").update(s).digest("hex");
let root: string, invoke: Invoke, reader: Reader | null, listed: Row, finalized: Row;
beforeAll(async () => {
 reader = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href).then((m: { readFinalizedRouteChallengeEvidence: Reader }) => m.readFinalizedRouteChallengeEvidence).catch(() => null);
 enumerate = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href).then((m: { readRouteDispatchEvidence: EnumerableReader }) => m.readRouteDispatchEvidence).catch(() => null);
 const evaluation = await import(/* @vite-ignore */ pathToFileURL(path.join(privateRoot, "extensions/evaluation-core/index.mjs")).href) as EvaluationModule;
 const replay = await import(/* @vite-ignore */ pathToFileURL(path.join(privateRoot, "extensions/replay-core/index.mjs")).href) as ReplayModule;
 root = await mkdtemp(path.join(os.tmpdir(), "run105-challenge-evidence-"));
 const scope = resolveDurableReplayJobScope({ runtimeStateRoot: root, scopeId: "operator-history", channel: "development" }), replayFile = path.join(root, "replay.json"), evaluationFile = path.join(root, "evaluation.sqlite");
 const replayCore = new replay.ReplayCore({ filePath: replayFile, channel: "development", authorizationEpoch: 1, eventLog: { resolveTraceRoot: () => ({ traceRootId: "trace:actual", scope, generation: 1, readiness: "ready", retentionState: "available", sharedPrefixRef: ref("prefix"), normalizedRequestRef: ref("request"), sourceDecisionId: "decision-" + request.captureRef, forkOccurrenceId: "occurrence:fork", policySnapshotRef: ref("policy"), capturePolicyRef: ref("capture-policy"), selectedEndpointId: request.againstEndpointId, eligibleEndpointIds: [request.againstEndpointId, request.newEndpointId] }), append: () => ({ sequence: 1 }) } });
 const job = replayCore.createJob({ idempotencyKey: "replay:actual", intent: "counterfactual_route", traceRootId: "trace:actual", scope, evaluationCriteriaDigest: "sha256:" + "b".repeat(64), candidatePackages: [{ endpointId: request.newEndpointId, providerId: "provider:test", modelId: "model:new", reasoningEffort: "high", promptAdapterId: "prompt:stable", toolPolicy: "deny", experiencePackId: "experience:none", samplingProfileId: "sampling:stable", reservedCostMicros: 1000, reservedBytes: 1024 }], budget: { maxCandidates: 1, maxProviderCalls: 1, maxCostMicros: 10000, maxBytes: 16384, deadlineMs: 600000 } });
 actualReplayJob = job;
 const caseIds = [0, 1].map(index => "replay:" + job.jobId + ":" + index);
 const comparability = { taskRef: ref("task"), inputRef: ref("input"), forkRef: ref("fork"), policyId: "run105:test", scorerSetVersion: "run105:test", toolPolicyDigest: ref("tools"), environmentDigest: ref("environment"), sourceEvidenceRef: ref("source-evidence"), counterfactualEvidenceRef: ref("new-evidence"), sourceOutcomeRef: ref("source-outcome"), counterfactualOutcomeRef: ref("new-outcome"), sourceCandidateRef: request.againstEndpointId, counterfactualCandidateRef: request.newEndpointId, roleId: request.roleId, taskTypeId: request.taskTypeId, effortComparability: [{ endpointId: request.newEndpointId, modelId: "model:new", sourceModelId: "model:source", reasoningEffort: "high", sourceReasoningEffort: "high", comparability: "matched" }] };
 const holdout = { holdoutId: "holdout:actual", membershipDigest: "sha256:" + createHash("sha256").update(JSON.stringify({ caseIds: [...caseIds].sort(), partition: "holdout" })).digest("hex"), partition: "holdout", caseIds };
 const core = new evaluation.EvaluationCore({ filePath: evaluationFile, channel: "development", scope, authorizationEpoch: 1, clock: () => time, artifactResolver: { resolve: (resolvedScope: string, reference: string) => ({ reference, scope: resolvedScope }) } });
 try {
  core.registerScorerManifest({ manifestVersion: 2, id: "run105:scorer", version: "1", digest: "sha256:" + "c".repeat(64), scorerSetVersion: "run105:test", algorithm: "exact_match", dimensions: ["correctness"], range: { min: 0, max: 1 }, direction: "higher_is_better", requiredInputs: ["outputRef"] });
  core.createJob({ id: "evaluation:actual", idempotencyKey: "evaluation:actual", evaluationSchemaVersion: 3, candidateRef: request.againstEndpointId, policyId: comparability.policyId, scorerSetVersion: comparability.scorerSetVersion, comparability, holdout, cases: caseIds.map((id, index) => ({ id, partition: "holdout", candidateRef: index === 0 ? request.againstEndpointId : request.newEndpointId, evidenceRef: ref("case-" + index), sourceGeneration: 0 })) });
  const trials = caseIds.map(() => core.claimTrial({ workerId: "runner:test", now: 1000, leaseMs: 100000 }));
  trials.forEach((trial, index) => {
   core.submitTrialResult({ trialId: trial.trialId, leaseId: trial.leaseId, workerId: "runner:test", now: 1100, outputRef: ref("output-" + index), outputDigest: "sha256:" + "d".repeat(64), stdoutRef: ref("stdout-" + index), stderrRef: ref("stderr-" + index), exitCode: 0, measurements: { measured: false, reason: "replay_runner_reports_no_timings" } });
   core.recordTrialScore({ trialId: trial.trialId, scorerId: "run105:scorer", scorerVersion: "1", dimension: "correctness", score: index === 0 ? 0.9 : 0.2, confidence: index === 0 ? 0.9 : 0.1, source: "deterministic" });
  });
  finalized = core.finalizeComparisonGroup({ groupId, trialIds: trials.map(t => t.trialId), comparability, holdout });
 } finally { core.close(); }
 invoke = async (id, capability, value) => {
  const envelope = { requestId: "authenticated:test", sessionId: "test", protocolVersion: "1.1.0", channel: "development", scope, authorizationEpoch: 1, evaluationAuthoritySecret: "test-authority", capability, value, filePath: id === "evaluation-core" ? evaluationFile : replayFile };
  return id === "evaluation-core" ? evaluation.run(envelope) : replay.run(envelope);
 };
 listed = (await invoke("evaluation-core", "evaluation:list-groups", { page: true, limit: 1 }) as { groups: Row[] }).groups[0];
});
beforeAll(async () => {
 pendingReader = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href).then((m: { readPendingRouteDispatches: PendingReader }) => m.readPendingRouteDispatches).catch(() => null);
 queueReads = await import(/* @vite-ignore */ pathToFileURL(path.join(privateRoot, "shared/queues/queue-readback.mjs")).href);
 history = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href).then((m: { readRouteReplayableCaptures: HistoryReader }) => m.readRouteReplayableCaptures).catch(() => null);
 const module = await import(/* @vite-ignore */ pathToFileURL(path.join(privateRoot, "scripts/track-b/runtime-operations-server.mjs")).href) as { createRuntimeRetentionService(options: Row): Promise<RetentionService> };
 const scopeId = "operator-history";
 historyState = { runtimeStateRoot: root, scopeId, ...initializeSqliteMemory({ runtimeStateRoot: root, scopeId, channel: "development" }) };
 retention = await module.createRuntimeRetentionService({ stateRoot: path.join(root, scopeId, "track-b"), channel: "development" });
 await retention.recordRouteCapture({ requestId: historicalId, routingDecisionId: "decision-" + historicalId, endpointId: request.againstEndpointId, modelId: "model:source", reasoningEffort: "high", effortSource: "variant", traceId: "trace-history-real", messages: [{ role: "user", content: "Summarize the actual retained request" }], outputText: "Actual recorded response", toolExecutions: [], classification: { roleId: request.roleId, taskTypeId: request.taskTypeId, taxonomyVersion: "taxonomy:1" } });
 await retention.recordRouteCapture({ requestId: request.captureRef, routingDecisionId: "decision-" + request.captureRef, endpointId: request.againstEndpointId, modelId: "model:source", reasoningEffort: "high", effortSource: "variant", traceId: "trace-capture-real", messages: [{ role: "user", content: "Actual replay source capture" }], outputText: "Actual source response", toolExecutions: [], classification: { roleId: request.roleId, taskTypeId: request.taskTypeId, taxonomyVersion: "taxonomy:1" } });
 retainedCapture = await retention.readRouteCapture({ requestId: historicalId });
 persistRuntimeTelemetryFailure({ databasePath: historyState.databasePath, requestId: historicalId, statusCode: 400, errorClass: "invalid_request", taxonomyRoleId: request.roleId, taxonomyTaskType: request.taskTypeId, requestClass: "live" });
 await retention.recordReplayDisposition({ captureRef: historicalId, policySetDigest: "actual-policy", outcome: "replayed", branches: 1, attempts: 1, policyId: "policy:actual", policyVersion: "1" });
});
afterAll(async () => {
 await retention?.close();
 if (root) await rm(root, { recursive: true, force: true }).catch(() => {});
}, 30000);
async function read(overrides: Partial<RouteChallengeReadRequest> = {}, replacement?: Invoke) {
 expect(reader, "the finalized evidence reader must exist").toBeTypeOf("function");
 return reader!({ request: { ...request, ...overrides }, invoke: replacement ?? invoke, pageLimit: 1 });
}
test("genuine finalize/list/read wrappers and real replay job yield actual winner and sibling time", async () => {
 expect(finalized.outcome).toBe("source"); expect(finalized).not.toHaveProperty("confidence"); expect(finalized).not.toHaveProperty("createdAtMs"); expect(listed.createdAtMs).toBe(time);
 expect(await read()).toMatchObject({ comparisonGroupId: groupId, finalizedAtMs: time, effortComparable: true, winnerEndpointId: request.againstEndpointId });
});
test.each([{ captureRef: "other" }, { roleId: "other" }, { taskTypeId: "other" }, { newEndpointId: "other" }])("no borrowing evidence for mismatched request %j", async mismatch => { expect(await read(mismatch)).toBeNull(); });
const mutate = (transform: (row: Row) => Row): Invoke => async (id, cap, value) => cap === "evaluation:list-groups" ? { groups: [transform(structuredClone(listed))], nextCursor: null, hasMore: false } : invoke(id, cap, value);
test("unknown sibling time stays pending despite fabricated result date", async () => { expect(await read({}, mutate(row => ({ ...row, createdAtMs: null, result: { ...finalized, finalizedAtMs: time } })))).toBeNull(); });
test("provider completion alone is not finalized evidence", async () => { expect(await read({}, async () => ({ terminal: true, branches: [{ endpointId: request.newEndpointId, outcome: "complete" }] }))).toBeNull(); });
test("mismatched listed winner cannot replace actual readback", async () => { expect(await read({}, mutate(row => ({ ...row, result: { ...finalized, winnerTrialId: "made-up" } })))).toBeNull(); });
test("unknown or mismatched effort remains pending", async () => {
 for (const effort of [undefined, [], [{ endpointId: request.newEndpointId, comparability: "mismatched" }]]) {
  const altered = { ...finalized, comparability: { ...(finalized.comparability as Row), effortComparability: effort } };
  const alteredInvoke: Invoke = async (id, cap, value) => cap === "evaluation:list-groups" ? { groups: [{ ...listed, comparability: altered.comparability, result: altered }], nextCursor: null, hasMore: false } : cap === "evaluation:read-comparison-group" ? altered : invoke(id, cap, value);
  expect(await read({}, alteredInvoke)).toBeNull();
 }
});
test("fresh cutoff never borrows a previous comparison", async () => { expect(await read({ sinceMs: time + 1 })).toBeNull(); });
test("real evidence behind a continuation page is reached", async () => {
 const cursors: unknown[] = [];
 const paged: Invoke = async (id, cap, value) => {
  if (cap !== "evaluation:list-groups") return invoke(id, cap, value);
  cursors.push(value.cursor);
  return value.cursor ? invoke(id, cap, { page: true, limit: 1 }) : { groups: [], nextCursor: "before-real", hasMore: true };
 };
 expect(await read({}, paged)).not.toBeNull(); expect(cursors).toEqual([undefined, "before-real"]);
});
test("cyclic or malformed pages are unavailable rather than claimed complete", async () => { expect(await read({}, async () => ({ groups: [listed], nextCursor: "cycle", hasMore: true }))).toBeNull(); });
test("enumerable durable evidence carries winning-member confidence and exact capture; cutoff refuses old evidence", async () => {
 expect(enumerate).toBeTypeOf("function");
 const req = { roleId: request.roleId, taskTypeId: request.taskTypeId, endpointId: request.newEndpointId };
 expect(await enumerate!({ request: req, invoke })).toEqual([{ comparisonGroupId: groupId, finalizedAtMs: time, effortComparable: true, winnerEndpointId: request.againstEndpointId, captureRef: request.captureRef, newEndpointId: request.newEndpointId, againstEndpointId: request.againstEndpointId, judgeConfidence: 0.9, endpointConfidence: 0.1 }]);
 expect(await enumerate!({ request: { ...req, sinceMs: time + 1 }, invoke })).toEqual([]);
 expect(await enumerate!({ request: req, invoke: async () => { throw new Error("auth refused"); } })).toBeNull();
});
test("execute production CLI callbacks over genuine evaluation/replay wrappers with auth envelope and transfer decode", async () => {
 const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
 const start = source.indexOf("        readFinalizedRouteChallenge: async (request) => {");
 const end = source.indexOf("        operations: sweepOperations,", start);
 expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
 const helper = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href);
 // Only the module-loader lexical seam is injected; callback bodies and actual capability records are real.
 const body = source.slice(start, end).replaceAll('import("./route-challenge-evidence.js")', "Promise.resolve(helper)");
 const js = ts.transpileModule("const callbacks = {" + body + "};", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 const envelopes: Row[] = [];
 const runtime = { invoke: async (id: string, envelope: Row) => { envelopes.push(envelope); return invoke(id, envelope.capability as string, envelope.value as Row); } };
 const run = new Function("extensionRuntimeRef", "resolveDurableEvaluationAuthority", "resolveDurableReplayJobScope", "decodeExternalizedOperatorReadback", "unwrapCapabilityPayload", "learnerSweepEnvelope", "options", "channel", "helper", js + "return callbacks;");
 const decodeCalls: Row[] = [];
 const callbacks = run({ current: runtime }, async () => ({ authoritySecret: "real-test-authority" }), () => "runtime:challenge-evidence", (v: Row) => { decodeCalls.push(v); return v.value; }, (v: unknown) => v,
  (v: Row) => ({ channel: "development", scope: v.scopeOverride ?? "operator:test", authorizationEpoch: 1, evaluationAuthoritySecret: v.evaluationAuthoritySecret, capability: v.capability, value: v.value }), { runtimeStateRoot: root, scopeId: "operator:test" }, "development", helper) as { readFinalizedRouteChallenge(req: RouteChallengeReadRequest): Promise<FinalizedRouteChallenge | null>; readRouteDispatchEvidence(req: { roleId: string; taskTypeId: string; endpointId: string }): Promise<unknown> };
 expect(await callbacks.readFinalizedRouteChallenge(request)).toMatchObject({ comparisonGroupId: groupId, winnerEndpointId: request.againstEndpointId, finalizedAtMs: time });
 expect(await callbacks.readRouteDispatchEvidence({ roleId: request.roleId, taskTypeId: request.taskTypeId, endpointId: request.newEndpointId })).toHaveLength(1);
 expect(envelopes.every(v => v.evaluationAuthoritySecret === "real-test-authority" && v.authorizationEpoch === 1)).toBe(true);
 expect(envelopes.find(v => v.capability === "replay:job")?.scope).toBe("runtime:challenge-evidence");
 expect(envelopes.find(v => v.capability === "evaluation:list-groups")?.scope).toBe("operator:test");
 expect(decodeCalls.every(v => v.stateRoot === root && v.scopeId === "operator:test")).toBe(true);
});
test("genuine retained terminal-disposition capture is enumerated from real live telemetry and exact capsule read", async () => {
 expect(history).toBeTypeOf("function");
 expect((await retention.listPendingReplayCaptures({ policySetDigest: "actual-policy" })).pending.some(capture => capture.captureRef === historicalId)).toBe(false);
 const captures = await history!({ ...historyState, channel: "development", request, readCapture: id => retention.readRouteCapture({ requestId: id }) });
 expect(captures).toHaveLength(1);
 expect(captures?.[0]).toMatchObject({ captureRef: historicalId, roleId: request.roleId, taskTypeId: request.taskTypeId, sourceEndpointId: request.againstEndpointId, hasRecordedToolResults: false });
 expect(captures?.[0]?.messages).toEqual(retainedCapture.messages);
});
test("history fails closed for wrong capsule scope/readiness/identity/classification and excludes replay output", async () => {
 expect(history).toBeTypeOf("function");
 for (const patch of [{ scope: "wrong" }, { requestId: "wrong" }, { classification: { roleId: "wrong", taskTypeId: request.taskTypeId } }, { trace: { ...(retainedCapture.trace as Row), readiness: "degraded" } }, { branchKind: "replay" }, { replaySource: null }]) {
  expect(await history!({ ...historyState, channel: "development", request, readCapture: async () => ({ ...retainedCapture, ...patch }) })).toEqual([]);
 }
 expect(await history!({ ...historyState, channel: "development", request, readCapture: async () => { throw new Error("auth unavailable"); } })).toBeNull();
});
test("history index unavailable and 501 matching ids are null, never a truncated complete corpus", async () => {
 expect(history).toBeTypeOf("function");
 expect(await history!({ runtimeStateRoot: path.join(root, "absent"), scopeId: historyState.scopeId, channel: "development", request, readCapture: async () => retainedCapture })).toBeNull();
 const db = new DatabaseSync(historyState.databasePath);
 try {
  for (let i = 0; i < 500; i++) persistRuntimeTelemetryFailure({ databasePath: historyState.databasePath, requestId: "req-overflow-" + i, statusCode: 400, errorClass: "invalid_request", taxonomyRoleId: request.roleId, taxonomyTaskType: request.taskTypeId, requestClass: "live" });
  let reads = 0;
  expect(await history!({ ...historyState, channel: "development", request, readCapture: async () => { reads++; return retainedCapture; } })).toBeNull();
  expect(reads).toBe(0);
 } finally { db.prepare("DELETE FROM runtime_telemetry_records WHERE request_id LIKE 'req-overflow-%'").run(); db.close(); }
});
test("CLI history callback must actually bind supported exact read operation", async () => {
 const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
 const loop = source.slice(source.indexOf("const loop = startAutoReplayLoop({"));
 expect(loop).toContain("readRouteReplayableCaptures:");
 const begin = source.indexOf("        readRouteReplayableCaptures: async (request) => {");
 const end = source.indexOf("        readFinalizedRouteChallenge:", begin);
 const helper = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href);
 const body = source.slice(begin, end).replaceAll('import("./route-challenge-evidence.js")', "Promise.resolve(helper)");
 const js = ts.transpileModule("const callbacks = {" + body + "};", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 const run = new Function("currentPostObservationOperations", "options", "channel", "helper", js + "return callbacks.readRouteReplayableCaptures;");
 const ids: string[] = [];
 const callback = run(() => ({ readLocalRouteCapture: async ({ requestId }: { requestId: string }) => { ids.push(requestId); return retention.readRouteCapture({ requestId }); } }), historyState, "development", helper) as (req: { roleId: string; taskTypeId: string }) => Promise<readonly AutoReplayCapture[] | null>;
 expect(await callback(request)).toHaveLength(1); expect(ids).toEqual([historicalId]);
 const unavailable = run(() => null, historyState, "development", helper) as typeof callback;
 expect(await unavailable(request)).toBeNull();
});
const pendingInput = () => ({ request, invoke, readCapture: async (id: string) => retention.readRouteCapture({ requestId: id }), readQueueJobs: async () => queueReads.readQueueJobs({ stateRoot: root, queueName: "replay.dispatch", limit: 500 }), readQueueJob: async (jobId: string) => queueReads.readQueueJob({ stateRoot: root, queueName: "replay.dispatch", jobId }) });
test("pending restart reads actual authenticated ReplayCore job plus complete real empty queue", async () => {
 expect(pendingReader).toBeTypeOf("function");
 await Effect.runPromise(Effect.gen(function* () { yield* PersistedQueue.make({ name: "replay.dispatch", schema: Schema.Struct({ captureRef: Schema.String, endpointIds: Schema.Array(Schema.String), policySetDigest: Schema.String }), maxAttempts: 1 }); }).pipe(Effect.provide(makeQueueStoreLayer({ filePath: resolveQueueStorePath({ stateRoot: root }) })), Effect.scoped));
 expect(await pendingReader!(pendingInput())).toEqual([{ sourceType: "replay", replayJobId: actualReplayJob.jobId, queueJobId: null, captureRef: request.captureRef, newEndpointId: request.newEndpointId, againstEndpointId: request.againstEndpointId, createdAtMs: actualReplayJob.createdAtMs, state: "queued" }]);
});
test("fresh queue store with no rows is a complete empty pending-dispatch projection", async () => {
 expect(pendingReader).toBeTypeOf("function");
 const value = await pendingReader!({ ...pendingInput(), invoke: async (_id, capability, _value) => capability === "replay:list-jobs" ? { value: [] } : invoke(_id, capability, _value), readQueueJobs: async () => ({ schemaVersion: "role-model.operator-queue-jobs.v1", available: false, reason: "queue store has no rows yet", jobs: [] }), readQueueJob: async () => ({ available: false, reason: "queue job not found" }) });
 expect(value).toEqual([]);
});

test("genuine pre-replay queue row preserves actual queue ID and never invents a replayJobId", async () => {
 expect(pendingReader).toBeTypeOf("function");
 await Effect.runPromise(Effect.gen(function* () {
  const queue = yield* PersistedQueue.make({ name: "replay.dispatch", schema: Schema.Struct({ captureRef: Schema.String, endpointIds: Schema.Array(Schema.String), policySetDigest: Schema.String, dispatchRoundId: Schema.String }), maxAttempts: 1 });
  yield* queue.offer({ captureRef: historicalId, endpointIds: [request.newEndpointId], policySetDigest: "actual-policy", dispatchRoundId: "round:actual-persisted" }, { id: historicalId });
 }).pipe(Effect.provide(makeQueueStoreLayer({ filePath: resolveQueueStorePath({ stateRoot: root }) })), Effect.scoped));
 const queueRecord = (queueReads.readQueueJob({ stateRoot: root, queueName: "replay.dispatch", jobId: historicalId }) as { job: { createdAt: string } }).job;
 const createdAtMs = Date.parse(queueRecord.createdAt.replace(" ", "T") + "Z");
 expect(await pendingReader!(pendingInput())).toEqual([
  { sourceType: "replay", replayJobId: actualReplayJob.jobId, queueJobId: null, captureRef: request.captureRef, newEndpointId: request.newEndpointId, againstEndpointId: request.againstEndpointId, createdAtMs: actualReplayJob.createdAtMs, state: "queued" },
  { sourceType: "queue", replayJobId: null, queueJobId: historicalId, dispatchRoundId: "round:actual-persisted", captureRef: historicalId, newEndpointId: request.newEndpointId, againstEndpointId: request.againstEndpointId, createdAtMs, state: "queued" },
 ]);
 expect(await pendingReader!({ ...pendingInput(), readQueueJobs: async () => ({ available: false, jobs: [] }) })).toBeNull();
 expect(await pendingReader!({ ...pendingInput(), readQueueJobs: async () => ({ available: true, jobs: Array.from({ length: 500 }, () => ({})) }) })).toBeNull();
});
test("execute fourth production callback against actual replay and pre-replay Effect queue records", async () => {
 expect(pendingReader).toBeTypeOf("function");
 const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
 const start = source.indexOf("        readPendingRouteDispatches: async (request) => {");
 const end = source.indexOf("        readRouteReplayableCaptures:", start);
 const helper = await import(/* @vite-ignore */ new URL("../src/route-challenge-evidence.js", import.meta.url).href);
 const body = source.slice(start, end).replaceAll('import("./route-challenge-evidence.js")', "Promise.resolve(helper)");
 const js = ts.transpileModule("const callbacks = {" + body + "};", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
 const envelopes: Row[] = [], ids: string[] = [];
 const runtime = { invoke: async (id: string, envelope: Row) => { envelopes.push(envelope); return invoke(id, envelope.capability as string, envelope.value as Row); } };
 const run = new Function("extensionRuntimeRef", "currentPostObservationOperations", "resolveDurableEvaluationAuthority", "resolveDurableReplayJobScope", "decodeExternalizedOperatorReadback", "unwrapCapabilityPayload", "learnerSweepEnvelope", "options", "channel", "helper", js + "return callbacks.readPendingRouteDispatches;");
 const callback = run({ current: runtime }, () => ({ readLocalRouteCapture: async ({ requestId }: { requestId: string }) => retention.readRouteCapture({ requestId }), readQueueJobs: async (name: string, query: Record<string, string>) => { expect(name).toBe("replay.dispatch"); expect(query.limit).toBe("500"); return pendingInput().readQueueJobs(); }, readQueueJob: async (name: string, id: string) => { expect(name).toBe("replay.dispatch"); ids.push(id); return pendingInput().readQueueJob(id); } }), async () => ({ authoritySecret: "pending-authority" }), () => actualReplayJob.scope, (v: Row) => v.value, (v: unknown) => v, (v: Row) => ({ scope: v.scopeOverride, authorizationEpoch: 1, capability: v.capability, value: v.value, evaluationAuthoritySecret: v.evaluationAuthoritySecret }), { runtimeStateRoot: root, scopeId: "operator-history" }, "development", helper) as (req: typeof request) => Promise<unknown>;
 expect(await callback(request)).toHaveLength(2); expect(ids).toEqual([historicalId]);
 expect(envelopes.every(envelope => envelope.scope === actualReplayJob.scope && envelope.evaluationAuthoritySecret === "pending-authority")).toBe(true);
});
test("exact same capture/pair with two genuine finalized groups uses explicit excluded group IDs, not arbitrary winner", async () => {
 const evaluation = await import(/* @vite-ignore */ pathToFileURL(path.join(privateRoot, "extensions/evaluation-core/index.mjs")).href) as EvaluationModule;
 const core = new evaluation.EvaluationCore({ filePath: path.join(root, "evaluation.sqlite"), channel: "development", scope: actualReplayJob.scope, authorizationEpoch: 1, clock: () => time + 100, artifactResolver: { resolve: (scope: string, reference: string) => ({ scope, reference }) } });
 try { core.finalizeComparisonGroup({ groupId: "comparison:fresh-second", trialIds: finalized.trialIds, comparability: finalized.comparability, holdout: finalized.holdout }); } finally { core.close(); }
 expect(await read()).toBeNull();
 expect(await read({ excludedComparisonGroupIds: [groupId] })).toMatchObject({ comparisonGroupId: "comparison:fresh-second", finalizedAtMs: time + 100 });
 expect(await read({ excludedComparisonGroupIds: [groupId, groupId] })).toBeNull();
});
test("CLI must bind pending restart to authenticated replay reads AND actual queue read authority", async () => {
 const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
 expect(source.slice(source.indexOf("const loop = startAutoReplayLoop({"))).toContain("readPendingRouteDispatches:");
});
test("CLI finalized and enumerable callbacks actually bind authenticated extension reads", async () => {
 const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
 const loop = source.slice(source.indexOf("const loop = startAutoReplayLoop({"));
 expect(loop).toContain("readFinalizedRouteChallenge:"); expect(loop).toContain("readRouteDispatchEvidence:");
 expect(loop).toContain("route-challenge-evidence.js"); expect(loop).toContain("evaluationAuthoritySecret: authority.authoritySecret");
});
