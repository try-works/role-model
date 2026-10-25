/**
 * Startup must not wait for the durable post-observation backlog.
 *
 * Live on :3456 (2026-10-14): the outbox held 560 pending rows, while each private operation
 * retry took about 30 s. The startup hook awaited the full drain, so every operator surface
 * stayed at 503 runtime_initializing. Delivery must continue in the existing background drain.
 */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("the startup readiness path does not await the full outbox backlog", () => {
  const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
  const beforeReady = source.slice(
    source.indexOf("beforeReady: async (runtime) => {"),
    source.indexOf("backend = packagedRuntime.backend;"),
  );

  expect(beforeReady).toContain("schedulePostObservationDrain(runtime);");
  expect(beforeReady).not.toContain("await drainPostObservationOutbox(runtime);");
});
