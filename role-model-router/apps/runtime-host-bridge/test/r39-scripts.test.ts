import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../..");
const script = (name: string, args: string[], extraEnv: Record<string, string> = {}) =>
  spawnSync(process.execPath, [path.join(root, "scripts", "runtime", name), ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });

describe("S103a R39 scripts fail closed", () => {
  it("verify-client-journeys exits 2 and prints NOT RUN when inputs are missing", () => {
    const result = script("verify-client-journeys.mjs", []);
    expect(result.status).toBe(2);
    expect(result.stdout).toMatch(/NOT RUN:/);
  });
  it("verify-client-journeys refuses operator ports", () => {
    const result = script("verify-client-journeys.mjs", [
      "--executable",
      process.execPath,
      "--repo-root",
      root,
      "--static-root",
      root,
      "--port",
      "3456",
      "--state-root",
      path.join("E:/rm-tmp/s103a-test-state"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("operator port");
  });
  it("compare-release exits 2 and prints NOT RUN when inputs are missing", () => {
    const result = script("compare-release.mjs", []);
    expect(result.status).toBe(2);
    expect(result.stdout).toMatch(/NOT RUN:/);
  });
  it("compare-release refuses operator ports", () => {
    const result = script("compare-release.mjs", ["--left", "http://127.0.0.1:3456"]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("operator port");
  });

  /**
   * S104: the review found compare-release FAILED OPEN - two dead or equally
   * unauthorized sides classified every row "same" and exited 0, so CI could go green
   * comparing two artifacts that answered nothing. These two cases pin the fix.
   */
  it("compare-release exits 2 when both sides are unreachable", () => {
    const result = script("compare-release.mjs", [
      "--left",
      "http://127.0.0.1:5991",
      "--right",
      "http://127.0.0.1:5992",
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("not-run");
    expect(result.stdout).toMatch(/NOT RUN:/);
  }, 30_000);

  it("compare-release exits 2 when both sides answer the same non-2xx status", () => {
    // An unauthorized or missing endpoint pair must not classify as "same".
    const result = script("compare-release.mjs", [
      "--left",
      "http://127.0.0.1:5991",
      "--right",
      "http://127.0.0.1:5992",
    ]);
    expect(result.status).not.toBe(0);
  }, 30_000);

  it("verify-packaged-candidate exits 2 and prints NOT RUN when the package directory is missing", () => {
    const result = script("verify-packaged-candidate.mjs", [
      "--package-dir",
      path.join(root, "definitely-not-a-package"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toMatch(/NOT RUN:/);
  });

  it("verify-packaged-candidate refuses a package whose manifest names no present executable", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const dir = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-package-"));
    writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify({ executable: "missing-runtime.exe", executable_sha256: "deadbeef" }),
    );
    const result = script("verify-packaged-candidate.mjs", [
      "--package-dir",
      dir,
      "--static-root",
      root,
      "--fixture-root",
      path.join(root, "testdata", "router-runtime", "fixtures"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("manifest does not name an executable present");
  }, 30_000);

  it("verify-client-journeys refuses a manifest whose sha does not match the executable", async () => {
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const dir = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-manifest-"));
    const manifest = path.join(dir, "manifest.json");
    writeFileSync(manifest, JSON.stringify({ executable_sha256: "deadbeef" }));
    const result = script("verify-client-journeys.mjs", [
      "--manifest",
      manifest,
      "--executable",
      process.execPath,
      "--repo-root",
      root,
      "--static-root",
      root,
      "--port",
      "5939",
      "--state-root",
      path.join(dir, "state"),
      "--fixture-root",
      path.join(root, "testdata", "router-runtime", "fixtures"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("does not match manifest");
  }, 30_000);

  it("verify-client-journeys refuses a dirty state root without --allow-dirty-state", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const dir = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-dirty-"));
    writeFileSync(path.join(dir, "leftover.txt"), "x");
    const result = script("verify-client-journeys.mjs", [
      "--executable",
      process.execPath,
      "--repo-root",
      root,
      "--static-root",
      root,
      "--port",
      "5942",
      "--state-root",
      dir,
      "--fixture-root",
      path.join(root, "testdata", "router-runtime", "fixtures"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("state root is not empty");
  }, 30_000);

  it("compare-release refuses a cross-channel comparison unless it is deliberate", async () => {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const left = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-ch-left-"));
    const right = mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "r39-ch-right-"));
    writeFileSync(path.join(left, "manifest.json"), JSON.stringify({ channel: "production" }));
    writeFileSync(path.join(right, "manifest.json"), JSON.stringify({ channel: "development" }));
    writeFileSync(path.join(left, "role-model.exe"), "not a real binary");
    writeFileSync(path.join(right, "role-model-dev.exe"), "not a real binary");
    const result = script("compare-release.mjs", [
      "--left-exe",
      path.join(left, "role-model.exe"),
      "--left-port",
      "6041",
      "--left-state",
      path.join(left, "state"),
      "--right-exe",
      path.join(right, "role-model-dev.exe"),
      "--right-port",
      "6042",
      "--right-state",
      path.join(right, "state"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("channels differ");
    expect(result.stdout).toContain("--allow-cross-channel");
  }, 30_000);

  it("compare-release no longer forces a scope id on the child", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      path.join(root, "scripts", "runtime", "compare-release.mjs"),
      "utf8",
    );
    expect(source).not.toContain('"--scope-id"');
  });

  it("neither verifier forces a scope id on the child it starts", async () => {
    const { readFileSync } = await import("node:fs");
    for (const name of ["compare-release.mjs", "verify-client-journeys.mjs"]) {
      const source = readFileSync(path.join(root, "scripts", "runtime", name), "utf8");
      expect(source, name).not.toContain('"--scope-id"');
    }
  });

  it("verify-client-journeys logs a health failure and throws instead of exiting past its finally", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      path.join(root, "scripts", "runtime", "verify-client-journeys.mjs"),
      "utf8",
    );
    const start = source.indexOf("if (health === undefined) {");
    const throwAt = source.indexOf('throw new Error("health not ready")', start);
    const end = throwAt < 0 ? -1 : throwAt + 'throw new Error("health not ready")'.length;
    expect(start).toBeGreaterThan(-1);
    const healthBlock = source.slice(start, end);
    expect(healthBlock).toContain("throw new Error");
    expect(/\n\s*process\.exit\(/.test(healthBlock)).toBe(false);
  });

  it("compare-release refuses the same port on both sides", () => {
    const result = script("compare-release.mjs", [
      "--left-exe",
      "left.exe",
      "--left-port",
      "6121",
      "--right-exe",
      "right.exe",
      "--right-port",
      "6121",
      "--fixture-root",
      process.cwd(),
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("must differ");
  });
  it("compare-release classifies URL pairs: same, environment-state, and a real value difference", async () => {
    const { spawn } = await import("node:child_process");
    // The servers must live in another process: the CLI under test is spawned synchronously, which
    // would block this process and leave its own event loop unable to answer (S171).
    const serverSource = `
      const { createServer } = require("node:http");
      const endpoints = {
        "/healthz": () => ({ status: "healthy", runtime: { channel: process.env.CHANNEL || "development" } }),
        "/api/role-model/runtime/summary": () => ({ runtimeStateRoot: "/state", language: process.env.RIGHT === "1" ? "fr" : "en" }),
        "/api/role-model/models": () => ({ models: ["m1"] }),
        "/api/role-model/endpoints": () => ({ endpoints: ["e1"] }),
        "/api/role-model/router/summary": () => ({ routes: 1 }),
        "/api/role-model/telemetry/summary": () => ({ requestCount: process.env.RIGHT === "1" ? 7 : 0 }),
        "/api/role-model/operator/learning": () => ({ knowledge: "ok" }),
        "/api/role-model/operator/replay/jobs": () => ({ jobs: [] }),
        "/api/role-model/operator/evaluation/jobs": () => ({ jobs: [] }),
      };
      const server = createServer((request, response) => {
        const handler = endpoints[request.url];
        if (!handler) { response.statusCode = 404; response.end(); return; }
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify(handler()));
      });
      server.listen(0, "127.0.0.1", () => { console.log(String(server.address().port)); });
    `;
    const startServer = (right: boolean, channel = "development") =>
      new Promise<{ port: string; stop: () => void }>((resolve, reject) => {
        const child = spawn(process.execPath, ["-e", serverSource], {
          env: { ...process.env, RIGHT: right ? "1" : "0", CHANNEL: channel },
          stdio: ["ignore", "pipe", "inherit"],
        });
        let buffer = "";
        child.stdout.on("data", (chunk) => {
          buffer += String(chunk);
          const line = buffer.split("\n")[0];
          if (line && /^\d+$/.test(line.trim()))
            resolve({ port: line.trim(), stop: () => child.kill() });
        });
        child.on("error", reject);
      });
    const left = await startServer(false);
    const right = await startServer(true);
    try {
      const result = script("compare-release.mjs", [
        "--left",
        `http://127.0.0.1:${left.port}`,
        "--right",
        `http://127.0.0.1:${right.port}`,
        "--fixture-root",
        process.cwd(),
      ]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("different /api/role-model/runtime/summary");
      expect(result.stdout).toContain("environment-state /api/role-model/telemetry/summary");
      expect(result.stdout).toContain("value-diff /api/role-model/runtime/summary");
    } finally {
      left.stop();
      right.stop();
    }
  }, 120_000);

  it("compare-release refuses a URL pair whose channels differ", async () => {
    const { spawn } = await import("node:child_process");
    const source = `
      const { createServer } = require("node:http");
      createServer((request, response) => {
        response.setHeader("content-type", "application/json");
        if (request.url === "/healthz") { response.end(JSON.stringify({ status: "healthy", runtime: { channel: process.env.CHANNEL } })); return; }
        response.end(JSON.stringify({}));
      }).listen(0, "127.0.0.1", function () { console.log(String(this.address().port)); });
    `;
    const start = (channel: string) =>
      new Promise<{ port: string; stop: () => void }>((resolve) => {
        const child = spawn(process.execPath, ["-e", source], {
          env: { ...process.env, CHANNEL: channel },
          stdio: ["ignore", "pipe", "inherit"],
        });
        let buffer = "";
        child.stdout.on("data", (chunk) => {
          buffer += String(chunk);
          const line = buffer.split("\n")[0].trim();
          if (/^\d+$/.test(line)) resolve({ port: line, stop: () => child.kill() });
        });
      });
    const left = await start("production");
    const right = await start("development");
    try {
      const result = script("compare-release.mjs", [
        "--left",
        `http://127.0.0.1:${left.port}`,
        "--right",
        `http://127.0.0.1:${right.port}`,
        "--fixture-root",
        process.cwd(),
      ]);
      expect(result.status).toBe(2);
      expect(result.stdout).toContain("channels differ");
      expect(result.stdout).toContain("production vs development");
    } finally {
      left.stop();
      right.stop();
    }
  }, 60_000);

  it("the rendered audit reports NOT RUN when CHROME_PATH is wrong instead of picking another browser", () => {
    const result = script("audit-rendered-ui.mjs", ["--url", "http://127.0.0.1:1"], {
      CHROME_PATH: "C:/definitely-not-here/chrome.exe",
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("NOT RUN: no Chromium-family browser found");
  });

  it("the packaged gate skips the rendered audit without a browser and fails only when required", () => {
    const skipped = script(
      "verify-packaged-candidate.mjs",
      ["--package-dir", "no-such-package", "--rendered"],
      { CHROME_PATH: "C:/definitely-not-here/chrome.exe" },
    );
    expect(skipped.status).not.toBe(0);
    expect(skipped.stdout + skipped.stderr).toContain("package directory does not exist");
  });

  it("the workflow carries the rendered UI step as advisory", async () => {
    const { readFileSync } = await import("node:fs");
    const workflow = readFileSync(
      path.join(root, ".github", "workflows", "build-binaries.yml"),
      "utf8",
    );
    expect(workflow).toContain("Audit rendered UI (R39)");
    expect(workflow).toContain("audit-rendered-ui.mjs");
  });
  it("verify-client-journeys accepts a repeated --expect-model without failing argument validation", () => {
    const result = script("verify-client-journeys.mjs", [
      "--expect-model",
      "deepseek-official/deepseek-flash",
      "--expect-model",
      "second/model",
    ]);
    // No --executable, so this still NOT RUNs on inputs - but the expectation flags must not be
    // treated as missing required arguments.
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("NOT RUN");
  });

  it("the worker-fixture flags exist on the gate and the journeys script", async () => {
    const { readFileSync } = await import("node:fs");
    const gate = readFileSync(
      path.join(root, "scripts", "runtime", "verify-packaged-candidate.mjs"),
      "utf8",
    );
    const journeys = readFileSync(
      path.join(root, "scripts", "runtime", "verify-client-journeys.mjs"),
      "utf8",
    );
    expect(gate).toContain("--worker-fixtures");
    expect(gate).toContain("--expect-model");
    expect(journeys).toContain("--expect-model");
  });
  it("the journeys script exercises a real chat completion through the router", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      path.join(root, "scripts", "runtime", "verify-client-journeys.mjs"),
      "utf8",
    );
    expect(source).toContain("/v1/chat/completions");
    expect(source).toContain("chat completion");
    expect(source).toContain("total_tokens");
  });
  it("compare-release refuses to compare a URL with itself", () => {
    const result = script("compare-release.mjs", [
      "--left",
      "http://127.0.0.1:5991",
      "--right",
      "http://127.0.0.1:5991",
    ]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("same URL");
  });
});
