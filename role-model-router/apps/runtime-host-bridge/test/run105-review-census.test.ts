import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
} from "@role-model-router/sqlite-memory";
import { selectFocusTask } from "@role-model-router/core";
const hostRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];
const nowMs = Date.UTC(2026, 9, 4),
  day = 86400000;
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function state(scopeId = "census-a") {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run105-census-"));
  roots.push(runtimeStateRoot);
  return {
    runtimeStateRoot,
    scopeId,
    ...initializeSqliteMemory({ runtimeStateRoot, scopeId, channel: "development" }),
  };
}
function seed(
  databasePath: string,
  requestId: string,
  roleId: string | null,
  taskTypeId: string | null,
  atMs = nowMs - day,
  requestClass = "live",
) {
  const clock = vi.spyOn(Date, "now").mockReturnValue(atMs);
  try {
    persistRuntimeTelemetryFailure({
      databasePath,
      requestId,
      statusCode: 400,
      errorClass: "invalid_request",
      taxonomyRoleId: roleId,
      taxonomyTaskType: taskTypeId,
      requestClass: requestClass as "live",
    });
  } finally {
    clock.mockRestore();
  }
}
// Execute the exact production CLI provider body, with only its enclosing lexical inputs injected.
async function census(
  input: { runtimeStateRoot: string; scopeId: string },
  rows: unknown[],
  configuredEndpointIds = ["current-a", "current-b"],
  days = 30,
) {
  const source = await readFile(path.join(hostRoot, "src/cli.ts"), "utf8");
  const begin = source.indexOf("        routeFocusCandidates: async () => {");
  const end = source.indexOf("        readRouteLadder:", begin);
  expect(begin).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(begin);
  const js = ts.transpileModule("const provider = {" + source.slice(begin, end) + "};", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulePath = "../src/route-ladder-census.ts";
  const helper = await import(/* @vite-ignore */ modulePath);
  const readRouteLadderCensus = helper.readRouteLadderCensus;
  const logs: unknown[][] = [];
  const report = vi.spyOn(console, "error").mockImplementation((...args) => {
    logs.push(args);
  });
  const run = new Function(
    "extensionRuntimeRef",
    "unwrapCapabilityPayload",
    "routeLadderEnvelopeFor",
    "options",
    "channel",
    "endpoints",
    "readRouteLearningDefaults",
    "resolveLearningPolicyStateRoot",
    "readRouteLadderCensus",
    js + "return provider.routeFocusCandidates();",
  );
  const clock = vi.spyOn(Date, "now").mockReturnValue(nowMs);
  try {
    const candidates = await run(
      { current: { invoke: async () => ({ ladders: rows, nextCursor: null }) } },
      (x: unknown) => x,
      (_cap: string, value: unknown) => value,
      { ...input, repoRoot: "." },
      "development",
      () => configuredEndpointIds,
      () => ({ routeLearning: { stalenessWindowDays: days } }),
      () => input.runtimeStateRoot,
      readRouteLadderCensus,
    );
    return { candidates, logs };
  } finally {
    clock.mockRestore();
    report.mockRestore();
  }
}
const ladder = (taskTypeId: string, rolledBack = false) => ({
  roleId: "writer",
  taskTypeId,
  version: 9,
  completeness: { admitted: 99, configured: 99 },
  rungs: [
    { endpointId: "current-a", status: "available" },
    { endpointId: "removed", status: "available" },
    { endpointId: "current-b", status: "unavailable" },
  ],
  rolledBack: { on: rolledBack },
});

describe("run105 R8 production census", () => {
  test("a saturated non-paginated ladder index degrades instead of treating omitted rollbacks as new tasks", async () => {
    const a = await state();
    const result = await census(
      a,
      Array.from({ length: 200 }, (_, i) => ladder("task-" + i)),
    );
    expect(result.candidates).toBeNull();
    expect(result.logs.length).toBeGreaterThan(0);
  });
  test("counts distinct classified live requests inside the window and unions no-ladder tasks", async () => {
    const a = await state();
    seed(a.databasePath, "a-1", "writer", "coder.review");
    seed(a.databasePath, "a-1", "writer", "coder.review");
    seed(a.databasePath, "a-2", "writer", "coder.review", nowMs - 30 * day, "live_request");
    seed(a.databasePath, "old", "writer", "coder.review", nowMs - 30 * day - 1);
    seed(a.databasePath, "future", "writer", "coder.review", nowMs + 1);
    for (const kind of [
      "replay",
      "evaluation",
      "judge",
      "synthetic",
      "benchmark",
      "probe",
      "unknown",
    ])
      seed(a.databasePath, kind, "writer", "coder.review", nowMs - day, kind);
    seed(a.databasePath, "missing-role", null, "coder.review");
    seed(a.databasePath, "missing-task", "writer", null);
    seed(a.databasePath, "new-1", "writer", "coder.explain");
    seed(a.databasePath, "exact", "Writer", "coder.Review");
    const result = await census(a, [ladder("coder.review"), ladder("never-observed")]);
    expect(result.candidates).toEqual([
      {
        roleId: "Writer",
        taskTypeId: "coder.Review",
        requestCount: 1,
        admitted: 0,
        configured: 2,
        rolledBack: false,
      },
      {
        roleId: "writer",
        taskTypeId: "coder.explain",
        requestCount: 1,
        admitted: 0,
        configured: 2,
        rolledBack: false,
      },
      {
        roleId: "writer",
        taskTypeId: "coder.review",
        requestCount: 2,
        admitted: 1,
        configured: 2,
        rolledBack: false,
      },
      {
        roleId: "writer",
        taskTypeId: "never-observed",
        requestCount: 0,
        admitted: 1,
        configured: 2,
        rolledBack: false,
      },
    ]);
    expect(selectFocusTask(result.candidates)?.taskTypeId).toBe("coder.review");
  });
  test("state roots and scopes isolate counts and honor a custom window", async () => {
    const a = await state();
    const b = await state("census-b");
    const otherScope = initializeSqliteMemory({
      runtimeStateRoot: a.runtimeStateRoot,
      scopeId: "other-scope",
      channel: "development",
    });
    seed(otherScope.databasePath, "other-1", "writer", "must-not-leak");
    seed(a.databasePath, "a-1", "writer", "coder.review", nowMs - 8 * day);
    seed(b.databasePath, "b-1", "writer", "coder.explain");
    expect((await census(a, [], [], 7)).candidates).toEqual([]);
    expect((await census(b, [], ["new-endpoint"])).candidates).toEqual([
      {
        roleId: "writer",
        taskTypeId: "coder.explain",
        requestCount: 1,
        admitted: 0,
        configured: 1,
        rolledBack: false,
      },
    ]);
  });
  test("rollback is excluded and volume precedes unfilled-gap tie breaks", async () => {
    const a = await state();
    for (let i = 0; i < 5; i++) seed(a.databasePath, "rollback-" + i, "writer", "rolled");
    seed(a.databasePath, "busy-1", "writer", "busy");
    seed(a.databasePath, "busy-2", "writer", "busy");
    seed(a.databasePath, "gap-1", "writer", "gap");
    expect(
      selectFocusTask((await census(a, [ladder("rolled", true), ladder("busy")])).candidates)
        ?.taskTypeId,
    ).toBe("busy");
    seed(a.databasePath, "gap-2", "writer", "gap");
    expect(
      selectFocusTask((await census(a, [ladder("rolled", true), ladder("busy")])).candidates)
        ?.taskTypeId,
    ).toBe("gap");
  });
  test("missing schema fails closed with explicit degradation and no fabricated zero counts", async () => {
    const a = await state();
    const db = new DatabaseSync(a.databasePath);
    db.exec("DROP TABLE runtime_telemetry_records");
    db.close();
    const result = await census(a, [ladder("coder.review")]);
    expect(result.candidates).toBeNull();
    expect(result.logs).toEqual([["[run105] route census degraded:schema_unavailable"]]);
  });
  test("missing database is explicit and a successful census leaves the database bytes unchanged", async () => {
    const a = await state();
    seed(a.databasePath, "readonly", "writer", "task");
    const before = await readFile(a.databasePath);
    await census(a, []);
    expect(await readFile(a.databasePath)).toEqual(before);
    const missing = await census({ ...a, scopeId: "absent" }, []);
    expect(missing.candidates).toBeNull();
    expect(missing.logs).toEqual([["[run105] route census degraded:database_unavailable"]]);
  });
});
