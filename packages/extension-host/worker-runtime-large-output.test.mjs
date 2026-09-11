import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { ExtensionHost } from "./index.mjs";

test("process extensions externalize oversized business output into a bounded durable receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-large-output-"));
  const fixture = path.join(root, "large-output.mjs");
  await writeFile(
    fixture,
    'export async function run() { return { marker: "large-output", body: "x".repeat(20 * 1024) }; }\n',
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion: "1.1.0",
    authorizationEpoch: 7,
    journalPath: path.join(root, "host.jsonl"),
  });
  try {
    await host.registerProcess(
      {
        id: "large-output-fixture",
        protocolVersion: "1.1.0",
        capabilities: ["fixture:large"],
      },
      pathToFileURL(fixture).href,
    );
    const result = await host.invoke("large-output-fixture", {
      requestId: "run96-large-output",
      protocolVersion: "1.1.0",
      authorizationEpoch: 7,
      channel: "development",
      scope: "run96",
      capability: "fixture:large",
      payload: { kind: "bounded-test" },
    });
    assert.equal(result.marker, undefined);
    assert.equal(result.body, undefined);
    assert.equal(result.businessOutput.body, undefined);
    assert.equal(result.businessOutput.transferState, "externalized");
    assert.ok(result.durableLocator.outputKey);
    assert.ok(result.durableLocator.byteLength > 16 * 1024);
    assert.ok(Buffer.byteLength(JSON.stringify(result), "utf8") <= 16 * 1024);
  } finally {
    await host.shutdown();
    await rm(root, { force: true, recursive: true });
  }
});

test("oversized health probes use the same bounded durable transfer path", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-large-health-"));
  const fixture = path.join(root, "large-health.mjs");
  await writeFile(
    fixture,
    'export async function run() { return { health: "oversized", detail: "y".repeat(20 * 1024) }; }\n',
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion: "1.1.0",
    authorizationEpoch: 7,
    journalPath: path.join(root, "host.jsonl"),
  });
  try {
    await host.registerProcess(
      {
        id: "large-health-fixture",
        protocolVersion: "1.1.0",
        capabilities: ["health:probe"],
      },
      pathToFileURL(fixture).href,
    );
    const result = await host.invoke("large-health-fixture", {
      requestId: "run96-large-health",
      protocolVersion: "1.1.0",
      authorizationEpoch: 7,
      channel: "development",
      scope: "run96",
      capability: "health:probe",
      payload: { kind: "bounded-health-test" },
    });
    assert.equal(result.businessOutput.transferState, "externalized");
    assert.ok(result.durableLocator.byteLength > 16 * 1024);
  } finally {
    await host.shutdown();
    await rm(root, { force: true, recursive: true });
  }
});

test("medium business output is externalized when the compatibility wrapper would exceed a frame", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "role-model-medium-output-"));
  const fixture = path.join(root, "medium-output.mjs");
  await writeFile(
    fixture,
    'export async function run() { return { marker: "medium-output", body: "z".repeat(9 * 1024) }; }\n',
    "utf8",
  );
  const host = new ExtensionHost({
    protocolVersion: "1.1.0",
    authorizationEpoch: 7,
    journalPath: path.join(root, "host.jsonl"),
  });
  try {
    await host.registerProcess(
      {
        id: "medium-output-fixture",
        protocolVersion: "1.1.0",
        capabilities: ["fixture:medium"],
      },
      pathToFileURL(fixture).href,
    );
    const result = await host.invoke("medium-output-fixture", {
      requestId: "run96-medium-output",
      protocolVersion: "1.1.0",
      authorizationEpoch: 7,
      channel: "development",
      scope: "run96",
      capability: "fixture:medium",
      payload: { kind: "wrapper-boundary-test" },
    });
    assert.equal(result.businessOutput.transferState, "externalized");
    assert.ok(result.durableLocator.byteLength < 16 * 1024);
  } finally {
    await host.shutdown();
    await rm(root, { force: true, recursive: true });
  }
});
