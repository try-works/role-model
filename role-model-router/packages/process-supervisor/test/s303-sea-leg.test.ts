import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

import { ProcessSupervisor } from "../src/index.js";

/**
 * S303 (R22) SEA leg: the pinned sealed package is spawned as the supervised process on an ephemeral loopback
 * port with an E: state root. Identity (size + sha256 + manifest version) is recorded as evidence. A missing
 * candidate fails loudly instead of silently skipping.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SEA_PATH =
  "E:/role-model-run115/package-s293-public/role-model-router/dist/release/win32-x64/role-model-dev.exe";
const REQUIRED_TEMP_DRIVE = process.env.S303_REQUIRED_TEMP_DRIVE ?? "E:";
const SEA_IDENTITY = {
  sha256: "d2bc6231f5b5751f4f0b8bc4a970a7593d27a63497b0f7bfa1e41d53beccd67b",
  size: 104_880_640,
  version: "0.0.20-269-g35103383",
};

const rootOnDrive = (root: string, requiredDrive: string): boolean => {
  const normalizedRoot = root.replace(/[\\/]+$/, "").toUpperCase();
  return normalizedRoot.startsWith(requiredDrive.replace(/[\\/]+$/, "").toUpperCase());
};
const EVIDENCE_PATH = path.join(
  REPO_ROOT,
  ".recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s303-sea-leg.json",
);

const sha256File = async (filePath: string): Promise<string> => {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex");
};

async function allocatePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || !("port" in Object(address))) {
        reject(new Error("Failed to allocate a local port."));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

const supervisors: ProcessSupervisor[] = [];
const stateRoots: string[] = [];

afterEach(async () => {
  while (supervisors.length > 0) {
    const supervisor = supervisors.pop();
    await supervisor?.shutdown();
  }
  await Promise.all(
    stateRoots.splice(0).map(async (root) => rm(root, { recursive: true, force: true })),
  );
});

// The candidate is a Windows .exe; the leg is meaningful on win32 only.
const win32Only = process.platform === "win32" ? test : test.skip;

test("the SEA leg enforces the required temp drive (E: default, overridable)", () => {
  expect(rootOnDrive("E:/rm-tmp", "E:")).toBe(true);
  expect(rootOnDrive("E:\\rm-tmp", "E:")).toBe(true);
  expect(rootOnDrive("C:/temp", "E:")).toBe(false);
  expect(rootOnDrive("C:/temp", "C:")).toBe(true);
});

describe("S303 SEA supervision", () => {
  win32Only(
    "starts the pinned sealed SEA, becomes healthy, stops it, and asserts its identity",
    async (context) => {
      if (!existsSync(SEA_PATH)) {
        throw new Error(`SEA candidate missing (pinned sealed package not found): ${SEA_PATH}`);
      }
      const port = await allocatePort();
      // Hermetic: keep the ambient temp root only when it is on the required drive; otherwise create the
      // state root deterministically AT the required drive root, and skip cleanly (recorded reason) when that
      // drive is unavailable and no S303_REQUIRED_TEMP_DRIVE override was given.
      const stateRootBase = rootOnDrive(os.tmpdir(), REQUIRED_TEMP_DRIVE)
        ? os.tmpdir()
        : `${REQUIRED_TEMP_DRIVE}/`;
      let stateRoot: string;
      try {
        stateRoot = await mkdtemp(path.join(stateRootBase, "s303-sea-state-"));
      } catch (error) {
        console.warn(
          `[s303-sea-leg] skipped: ambient temp root ${os.tmpdir()} is not on ${REQUIRED_TEMP_DRIVE} and the required drive is unavailable (${String(error)}); set S303_REQUIRED_TEMP_DRIVE or provide ${REQUIRED_TEMP_DRIVE} to run the SEA leg.`,
        );
        context.skip();
        return;
      }
      stateRoots.push(stateRoot);
      const manifestPath = path.join(path.dirname(SEA_PATH), "manifest.json");
      // SAFETY: the packaged manifest beside the SEA is our own release manifest; only the version string is
      // read, and a missing/non-string version is recorded as null instead of being trusted.
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version?: unknown };
      const size = statSync(SEA_PATH).size;
      const sha256 = await sha256File(SEA_PATH);
      const supervisor = new ProcessSupervisor();
      supervisors.push(supervisor);
      const started = Date.now();
      const vendor = await supervisor.startVendor({
        vendorId: "s303-sea",
        command: SEA_PATH,
        args: [
          "--repo-root",
          path.dirname(SEA_PATH),
          "--runtime-state-root",
          stateRoot,
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
          "--fixture-root",
          path.join(REPO_ROOT, "testdata/router-runtime/fixtures"),
          "--static-root",
          path.join(REPO_ROOT, "role-model-router/apps/runtime-ui-next/dist/client"),
        ],
        healthCheckUrl: `http://127.0.0.1:${String(port)}/healthz`,
        required: true,
        shutdownTimeoutMs: 30_000,
        startupTimeoutMs: 120_000,
      });
      const startupMs = Date.now() - started;
      expect(vendor.healthStatus).toBe("healthy");
      expect(vendor.pid).toBeGreaterThan(0);
      expect(sha256).toBe(SEA_IDENTITY.sha256);
      expect(size).toBe(SEA_IDENTITY.size);
      expect(manifest.version).toBe(SEA_IDENTITY.version);
      const stopStarted = Date.now();
      await vendor.stop();
      const stopMs = Date.now() - stopStarted;
      writeFileSync(
        EVIDENCE_PATH,
        `${JSON.stringify(
          {
            candidate: {
              path: SEA_PATH,
              sha256,
              size,
              version: manifest.version === undefined ? null : String(manifest.version),
            },
            result: "PASSED",
            runtimeStateRoot: stateRoot,
            startupMs,
            stopMs,
            vendorPid: vendor.pid,
          },
          null,
          2,
        )}\n`,
      );
      await expect(fetch(`http://127.0.0.1:${String(port)}/healthz`)).rejects.toBeDefined();
    },
    180_000,
  );
});
