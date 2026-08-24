import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { createTrackBFileGraphStore } from "../src/track-b-runtime.js";

test("run94 graph capture: local fixture store writes and reads content-addressed bundles", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run94-local-graph-store-"));
  const store = createTrackBFileGraphStore({
    scopeId: "run94-local-graph",
    rootPath: root,
  });
  const content = JSON.stringify({ requestId: "req-run94-graph", payload: "rich" });
  const contentHash = `sha256:${createHash("sha256").update(content).digest("hex")}`;

  const artifact = store.write({
    scopeId: store.scopeId,
    sourceId: "req-run94-graph",
    content,
    contentHash,
  });

  expect(artifact.artifactId).toBeTruthy();
  expect(artifact.artifactPath).toContain(root);
  expect(store.read({ scopeId: store.scopeId, ...artifact })).toBe(content);
});
