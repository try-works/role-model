import { Context, Effect, Layer, Ref, Semaphore } from "effect";

import {
  type SessionBootstrapHandlers,
  type SessionBootstrapState,
  createPendingBootstrapState,
  runSessionBootstrapStages,
} from "./session-bootstrap.js";

/**
 * Run 115 S21a (R27 first slice): the SHAPE of a closed shared-leaf composition DAG.
 *
 * This module is additive: nothing in index.ts or any existing runtime construction is rewired.
 * The services below are typed shapes that name the owners R27 will eventually move; only the
 * provider-permit pilot has behaviour (a bounded permit + a bounded waiter queue).
 *
 * Closure claim (corrected by S21b): required services are closed at the TYPE level - the
 * `Layer.Layer<CompositionServices, never, never>` annotation cannot type-check if the graph still
 * requires an ambient service. This is NOT graph exactness: because ROut is contravariant, a layer
 * may provide EXTRA services without a type error, and an untyped `Context.getUnsafe` read could
 * still reach an ambient context. Extra providers and untyped reads are NOT prevented; no runtime
 * exactness check runs.
 *
 * Scope of the 13 services (R27): this is the OWNER SHAPE only. It names R27's owner services plus
 * the shared authorities, but it does not model early readiness/partial shutdown, cache identity,
 * per-run judge/throttle isolation, or benchmark cancellation. Do not read the service set as R27
 * complete; those behaviours still need their own shape and tests.
 *
 * Effect API used (vendor/effect/packages/effect/src):
 * - Context.Service class form: Context.ts:103-134; Layer.succeed: Layer.ts:827-835.
 * - Layer.effect: Layer.ts:1039-1052; Layer.mergeAll: Layer.ts:1275; Layer.provide: Layer.ts:1463-1493;
 *   Layer.provideMerge: Layer.ts:1582-1617; Layer.fresh: Layer.ts:2207.
 * - Semaphore.make: Semaphore.ts:369; takeIfAvailable: :538-541; take: :510-513; release: :572-575;
 *   withPermits: :420-426.
 * - Ref.make/get/update: Ref.ts:178, :206, :587.
 */

export interface CompositionConfigContract {
  readonly instanceId: string;
  readonly channel: "development";
  readonly providerMaxConcurrent: number;
  readonly providerMaxWaiters: number;
}

export class CompositionConfig extends Context.Service<CompositionConfig, CompositionConfigContract>()(
  "CompositionConfig",
) {}

export interface ArtifactStoreAuthorityContract {
  readonly id: string;
  readonly authority: "graph_content_addressed";
}
export class ArtifactStoreAuthority extends Context.Service<
  ArtifactStoreAuthority,
  ArtifactStoreAuthorityContract
>()("ArtifactStoreAuthority") {}

export interface EventLogAuthorityContract {
  readonly id: string;
  readonly boundedMetadata: true;
}
export class EventLogAuthority extends Context.Service<EventLogAuthority, EventLogAuthorityContract>()(
  "EventLogAuthority",
) {}

export interface CaptureWalAuthorityContract {
  readonly id: string;
  readonly owner: "capture_queue";
}
export class CaptureWalAuthority extends Context.Service<
  CaptureWalAuthority,
  CaptureWalAuthorityContract
>()("CaptureWalAuthority") {}

export interface RetentionAuthorityContract {
  readonly id: string;
  readonly scope: "retention";
}
export class RetentionAuthority extends Context.Service<
  RetentionAuthority,
  RetentionAuthorityContract
>()("RetentionAuthority") {}

export interface ProviderPermitStats {
  readonly active: number;
  readonly queued: number;
  readonly started: number;
  readonly completed: number;
  readonly rejected: number;
  readonly maxConcurrent: number;
  readonly maxWaiters: number;
}

export interface ProviderPermitsContract {
  /**
   * Runs the effect under one process-owned provider permit. At most `providerMaxWaiters` callers
   * may be parked; callers beyond permit + waiter capacity fail with ProviderPermitOverflowError
   * instead of parking on an unbounded semaphore waiter list. The permit is released on success,
   * typed failure and interruption (acquireUseRelease), and the waiter slot is released by the
   * acquire finalizer on every path.
   */
  readonly withPermit: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E | ProviderPermitOverflowError, R>;
  readonly stats: Effect.Effect<ProviderPermitStats>;
}

/** Typed rejection for callers beyond permit + waiter capacity (the total waiter count is bounded). */
export class ProviderPermitOverflowError extends Error {
  readonly _tag = "ProviderPermitOverflowError";
  readonly limit: number;
  constructor(limit: number) {
    super(`provider permit waiters exceeded the ${limit}-caller bound`);
    this.name = "ProviderPermitOverflowError";
    this.limit = limit;
  }
}
export class ProviderPermits extends Context.Service<ProviderPermits, ProviderPermitsContract>()(
  "ProviderPermits",
) {}

