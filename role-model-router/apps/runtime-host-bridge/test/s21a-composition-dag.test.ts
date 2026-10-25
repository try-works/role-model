import { Context, Deferred, Effect, Exit, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  ArtifactStoreAuthority,
  Backend,
  Benchmark,
  Bootstrap,
  CaptureWalAuthority,
  Cli,
  CompositionConfig,
  CompositionLayer,
  DEFAULT_COMPOSITION_CONFIG,
  Drain,
  EventLogAuthority,
  ProviderPermits,
  Refresh,
  RetentionAuthority,
  Server,
  artifactAuthorityLayer,
  makeCompositionLayer,
  makeConfigLayer,
} from "../src/composition-dag.js";

/**
 * Run 115 S21a (R27 first slice), repaired by S21b: shape proof for the closed shared-leaf
 * composition DAG.
 *
 * The closure claim is type-level only: required services are closed (the
 * `Layer.Layer<CompositionServices, never, never>` annotation cannot type-check with an ambient
 * requirement), but extra providers and untyped `Context.getUnsafe` reads are NOT prevented - ROut
 * is contravariant. The service set is R27 OWNER SHAPE only; early readiness/partial shutdown,
 * cache identity, per-run judge/throttle isolation and benchmark cancellation are not modelled.
 */

const capture = async <A, E>(effect: Effect.Effect<A, E, never>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, CompositionLayer));

