import { execFile } from "node:child_process";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, test } from "vitest";
import { assertValid, createAjv } from "./schema-test-helpers.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");
const smokeOutputDir = path.join(repoRoot, "runtime-output", "gateway-smoke");

async function runSmokeApp(): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("cmd.exe", ["/c", "corepack pnpm run smoke"], {
      cwd: repoRoot,
      windowsHide: true,
    });
    return;
  }

  await execFileAsync("sh", ["-lc", "corepack pnpm run smoke"], {
    cwd: repoRoot,
  });
}

async function readJsonLines(filePath: string): Promise<unknown[]> {
  const lines = (await readFile(filePath, "utf8"))
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => JSON.parse(line) as unknown);
}

describe("gateway smoke observability conformance", () => {
  test(
    "emits trace and usage artifacts with run01 linkage ids and canonical trace shapes",
    async () => {
      await rm(smokeOutputDir, { recursive: true, force: true });
      await runSmokeApp();

      const ajv = await createAjv(schemaDir);
      const validateRouterDecision = ajv.getSchema("router-decision.schema.json");
      const validateTraceSpan = ajv.getSchema("trace-span.schema.json");
      const validateTraceEvent = ajv.getSchema("trace-event.schema.json");
      const validateUsageEvent = ajv.getSchema("usage-event.schema.json");
      if (!validateRouterDecision || !validateTraceSpan || !validateTraceEvent || !validateUsageEvent) {
        throw new Error("Required observability schemas did not compile");
      }

      const decision = JSON.parse(
        await readFile(path.join(smokeOutputDir, "router-decision.json"), "utf8"),
      ) as {
        request_id: string;
        routing_decision_id: string;
      };
      const spans = JSON.parse(
        await readFile(path.join(smokeOutputDir, "trace-spans.json"), "utf8"),
      ) as unknown[];
      const events = await readJsonLines(path.join(smokeOutputDir, "trace-events.jsonl"));
      const usageEvents = await readJsonLines(path.join(smokeOutputDir, "usage-events.jsonl"));

      assertValid(validateRouterDecision, decision, "router-decision.json");
      for (const span of spans) {
        assertValid(validateTraceSpan, span, "trace-spans.json");
      }
      for (const event of events) {
        assertValid(validateTraceEvent, event, "trace-events.jsonl");
      }
      for (const usageEvent of usageEvents) {
        assertValid(validateUsageEvent, usageEvent, "usage-events.jsonl");
      }

      for (const span of spans as Array<{
        request_id: string;
        routing_decision_id: string;
      }>) {
        if (
          span.request_id !== decision.request_id ||
          span.routing_decision_id !== decision.routing_decision_id
        ) {
          throw new Error("Trace span linkage did not match router decision identifiers");
        }
      }

      const spanTypes = (spans as Array<{ span_type: string }>).map((span) => span.span_type);
      if (
        !spanTypes.includes("router.eligibility") ||
        !spanTypes.includes("router.scoring") ||
        !spanTypes.includes("router.selection")
      ) {
        throw new Error(`Missing required router spans: ${JSON.stringify(spanTypes)}`);
      }

      for (const event of events as Array<{
        request_id: string;
        routing_decision_id: string;
      }>) {
        if (
          event.request_id !== decision.request_id ||
          event.routing_decision_id !== decision.routing_decision_id
        ) {
          throw new Error("Trace event linkage did not match router decision identifiers");
        }
      }

      for (const usageEvent of usageEvents as Array<{
        request_id: string;
        routing_decision_id: string;
      }>) {
        if (
          usageEvent.request_id !== decision.request_id ||
          usageEvent.routing_decision_id !== decision.routing_decision_id
        ) {
          throw new Error("Usage event linkage did not match router decision identifiers");
        }
      }
    },
    60_000,
  );

  test(
    "emits observed performance with the run01 sample window and sources shape",
    async () => {
      await rm(smokeOutputDir, { recursive: true, force: true });
      await runSmokeApp();

      const ajv = await createAjv(schemaDir);
      const validateObserved = ajv.getSchema("observed-performance-profile.schema.json");
      if (!validateObserved) {
        throw new Error("observed-performance-profile.schema.json did not compile");
      }

      const observedProfile = JSON.parse(
        await readFile(path.join(smokeOutputDir, "observed-performance.json"), "utf8"),
      ) as unknown;

      assertValid(validateObserved, observedProfile, "observed-performance.json");
    },
    60_000,
  );
});
