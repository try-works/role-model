import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import {
  resolveRuntimeVersionInfo,
  validateRun88PackagedStageIdentity,
} from "../src/runtime-version.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((entry) => rm(entry, { recursive: true, force: true })));
});

describe("resolveRuntimeVersionInfo", () => {
  test("prefers packaged release manifest metadata over fallback sources", async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-version-"));
    tempDirs.push(repoRoot);
    await writeFile(
      path.join(repoRoot, "manifest.json"),
      JSON.stringify({
        version: "0.0.2",
        commit: "abc123def456",
        build_date: "2026-06-29T00:00:00.000Z",
        channel: "stage",
        name: "role-model-stage",
        endpoint: "http://127.0.0.1:3457",
        source_tree: "tree123",
        executable_sha256: "exe123",
        core_payload_sha256: "core123",
      }),
      "utf8",
    );

    await expect(
      resolveRuntimeVersionInfo({
        repoRoot,
        fallbackConfigVersion: "1.1",
      }),
    ).resolves.toEqual({
      version: "0.0.2",
      release_version: "0.0.2",
      commit: "abc123def456",
      build_date: "2026-06-29T00:00:00.000Z",
      channel: "stage",
      name: "role-model-stage",
      endpoint: "http://127.0.0.1:3457",
      source_tree: "tree123",
      executable_sha256: "exe123",
      core_payload_sha256: "core123",
      configVersion: "1.1",
    });
  });

  test("falls back to release-tag environment metadata when no manifest exists", async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-version-env-"));
    tempDirs.push(repoRoot);

    await expect(
      resolveRuntimeVersionInfo({
        repoRoot,
        fallbackConfigVersion: "1.1",
        env: {
          GITHUB_REF_NAME: "v0.0.3",
          GITHUB_SHA: "fedcba9876543210",
          BUILD_DATE: "2026-06-29T01:23:45.000Z",
        },
      }),
    ).resolves.toEqual({
      version: "0.0.3",
      release_version: "0.0.3",
      commit: "fedcba9876543210",
      build_date: "2026-06-29T01:23:45.000Z",
      configVersion: "1.1",
    });
  });

  test("reports the latest release tag separately from a divergent local build identity", async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-version-git-"));
    tempDirs.push(repoRoot);

    await expect(
      resolveRuntimeVersionInfo({
        repoRoot,
        fallbackConfigVersion: "1.1",
        env: {},
        runGitCommand: (args) => {
          const command = args.join(" ");
          if (command.startsWith("tag --list")) {
            return "v0.0.2\nv0.0.1-alpha.3";
          }
          if (command.startsWith("describe --tags")) {
            return "v0.0.1-alpha.3-15-g61b8bdad-dirty";
          }
          if (command === "rev-parse HEAD") {
            return "61b8bdad0d54172169e53bbbe89033d93c5aba97";
          }
          if (command === "show -s --format=%cI HEAD") {
            return "2026-06-28T21:54:30+02:00";
          }
          return null;
        },
      }),
    ).resolves.toEqual({
      version: "0.0.1-alpha.3-15-g61b8bdad-dirty",
      release_version: "0.0.2",
      commit: "61b8bdad0d54172169e53bbbe89033d93c5aba97",
      build_date: "2026-06-28T21:54:30+02:00",
      configVersion: "1.1",
    });
  });

  test("prefers explicit build date over git commit date for local packaged builds", async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-version-build-date-"),
    );
    tempDirs.push(repoRoot);

    await expect(
      resolveRuntimeVersionInfo({
        repoRoot,
        fallbackConfigVersion: "1.1",
        env: {
          BUILD_DATE: "2026-07-11T05:45:00.000Z",
        },
        runGitCommand: (args) => {
          const command = args.join(" ");
          if (command.startsWith("tag --list")) {
            return "v0.0.5";
          }
          if (command.startsWith("describe --tags")) {
            return "v0.0.5-dirty";
          }
          if (command === "rev-parse HEAD") {
            return "e78ba9411dca6cc925f6b572ddc734f3f44f50c5";
          }
          if (command === "show -s --format=%cI HEAD") {
            return "2026-07-10T13:37:20+08:00";
          }
          return null;
        },
      }),
    ).resolves.toEqual({
      version: "0.0.5-dirty",
      release_version: "0.0.5",
      commit: "e78ba9411dca6cc925f6b572ddc734f3f44f50c5",
      build_date: "2026-07-11T05:45:00.000Z",
      configVersion: "1.1",
    });
  });

  test("preserves the CI commit when a shallow branch build has no release tag", async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-version-shallow-branch-"),
    );
    tempDirs.push(repoRoot);
    const githubSha = "a".repeat(40);

    await expect(
      resolveRuntimeVersionInfo({
        repoRoot,
        env: {
          GITHUB_REF_NAME: "stage",
          GITHUB_SHA: githubSha,
          BUILD_DATE: "2026-08-23T08:32:00.000Z",
        },
        runGitCommand: () => null,
      }),
    ).resolves.toEqual({
      version: "unknown",
      commit: githubSha,
      build_date: "2026-08-23T08:32:00.000Z",
    });
  });

  test("rejects a stage package without an immutable commit identity", () => {
    expect(() =>
      validateRun88PackagedStageIdentity({
        channel: "stage",
        name: "role-model-stage",
        host: "127.0.0.1",
        port: 3457,
        endpoint: "http://127.0.0.1:3457",
        state_root_name: "role-model-runtime-stage",
        scope_id: "standalone-runtime-stage",
        release_id: `sha256:${"a".repeat(64)}`,
        private_distribution_sha256: "b".repeat(64),
        source_tree: "c".repeat(40),
        executable_sha256: "d".repeat(64),
        core_payload_sha256: "e".repeat(64),
        track_b_runtime: { manifest_sha256: "b".repeat(64) },
      }),
    ).toThrow(/commit identity/i);
  });
});
