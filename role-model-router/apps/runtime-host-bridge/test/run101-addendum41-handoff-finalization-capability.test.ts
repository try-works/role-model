import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Run 101 addendum 41 - a resumed handoff must close its durable replay job with
 * a capability Replay Core actually declares.  The live :3462 RC finalized
 * evaluation groups through the queue, then logged
 * `replay result handoff finalization declined:... capability denied` forever
 * because the host called a non-existent `replay:record-evaluation-result-from-handoff`.
 */
describe("run 101 addendum 41: handoff finalization uses a declared replay-core capability", () => {
  test("the handoff finalization block records through replay:record-evaluation-result", () => {
    const source = readFileSync(path.resolve("src/cli.ts"), "utf8");
    const blockStart = source.indexOf("replay-result-from-handoff:");
    expect(blockStart).toBeGreaterThan(0);
    const block = source.slice(blockStart, blockStart + 1200);
    expect(block).toContain('capability: "replay:record-evaluation-result"');
    expect(block).not.toContain("replay:record-evaluation-result-from-handoff");
  });
});
