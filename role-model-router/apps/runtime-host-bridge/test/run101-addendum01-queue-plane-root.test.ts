/**
 * Run 101 addendum 01 - the host composes the queue plane on the queue state
 * root, so its policy document and its store are the ones the Track B sidecar
 * and the operator surface use.
 *
 * Measured live on `stage-rc-165e143f8092` (`:3457`): this composition passed
 * `options.runtimeStateRoot` (the base root, `<AppData>/role-model-runtime-stage`)
 * while the sidecar was launched with `<base>/<scopeId>/track-b`. The host's
 * policy lookup therefore missed the operator's document, fell back to the
 * shipped all-`legacy` document, and the replay plane stayed baseline while the
 * Learning page showed `mode: queue` - the cutover was invisible because the two
 * readers never looked at the same file.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveLearningPolicyStateRoot } from "../src/learning-policy-file.js";
import {
  LEGACY_QUEUE_POLICY_STATE_RELATIVE_PATH,
  QUEUE_POLICY_STATE_RELATIVE_PATH,
  readQueuePolicy,
  resolveQueuePolicyPaths,
  resolveQueueStateRoot,
} from "../src/queue-runtime/policy.js";
import { startReplayQueueRuntime } from "../src/queue-runtime/index.js";
import { QUEUE_STORE_RELATIVE_PATH, resolveQueueStorePath } from "../src/queue-runtime/store.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCOPE_ID = "standalone-runtime-stage";

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

function policyDocument(mode: string) {
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 4,
    global: { killSwitch: false },
    queues: {
      "replay.dispatch": {
        mode,
        concurrency: 1,
        attempts: 3,
        backoffBaseMs: 100,
        backoffCapMs: 1_000,
        lockRefreshMs: 1_000,
        lockExpirationMs: 5_000,
        retentionDays: 30,
      },
    },
    updatedAt: null,
    receipts: [],
  };
}

let runtimeStateRoot = "";
beforeEach(async () => {
  runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-add01-public-"));
});
afterEach(async () => {
  await rm(runtimeStateRoot, { recursive: true, force: true });
});

const scopeRoot = () => path.join(runtimeStateRoot, SCOPE_ID);
const trackBRoot = () => resolveLearningPolicyStateRoot({ runtimeStateRoot, scopeId: SCOPE_ID });

describe("@recursive:101-effect-mq-queue-rebuild @sp4 addendum01 queue plane root", () => {
  it("folds a track-b root back to its scope root and leaves a scope root alone", () => {
    expect(resolveQueueStateRoot(trackBRoot())).toBe(path.resolve(scopeRoot()));
    expect(resolveQueueStateRoot(scopeRoot())).toBe(path.resolve(scopeRoot()));
  });

  it("resolves one policy document and one store for both host forms", () => {
    const expectedPolicy = path.join(
      scopeRoot(),
      ...QUEUE_POLICY_STATE_RELATIVE_PATH.split("/"),
    );
    const expectedStore = path.join(scopeRoot(), ...QUEUE_STORE_RELATIVE_PATH.split("/"));
    for (const root of [scopeRoot(), trackBRoot()]) {
      const { stateFilePath } = resolveQueuePolicyPaths({ stateRoot: root });
      expect(stateFilePath).toBe(expectedPolicy);
      expect(resolveQueueStorePath({ stateRoot: root })).toBe(expectedStore);
    }
    expect(expectedStore.replaceAll("\\", "/")).toMatch(/track-b\/queues\/queues\.sqlite$/);
  });

  it("reads the operator's document at the canonical path and at the pre-repair path", async () => {
    const canonical = path.join(scopeRoot(), ...QUEUE_POLICY_STATE_RELATIVE_PATH.split("/"));
    await mkdir(path.dirname(canonical), { recursive: true });
    await writeFile(canonical, JSON.stringify(policyDocument("queue")), "utf8");
    expect(readQueuePolicy({ stateRoot: trackBRoot() }).queues["replay.dispatch"]?.mode).toBe("queue");

    // A state root that has not been migrated yet still resolves the operator's own
    // document rather than the shipped all-legacy fallback.
    await rm(canonical, { force: true });
    const legacy = path.join(scopeRoot(), ...LEGACY_QUEUE_POLICY_STATE_RELATIVE_PATH.split("/"));
    await mkdir(path.dirname(legacy), { recursive: true });
    await writeFile(legacy, JSON.stringify(policyDocument("shadow")), "utf8");
    expect(readQueuePolicy({ stateRoot: trackBRoot() }).queues["replay.dispatch"]?.mode).toBe(
      "shadow",
    );
    expect(readQueuePolicy({ stateRoot: scopeRoot() }).queues["replay.dispatch"]?.mode).toBe(
      "shadow",
    );
  });

  it("composes the replay plane on the operator's document and the shared store", async () => {
    const canonical = path.join(scopeRoot(), ...QUEUE_POLICY_STATE_RELATIVE_PATH.split("/"));
    await mkdir(path.dirname(canonical), { recursive: true });
    await writeFile(canonical, JSON.stringify(policyDocument("queue")), "utf8");

    const handled: string[] = [];
    const runtime = startReplayQueueRuntime({
      stateRoot: trackBRoot(),
      handler: async (job) => {
        handled.push(job.captureRef);
      },
    });
    expect(runtime.mode).toBe("queue");
    expect(runtime.worker).toBeDefined();
    await runtime.dispatchQueue?.offer({
      captureRef: "req-add01-public-1",
      endpointIds: ["endpoint-b"],
      policySetDigest: "d",
    });
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await runtime.stop();
    expect(handled).toContain("req-add01-public-1");
    expect(existsSync(resolveQueueStorePath({ stateRoot: trackBRoot() }))).toBe(true);
    expect(resolveQueueStorePath({ stateRoot: trackBRoot() })).toBe(
      resolveQueueStorePath({ stateRoot: scopeRoot() }),
    );
  });

  it("composes all four queue runtimes with the resolved queue state root", async () => {
    const cliSource = await readFile(
      path.join(repoRoot, "role-model-router", "apps", "runtime-host-bridge", "src", "cli.ts"),
      "utf8",
    );
    expect(cliSource).toMatch(/const queueStateRoot = resolveLearningPolicyStateRoot\(/);
    const queueStarts = [
      ...cliSource.matchAll(
        /(?:queueRuntime|evaluationQueueRuntime|learnerDeriveQueueRuntime|learnerPromoteQueueRuntime) = start(?:Replay|Evaluation|Learner)QueueRuntime\(\{[\s\S]{0,400}?stateRoot: ([A-Za-z.]+),/g,
      ),
    ];
    expect(queueStarts).toHaveLength(4);
    for (const [, stateRootExpression] of queueStarts) {
      expect(stateRootExpression).toBe("queueStateRoot");
    }
  });
});
