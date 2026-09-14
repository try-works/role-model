import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createOwnedTrackBSidecarSpec } from "../src/track-b-runtime.js";

/**
 * Run 98 `R17` follow-up: the launcher must hand the runtime scope identity to the
 * owned Track B sidecar. The sidecar validates `x-role-model-{channel,scope,epoch}`
 * on every `/operator/*` route against the runtime scope it adopted, and the host
 * sends `scopeId`. Without the launcher argument the two identities can never
 * agree, so the Learning policy readback/change, activation, kill switch and
 * rollback routes all answer `operator_context_mismatch`.
 */

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

describe("run98 R17 owned Track B sidecar runtime scope", () => {
  test("passes the declared runtime scope to the launcher-owned sidecar", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-sidecar-runtime-scope-"));
    roots.push(stateRoot);
    const artifactPath = path.join(stateRoot, "scope-echo-sidecar.mjs");
    const source = [
      'import http from "node:http";',
      'const index = process.argv.indexOf("--runtime-scope");',
      'const runtimeScope = index >= 0 ? process.argv[index + 1] : null;',
      'if (!runtimeScope) { console.error("missing --runtime-scope"); process.exit(9); }',
      'const server = http.createServer((request, response) => {',
      '  response.setHeader("content-type", "application/json");',
      '  response.end(JSON.stringify({ runtimeScope, authorization: request.headers.authorization ?? null }));',
      "});",
      'server.listen(0, "127.0.0.1", () => {',
      "  const address = server.address();",
      '  process.stdout.write(JSON.stringify({ type: "ready", endpoint: `http://127.0.0.1:${address.port}`, scope: runtimeScope }) + "\\n");',
      "});",
      'process.on("SIGTERM", () => server.close(() => process.exit(0)));',
    ].join("\n");
    await writeFile(artifactPath, source, "utf8");

    const sidecar = createOwnedTrackBSidecarSpec({
      artifactPath,
      artifactSha256: createHash("sha256").update(source).digest("hex"),
      stateRoot,
      channel: "stage",
      runtimeScope: "standalone-runtime-stage",
    });
    const child = await sidecar.launch();
    try {
      const payload = (await (await fetch(child.endpoint)).json()) as { runtimeScope?: string };
      expect(payload.runtimeScope).toBe("standalone-runtime-stage");
      expect(child.operationsToken).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await child.stop();
    }
  });

  test("omits the runtime scope argument when the composition does not declare one", async () => {
    const stateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-sidecar-runtime-scope-none-"));
    roots.push(stateRoot);
    const artifactPath = path.join(stateRoot, "scope-absent-sidecar.mjs");
    const source = [
      'import http from "node:http";',
      "const server = http.createServer((_request, response) => {",
      '  response.setHeader("content-type", "application/json");',
      '  response.end(JSON.stringify({ argv: process.argv.slice(2) }));',
      "});",
      'server.listen(0, "127.0.0.1", () => {',
      "  const address = server.address();",
      '  process.stdout.write(JSON.stringify({ type: "ready", endpoint: `http://127.0.0.1:${address.port}` }) + "\\n");',
      "});",
      'process.on("SIGTERM", () => server.close(() => process.exit(0)));',
    ].join("\n");
    await writeFile(artifactPath, source, "utf8");

    const sidecar = createOwnedTrackBSidecarSpec({
      artifactPath,
      artifactSha256: createHash("sha256").update(source).digest("hex"),
      stateRoot,
      channel: "stage",
    });
    const child = await sidecar.launch();
    try {
      const payload = (await (await fetch(child.endpoint)).json()) as { argv?: string[] };
      expect(payload.argv ?? []).not.toContain("--runtime-scope");
    } finally {
      await child.stop();
    }
  });
});
