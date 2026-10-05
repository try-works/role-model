/**
 * Run 101 / R11 - routing and queueing stay independent.
 *
 * R11 asks for this to be *proven*, not asserted: no routing module may read or
 * write the queue store, and the queue runtime may not read a routing decision.
 * The check is a scan over the source of both sides, so a future edit that
 * couples them fails here rather than in production.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const routerRoot = path.join(repoRoot, "role-model-router");

function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const entryPath = path.join(root, entry);
    if (statSync(entryPath).isDirectory()) {
      out.push(...listSourceFiles(entryPath));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(entryPath);
    }
  }
  return out;
}

const ROUTING_ROOTS = [
  path.join(routerRoot, "packages", "core", "src"),
  path.join(routerRoot, "packages", "protocol-routing", "src"),
  path.join(routerRoot, "packages", "roles", "src"),
  path.join(routerRoot, "packages", "tasks", "src"),
];

describe("@recursive:101-effect-mq-queue-rebuild @sp11 R11 routing independence", () => {
  it("no routing module reads or writes the queue runtime", () => {
    const offenders: string[] = [];
    for (const root of ROUTING_ROOTS) {
      for (const file of listSourceFiles(root)) {
        const source = readFileSync(file, "utf8");
        if (/queue-runtime|queues\.js|queue-api|effect_queue|PersistedQueue/.test(source)) {
          offenders.push(path.relative(repoRoot, file).replaceAll("\\", "/"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the queue runtime does not read a routing decision", () => {
    const queueFiles = listSourceFiles(
      path.join(routerRoot, "apps", "runtime-host-bridge", "src", "queue-runtime"),
    );
    const offenders: string[] = [];
    for (const file of queueFiles) {
      const source = readFileSync(file, "utf8");
      // The queue schedules work; it never decides where a request goes. A
      // reference to the router's decision surface would make replay scheduling
      // depend on routing, which the requirement forbids in both directions.
      if (/routeDecision|routerDecision|packages\/core|protocol-routing/.test(source)) {
        offenders.push(path.relative(repoRoot, file).replaceAll("\\", "/"));
      }
    }
    expect(offenders).toEqual([]);
  });
});