export interface BackendContract {
  readonly id: string;
  readonly artifactStore: ArtifactStoreAuthorityContract;
  readonly eventLog: EventLogAuthorityContract;
}
export class Backend extends Context.Service<Backend, BackendContract>()("Backend") {}

export interface ServerContract {
  readonly id: string;
  readonly backend: BackendContract;
  readonly providerPermits: ProviderPermitsContract;
}
export class Server extends Context.Service<Server, ServerContract>()("Server") {}

export interface BootstrapContract {
  readonly id: string;
  readonly artifactStore: ArtifactStoreAuthorityContract;
  /** The session bootstrap owner's initial state (the same function the host used before). */
  readonly pending: () => SessionBootstrapState;
  /** Runs the ordered bootstrap stages through the existing pure runner. */
  readonly run: (handlers: SessionBootstrapHandlers) => Promise<SessionBootstrapState>;
}
export class Bootstrap extends Context.Service<Bootstrap, BootstrapContract>()("Bootstrap") {}

export interface RefreshContract {
  readonly id: string;
  readonly eventLog: EventLogAuthorityContract;
}
export class Refresh extends Context.Service<Refresh, RefreshContract>()("Refresh") {}

export interface DrainContract {
  readonly id: string;
  readonly captureWal: CaptureWalAuthorityContract;
  readonly retention: RetentionAuthorityContract;
}
export class Drain extends Context.Service<Drain, DrainContract>()("Drain") {}

export interface BenchmarkContract {
  readonly id: string;
  readonly providerPermits: ProviderPermitsContract;
}
export class Benchmark extends Context.Service<Benchmark, BenchmarkContract>()("Benchmark") {}

export interface CliContract {
  readonly id: string;
  readonly server: ServerContract;
}
export class Cli extends Context.Service<Cli, CliContract>()("Cli") {}

export type CompositionServices =
  | CompositionConfig
  | ArtifactStoreAuthority
  | EventLogAuthority
  | CaptureWalAuthority
  | RetentionAuthority
  | ProviderPermits
  | Backend
  | Server
  | Bootstrap
  | Refresh
  | Drain
  | Benchmark
  | Cli;

export const DEFAULT_COMPOSITION_CONFIG: CompositionConfigContract = Object.freeze({
  channel: "development",
  instanceId: "run115-s21a",
  providerMaxConcurrent: 4,
  providerMaxWaiters: 16,
});

const configLayer = (
  config: CompositionConfigContract,
): Layer.Layer<CompositionConfig, never, never> =>
  Layer.succeed(CompositionConfig, CompositionConfig.of(config));


/**
 * Run 115 S115 (R27): the metadata cache is a DAG-owned service with explicit identity.
 *
 * R27 requires cache identity to include the authority, the configuration generation and the
 * model, a bounded size, a TTL, and invalidation on configuration change. Without the generation
 * in the key, a router decision could be served from an entry produced under a superseded config.
 */
export interface MetadataCacheKeyInput {
  readonly authorityId: string;
  readonly configGeneration: number;
  readonly modelId: string;
}

/** Composite key: authority NUL generation NUL model. NUL cannot appear in an authority id. */
export const metadataCacheKey = (input: MetadataCacheKeyInput): string =>
  input.authorityId + "\u0000" + String(input.configGeneration) + "\u0000" + input.modelId;

export type MetadataCacheValue = string | number | boolean | readonly MetadataCacheValue[] | { readonly [key: string]: MetadataCacheValue };

export interface MetadataCacheContract {
  readonly get: (key: string, now: number) => Effect.Effect<MetadataCacheValue | undefined>;
  readonly set: (key: string, value: MetadataCacheValue, now: number) => Effect.Effect<void>;
  readonly invalidateGeneration: (generation: number) => Effect.Effect<void>;
  readonly size: () => Effect.Effect<number>;
}

interface MetadataCacheEntry {
  readonly generation: number;
  readonly storedAt: number;
  readonly value: MetadataCacheValue;
}

