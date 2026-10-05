import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";

test("AC-R33-09 preserves every opaque provider-attempt ID in the runtime-observation bundle", async () => {
  const moduleImport = import(new URL("../src/index.js", import.meta.url).href);
  const runtimeObservability = (await moduleImport) as {
    createRuntimeObservationBundle(input: Record<string, unknown>): {
      executionSemantics: { providerAttemptIds?: readonly string[] };
    };
  };
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "ac-r33-09-provider-attempt-ids-"));
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "..",
  );
  const validation = await runRuntimeAdapterValidation({
    repoRoot,
    fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    runtimeStateRoot,
    scopeId: "ac-r33-09-provider-attempt-ids",
  });
  const providerAttemptIds = ["attempt:request-r33-09:primary", "attempt:request-r33-09:fallback"];
  const bundle = runtimeObservability.createRuntimeObservationBundle({
    decision: validation.decision,
    routingDiagnostics: validation.routingDiagnostics,
    retrievalReceipt: validation.retrievalReceipt,
    contextEnvelope: validation.contextEnvelope,
    execution: validation.execution,
    executionSemantics: { providerAttemptIds },
  });

  expect(bundle.executionSemantics.providerAttemptIds).toEqual(providerAttemptIds);
});