describe("S21a composition DAG shape", () => {
  it("builds the whole closed graph with no ambient service and exposes every owner", async () => {
    const result = await capture(
      Effect.gen(function* () {
        const config = yield* CompositionConfig;
        const artifactStore = yield* ArtifactStoreAuthority;
        const eventLog = yield* EventLogAuthority;
        const captureWal = yield* CaptureWalAuthority;
        const retention = yield* RetentionAuthority;
        const providerPermits = yield* ProviderPermits;
        const backend = yield* Backend;
        const server = yield* Server;
        const bootstrap = yield* Bootstrap;
        const refresh = yield* Refresh;
        const drain = yield* Drain;
        const benchmark = yield* Benchmark;
        const cli = yield* Cli;
        return {
          artifactStore,
          benchmark: benchmark.id,
          bootstrap: bootstrap.id,
          captureWal,
          cli: cli.id,
          config,
          drain: drain.id,
          eventLog,
          providerPermits: yield* providerPermits.stats,
          refresh: refresh.id,
          retention,
          server: server.id,
        };
      }),
    );

    expect(result.config.channel).toBe("development");
    expect(result.artifactStore.authority).toBe("graph_content_addressed");
    expect(result.eventLog.boundedMetadata).toBe(true);
    expect(result.captureWal.owner).toBe("capture_queue");
    expect(result.retention.scope).toBe("retention");
    expect(result.providerPermits.maxConcurrent).toBe(
      DEFAULT_COMPOSITION_CONFIG.providerMaxConcurrent,
    );
    expect(result.bootstrap).toContain("bootstrap:");
    expect(result.refresh).toContain("refresh:");
    expect(result.drain).toContain("drain:");
    expect(result.benchmark).toContain("benchmark:");
    expect(result.server).toContain("server:");
    expect(result.cli).toContain("cli:");
  });

  it("gives every consumer of one shared leaf the same instance", async () => {
    const result = await capture(
      Effect.gen(function* () {
        const artifactStore = yield* ArtifactStoreAuthority;
        const backend = yield* Backend;
        const bootstrap = yield* Bootstrap;
        const server = yield* Server;
        return {
          backend: backend.artifactStore,
          bootstrap: bootstrap.artifactStore,
          server: server.backend.artifactStore,
          leaf: artifactStore,
        };
      }),
    );

    expect(result.backend).toBe(result.leaf);
    expect(result.bootstrap).toBe(result.leaf);
    expect(result.server).toBe(result.leaf);
  });

  it("negative control: Layer.fresh rebuilds inside one shared memo map (deleting fresh fails)", async () => {
    const sharedLayer: Layer.Layer<ArtifactStoreAuthority, never, never> = Layer.provide(
      artifactAuthorityLayer,
      makeConfigLayer(DEFAULT_COMPOSITION_CONFIG),
    );
    const freshLayer = Layer.fresh(sharedLayer);
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const memoMap = yield* Layer.makeMemoMap;
          const scope = yield* Effect.scope;
          const build = (layer: Layer.Layer<ArtifactStoreAuthority, never, never>) =>
            Layer.buildWithMemoMap(layer, memoMap, scope);
          const [sharedA, sharedB, freshA, freshB] = yield* Effect.all(
            [build(sharedLayer), build(sharedLayer), build(freshLayer), build(freshLayer)],
            { concurrency: 1 },
          );
          return [
            Context.get(sharedA, ArtifactStoreAuthority),
            Context.get(sharedB, ArtifactStoreAuthority),
            Context.get(freshA, ArtifactStoreAuthority),
            Context.get(freshB, ArtifactStoreAuthority),
          ];
        }),
      ),
    );

    // One memo map: the shared layer is memoised, Layer.fresh forces a second instance.
    expect(result[0]).toBe(result[1]);
    expect(result[2]).not.toBe(result[3]);
  });

  it("rejects callers beyond permit + waiter capacity instead of parking them unboundedly", async () => {
    const config = {
      ...DEFAULT_COMPOSITION_CONFIG,
      instanceId: "run115-s21b-waiter",
      providerMaxConcurrent: 2,
      providerMaxWaiters: 2,
    };
    const totalCallers = 2_000;
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.scoped(
          Effect.gen(function* () {
            const permits = yield* ProviderPermits;
            const gate = yield* Deferred.make<void>();
            const worker = permits.withPermit(Deferred.await(gate));
            const fibers = yield* Effect.forEach(
              Array.from({ length: totalCallers }, (_value, index) => index),
              () => Effect.forkScoped(worker),
            );

            let stats = yield* permits.stats;
            for (let sample = 0; sample < 500 && stats.rejected < totalCallers - 4; sample += 1) {
              yield* Effect.sleep("2 millis");
              stats = yield* permits.stats;
            }
            const during = stats;
            yield* Deferred.succeed(gate, undefined);
            const exits = yield* Effect.forEach(fibers, (fiber) => Fiber.await(fiber));
            const after = yield* permits.stats;
            const failures = exits.filter((exit) => Exit.isFailure(exit)).length;
            return { after, during, failures };
          }),
        ),
        makeCompositionLayer(config),
      ),
    );

    // Total waiters are bounded by maxWaiters; the rest fail immediately with the typed rejection.
    expect(result.during.active).toBe(2);
    expect(result.during.queued).toBeLessThanOrEqual(2);
    expect(result.during.rejected).toBe(totalCallers - 4);
    expect(result.failures).toBe(totalCallers - 4);
    expect(result.after.active).toBe(0);
    expect(result.after.queued).toBe(0);
    expect(result.after.completed).toBe(4);
  });

  it("returns the permit to the pool after a failing user", async () => {
    const config = {
      ...DEFAULT_COMPOSITION_CONFIG,
      instanceId: "run115-s21b-failure",
      providerMaxConcurrent: 1,
      providerMaxWaiters: 1,
    };
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* () {
          const permits = yield* ProviderPermits;
          const failure = yield* Effect.exit(permits.withPermit(Effect.fail("boom")));
          const afterFailure = yield* permits.stats;
          const ok = yield* permits.withPermit(Effect.succeed("second"));
          const afterSecond = yield* permits.stats;
          return { afterFailure, afterSecond, failure, ok };
        }),
        makeCompositionLayer(config),
      ),
    );

    expect(Exit.isFailure(result.failure)).toBe(true);
    expect(result.afterFailure.active).toBe(0);
    expect(result.afterFailure.completed).toBe(1);
    expect(result.ok).toBe("second");
    expect(result.afterSecond.active).toBe(0);
    expect(result.afterSecond.completed).toBe(2);
  });

  it("returns the permit to the pool after an interrupted user", async () => {
    const config = {
      ...DEFAULT_COMPOSITION_CONFIG,
      instanceId: "run115-s21b-interrupt",
      providerMaxConcurrent: 1,
      providerMaxWaiters: 1,
    };
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.scoped(
          Effect.gen(function* () {
          const permits = yield* ProviderPermits;
          const started = yield* Deferred.make<void>();
          const fiber = yield* Effect.forkScoped(
            permits.withPermit(Effect.andThen(Deferred.succeed(started, undefined), Effect.never)),
          );
          yield* Deferred.await(started);
          const during = yield* permits.stats;
          yield* Fiber.interrupt(fiber);
          let afterInterrupt = yield* permits.stats;
          for (let sample = 0; sample < 200 && afterInterrupt.active !== 0; sample += 1) {
            yield* Effect.sleep("2 millis");
            afterInterrupt = yield* permits.stats;
          }
          const ok = yield* permits.withPermit(Effect.succeed("after"));
          const afterSecond = yield* permits.stats;
          return { afterInterrupt, afterSecond, during, ok };
          }),
        ),
        makeCompositionLayer(config),
      ),
    );

    expect(result.during.active).toBe(1);
    expect(result.afterInterrupt.active).toBe(0);
    expect(result.afterInterrupt.completed).toBe(1);
    expect(result.ok).toBe("after");
    expect(result.afterSecond.active).toBe(0);
  });
});