export const makeMetadataCache = (options: {
  readonly capacity: number;
  readonly ttlMs: number;
}): MetadataCacheContract => {
  if (!Number.isInteger(options.capacity) || options.capacity < 1) {
    throw new Error("metadata cache capacity must be a positive integer");
  }
  if (!Number.isFinite(options.ttlMs) || options.ttlMs < 0) {
    throw new Error("metadata cache ttlMs must be a non-negative number");
  }
  const entries = new Map<string, MetadataCacheEntry>();
  const generationOf = (key: string): number => Number(key.split("\u0000")[1]);
  return {
    get: (key, now) =>
      Effect.suspend(() => {
        const entry = entries.get(key);
        if (entry === undefined) return Effect.succeed(undefined);
        if (now - entry.storedAt > options.ttlMs) {
          entries.delete(key);
          return Effect.succeed(undefined);
        }
        return Effect.succeed(entry.value);
      }),
    invalidateGeneration: (generation) =>
      Effect.suspend(() => {
        for (const [key, entry] of [...entries]) {
          if (entry.generation === generation) entries.delete(key);
        }
        return Effect.void;
      }),
    set: (key, value, now) =>
      Effect.suspend(() => {
        entries.delete(key);
        entries.set(key, { generation: generationOf(key), storedAt: now, value });
        while (entries.size > options.capacity) {
          const oldest = entries.keys().next();
          if (oldest.done === true) break;
          entries.delete(oldest.value);
        }
        return Effect.void;
      }),
    size: () => Effect.suspend(() => Effect.succeed(entries.size)),
  };
};
export const artifactAuthorityLayer: Layer.Layer<ArtifactStoreAuthority, never, CompositionConfig> =
  Layer.effect(
    ArtifactStoreAuthority,
    Effect.map(
      CompositionConfig.useSync((config) => config),
      (config) =>
        ArtifactStoreAuthority.of({
          authority: "graph_content_addressed",
          id: `artifact-store:${config.instanceId}`,
        }),
    ),
  );

export const eventLogAuthorityLayer: Layer.Layer<EventLogAuthority, never, CompositionConfig> =
  Layer.effect(
    EventLogAuthority,
    Effect.map(
      CompositionConfig.useSync((config) => config),
      (config) =>
        EventLogAuthority.of({ boundedMetadata: true, id: `event-log:${config.instanceId}` }),
    ),
  );

export const captureWalAuthorityLayer: Layer.Layer<CaptureWalAuthority, never, CompositionConfig> =
  Layer.effect(
    CaptureWalAuthority,
    Effect.map(
      CompositionConfig.useSync((config) => config),
      (config) =>
        CaptureWalAuthority.of({ id: `capture-wal:${config.instanceId}`, owner: "capture_queue" }),
    ),
  );

export const retentionAuthorityLayer: Layer.Layer<RetentionAuthority, never, CompositionConfig> =
  Layer.effect(
    RetentionAuthority,
    Effect.map(
      CompositionConfig.useSync((config) => config),
      (config) =>
        RetentionAuthority.of({ id: `retention:${config.instanceId}`, scope: "retention" }),
    ),
  );

/**
 * Pilot service for R27's "provider permits are process-owned with separate bounded waiters".
 * The permit semaphore bounds in-flight work; the waiter-slot semaphore bounds the number of
 * callers that may be parked in the explicit waiter queue. Callers beyond both bounds wait for a
 * waiter slot; they are not rejected and the queue cannot grow past `providerMaxWaiters`.
 */
export const providerPermitsLayer = Layer.effect(
  ProviderPermits,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const permits = yield* Semaphore.make(config.providerMaxConcurrent);
    const waiterSlots = yield* Semaphore.make(config.providerMaxWaiters);
    const active = yield* Ref.make(0);
    const queued = yield* Ref.make(0);
    const started = yield* Ref.make(0);
    const completed = yield* Ref.make(0);
    const rejected = yield* Ref.make(0);

    const acquire = Effect.gen(function* () {
      const immediate = yield* Semaphore.takeIfAvailable(permits, 1);
      if (immediate) {
        yield* Ref.update(active, (value) => value + 1);
        yield* Ref.update(started, (value) => value + 1);
        return;
      }
      // Bound the TOTAL wait: a caller beyond permit + waiter capacity is rejected with a typed
      // error instead of parking on Semaphore's unbounded waiter list.
      const slot = yield* Semaphore.takeIfAvailable(waiterSlots, 1);
      if (!slot) {
        yield* Ref.update(rejected, (value) => value + 1);
        return yield* Effect.fail(new ProviderPermitOverflowError(config.providerMaxWaiters));
      }
      yield* Ref.update(queued, (value) => value + 1);
      yield* Effect.ensuring(
        Effect.flatMap(Semaphore.take(permits, 1), () =>
          Effect.flatMap(
            Ref.update(active, (value) => value + 1),
            () => Ref.update(started, (value) => value + 1),
          ),
        ),
        Effect.flatMap(
          Ref.update(queued, (value) => Math.max(0, value - 1)),
          () => Semaphore.release(waiterSlots, 1),
        ),
      );
    });

    const release = Effect.flatMap(
      Ref.update(active, (value) => Math.max(0, value - 1)),
      () =>
        Effect.flatMap(
          Ref.update(completed, (value) => value + 1),
          () => Semaphore.release(permits, 1),
        ),
    );

    const withPermit = <A, E, R>(
      effect: Effect.Effect<A, E, R>,
    ): Effect.Effect<A, E | ProviderPermitOverflowError, R> =>
      Effect.acquireUseRelease(
        acquire,
        () => effect,
        () => release,
      );

    const stats = Effect.gen(function* () {
      return {
        active: yield* Ref.get(active),
        completed: yield* Ref.get(completed),
        maxConcurrent: config.providerMaxConcurrent,
        maxWaiters: config.providerMaxWaiters,
        queued: yield* Ref.get(queued),
        rejected: yield* Ref.get(rejected),
        started: yield* Ref.get(started),
      };
    });

    return ProviderPermits.of({ stats, withPermit });
  }),
);

