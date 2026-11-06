import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  ArtifactStoreAuthority,
  CompositionConfig,
  CompositionLayer,
} from "../src/composition-dag.js";

/**
 * Run 115 S114 (R27): "graph is closed once per owner not recreated per request".
 *
 * Layer.buildWithMemoMap(layer, memoMap, scope) reuses one entry per layer in the memo map
 * (vendor/effect/packages/effect/src/Layer.ts:213-241), so repeated reads through the same memo
 * map must hand back the SAME service instance. A fresh memo map is a different owner and may
 * legitimately rebuild.
 */
const readThrough = (memoMap: Layer.MemoMap) =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope;
    const context = yield* Layer.buildWithMemoMap(CompositionLayer, memoMap, scope);
    return {
      artifact: Context.get(context, ArtifactStoreAuthority),
      config: Context.get(context, CompositionConfig),
    };
  });

describe("S114 composition graph identity", () => {
  it("reuses the same service instances through one memo map", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const memoMap = yield* Layer.makeMemoMap;
          const first = yield* readThrough(memoMap);
          const second = yield* readThrough(memoMap);
          return {
            artifactSame: first.artifact === second.artifact,
            configSame: first.config === second.config,
            instanceId: first.config.instanceId,
          };
        }),
      ),
    );
    expect(result.artifactSame).toBe(true);
    expect(result.configSame).toBe(true);
    expect(result.instanceId.length).toBeGreaterThan(0);
  });

  it("a fresh memo map is a different owner and rebuilds", async () => {
    const build = async () =>
      Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const memoMap = yield* Layer.makeMemoMap;
            const context = yield* readThrough(memoMap);
            return context.artifact;
          }),
        ),
      );
    const first = await build();
    const second = await build();
    expect(second.id).toBe(first.id);
    expect(second).not.toBe(first);
  });
});
