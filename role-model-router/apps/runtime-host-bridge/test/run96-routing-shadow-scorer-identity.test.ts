import { describe, expect, test } from "vitest";

import {
  RUN96_ROUTING_SHADOW_SCORER_SET_VERSION,
  createRun96RoutingShadowScorer,
} from "../src/track-b-runtime.js";

/**
 * R14: a scorer is identified by ID/version/digest. The routing-shadow scorer
 * definition gained manifest fields (source, judge endpoint) in the code-level
 * audit remediation, so its identity must move with the definition. A fixed
 * `version` with a constant digest makes an upgraded runtime collide with the
 * manifest already persisted by an earlier build.
 */
describe("Run96 routing-shadow scorer identity", () => {
  test("binds the scorer generation to its definition instead of a constant", () => {
    const scorer = createRun96RoutingShadowScorer();
    const changed = createRun96RoutingShadowScorer({ dimensions: ["correctness", "safety"] });

    expect(scorer.id).toBe("run96-semantic-criteria");
    expect(scorer.scorerSetVersion).toBe(RUN96_ROUTING_SHADOW_SCORER_SET_VERSION);
    expect(scorer.manifestVersion).toBe(2);
    expect(scorer.version).not.toBe("1");
    expect(scorer.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(changed.digest).not.toBe(scorer.digest);
    expect(scorer.digest).toBe(createRun96RoutingShadowScorer().digest);
  });

  test("a legacy manifest and the upgraded manifest are distinct durable rows", () => {
    const upgraded = createRun96RoutingShadowScorer();
    const legacyKey = `${upgraded.id}@1`;
    const upgradedKey = `${upgraded.id}@${upgraded.version}`;
    expect(upgradedKey).not.toBe(legacyKey);
  });
});