export const backendLayer = Layer.effect(
  Backend,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const artifactStore = yield* ArtifactStoreAuthority;
    const eventLog = yield* EventLogAuthority;
    return Backend.of({ artifactStore, eventLog, id: `backend:${config.instanceId}` });
  }),
);

export const bootstrapLayer = Layer.effect(
  Bootstrap,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const artifactStore = yield* ArtifactStoreAuthority;
    return Bootstrap.of({
      artifactStore,
      id: `bootstrap:${config.instanceId}`,
      pending: createPendingBootstrapState,
      run: runSessionBootstrapStages,
    });
  }),
);

export const refreshLayer = Layer.effect(
  Refresh,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const eventLog = yield* EventLogAuthority;
    return Refresh.of({ eventLog, id: `refresh:${config.instanceId}` });
  }),
);

export const drainLayer = Layer.effect(
  Drain,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const captureWal = yield* CaptureWalAuthority;
    const retention = yield* RetentionAuthority;
    return Drain.of({ captureWal, id: `drain:${config.instanceId}`, retention });
  }),
);

export const benchmarkLayer = Layer.effect(
  Benchmark,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const providerPermits = yield* ProviderPermits;
    return Benchmark.of({ id: `benchmark:${config.instanceId}`, providerPermits });
  }),
);

export const serverLayer = Layer.effect(
  Server,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const backend = yield* Backend;
    const providerPermits = yield* ProviderPermits;
    return Server.of({ backend, id: `server:${config.instanceId}`, providerPermits });
  }),
);

export const cliLayer = Layer.effect(
  Cli,
  Effect.gen(function* () {
    const config = yield* CompositionConfig;
    const server = yield* Server;
    return Cli.of({ id: `cli:${config.instanceId}`, server });
  }),
);

const leafLayers = Layer.mergeAll(
  artifactAuthorityLayer,
  eventLogAuthorityLayer,
  captureWalAuthorityLayer,
  retentionAuthorityLayer,
);

const dependencyLayer = Layer.provideMerge(leafLayers, configLayer(DEFAULT_COMPOSITION_CONFIG));

const baseOwnerLayers = Layer.mergeAll(backendLayer, bootstrapLayer, refreshLayer, drainLayer);

const benchmarkOwnerLayer = Layer.provideMerge(benchmarkLayer, providerPermitsLayer);
const serverDependencies = Layer.mergeAll(baseOwnerLayers, benchmarkOwnerLayer);
const serverOwnerLayer = Layer.provideMerge(serverLayer, serverDependencies);
const ownerLayer = Layer.provideMerge(cliLayer, serverOwnerLayer);

/**
 * One closed graph. Type annotation is the closure proof: no service is required from the caller
 * and every leaf is constructed once by `provideMerge`.
 */
export const CompositionLayer: Layer.Layer<CompositionServices, never, never> = Layer.provideMerge(
  ownerLayer,
  dependencyLayer,
);

export const makeCompositionLayer = (
  config: CompositionConfigContract,
): Layer.Layer<CompositionServices, never, never> =>
  Layer.provideMerge(ownerLayer, Layer.provideMerge(leafLayers, configLayer(config)));

export const makeConfigLayer = (
  config: CompositionConfigContract,
): Layer.Layer<CompositionConfig, never, never> => configLayer(config);

/**
 * Run 115 S21c (R27): the host obtains its session-bootstrap owner from the DAG's layer. The
 * service is stateless (pending/run are the existing pure functions), so one composed instance can
 * serve every backend in a process without sharing session state.
 */
export const composeBootstrapOwner = (): BootstrapContract =>
  Effect.runSync(
    Effect.provide(
      Bootstrap.use((owner) => Effect.succeed(owner)),
      CompositionLayer,
    ),
  );

export const bootstrapOwner: BootstrapContract = composeBootstrapOwner();
