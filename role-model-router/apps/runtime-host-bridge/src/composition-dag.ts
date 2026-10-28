import { createHash } from "node:crypto";
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

/** Runs every release even when earlier ones fail; failures surface as one AggregateError afterwards
 * (finalizer failure cannot skip later releases and must not force an early exit). */
/** Wraps a close so it runs exactly once (idempotent finalizer for shared resources). */
export const onceClose = (close: () => Promise<void>): (() => Promise<void>) => {
  let promise: Promise<void> | null = null;
  return () => {
    if (promise === null) promise = close();
    return promise;
  };
};

/** Typed failure: the bounded join/drain waited past its deadline; interrupt proceeds. */
export class ServerJoinTimeoutError extends Error {
  readonly code = "SERVER_JOIN_TIMEOUT";
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super("server join timed out after " + String(timeoutMs) + "ms; interrupt proceeds");
    this.name = "ServerJoinTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export const runReleaseAll = async (steps: readonly (() => Promise<void>)[]): Promise<void> => {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "shutdown releases failed: " + String(failures.length));
  }
};

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
  | Cli
  | MetadataCacheService;

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
// S318 (R27): MetadataCache service with explicit identity: authority + configuration generation + model,
// TTL/cap bounded, generation invalidation on config change. The host reads routing metadata through this owner.
export interface MetadataCacheOwnerContract extends MetadataCacheContract {
  readonly authorityId: string;
  readonly generation: () => number;
  readonly keyFor: (modelId: string) => string;
  readonly noteConfig: (configIdentity: string) => { readonly generation: number; readonly invalidated: number };
  readonly getSync: (key: string, now: number) => MetadataCacheValue | undefined;
  readonly setSync: (key: string, value: MetadataCacheValue, now: number) => void;
  readonly sizeSync: () => number;
}

export class MetadataCacheService extends Context.Service<MetadataCacheService, MetadataCacheOwnerContract>()(
  "MetadataCache",
) {}

const makeMetadataCacheOwner = (
  authorityId: string,
  options?: { readonly capacity?: number; readonly ttlMs?: number },
): MetadataCacheOwnerContract => {
  const cache = makeMetadataCache({ capacity: options?.capacity ?? 256, ttlMs: options?.ttlMs ?? 30_000 });
  let generation = 1;
  let identity: string | null = null;
  return {
    ...cache,
    authorityId,
    generation: () => generation,
    getSync: (key, now) => Effect.runSync(cache.get(key, now)),
    keyFor: (modelId) => metadataCacheKey({ authorityId, configGeneration: generation, modelId }),
    noteConfig: (configIdentity) => {
      if (identity === null || identity === configIdentity) {
        identity = configIdentity;
        return { generation, invalidated: 0 };
      }
      const old = generation;
      const before = Effect.runSync(cache.size());
      Effect.runSync(cache.invalidateGeneration(old));
      const after = Effect.runSync(cache.size());
      identity = configIdentity;
      generation = old + 1;
      return { generation, invalidated: before - after };
    },
    setSync: (key, value, now) => {
      Effect.runSync(cache.set(key, value, now));
    },
    sizeSync: () => Effect.runSync(cache.size()),
  };
};

export const metadataCacheLayer = Layer.effect(
  MetadataCacheService,
  Effect.map(
    CompositionConfig.useSync((config) => config),
    (config) => MetadataCacheService.of(makeMetadataCacheOwner("metadata:" + config.instanceId)),
  ),
);

export const composeMetadataCacheOwner = (options?: {
  readonly capacity?: number;
  readonly ttlMs?: number;
}): MetadataCacheOwnerContract =>
  makeMetadataCacheOwner("metadata:" + DEFAULT_COMPOSITION_CONFIG.instanceId, options);

/** Stable identity for a host config object (sha256 hex); a changed config yields a new generation. */
/**
 * Host-config snapshot boundary: only the JSON serialization is used. The generic object constraint keeps
 * the real UnifiedRuntimeConfig callers assignable while naming the snapshot boundary explicitly.
 */
export const metadataConfigIdentity = <T extends object>(config: T | null | undefined): string =>
  createHash("sha256").update(JSON.stringify(config ?? null)).digest("hex");

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
  Layer.mergeAll(ownerLayer, metadataCacheLayer),
  dependencyLayer,
);

export const makeCompositionLayer = (
  config: CompositionConfigContract,
): Layer.Layer<CompositionServices, never, never> =>
  Layer.provideMerge(Layer.mergeAll(ownerLayer, metadataCacheLayer), Layer.provideMerge(leafLayers, configLayer(config)));

export const makeConfigLayer = (
  config: CompositionConfigContract,
): Layer.Layer<CompositionConfig, never, never> => configLayer(config);

/**
 * Run 115 S21c (R27): the host obtains its session-bootstrap owner from the DAG's layer. The
 * service is stateless (pending/run are the existing pure functions), so one composed instance can
 * serve every backend in a process without sharing session state.
 */

// S310b (R27): the composition DAG is the construction site for the Backend owner. The host's CLI
// passes only its closures; every bindBackendMethod wire and the base/lifecycle fields are constructed here.
import type { StartBridgeServerOptions } from "./index.js";

type BackendResolver = () => BackendLike | null | undefined;

type BackendLike = {
  readonly effectiveRegistry?: StartBridgeServerOptions["registry"];
  readonly operatorAuthToken?: string;
  readonly getExecutionCatalog?: () => ReturnType<NonNullable<StartBridgeServerOptions["getExecutionCatalog"]>>;
  readonly getEffectiveRoutableInventory?: () => ReturnType<NonNullable<StartBridgeServerOptions["getRoutableInventory"]>>;
};

const readBackendMember = (backend: BackendLike, key: string): ((...args: readonly never[]) => never) => {
  const member = Object(backend)[key];
  if (member === undefined) throw new Error("runtime backend member is not available: " + key);
  return member;
};

const NO_OPTION_OVERRIDES: Readonly<Record<never, never>> = Object.freeze({});

export interface BackendOwner {
  /** Host-provided dependency teardown; the Server owner runs it LAST in the ordered shutdown. */
  readonly close?: () => Promise<void>;
  readonly id: string;
  readonly options: StartBridgeServerOptions;
}

const BACKEND_OWNER_BRAND = Symbol.for("role-model-router.backend-owner");
const BACKEND_OWNER_REF = Symbol.for("role-model-router.backend-owner-ref");

export const isComposedBackendOwner = (owner: { readonly id?: string } | null): owner is BackendOwner =>
  owner !== null && Object.prototype.hasOwnProperty.call(owner, BACKEND_OWNER_BRAND) && Object(owner)[BACKEND_OWNER_BRAND] === true;

export const assertComposedBackendOwner = (owner: { readonly id?: string } | null): BackendOwner => {
  if (!isComposedBackendOwner(owner)) {
    throw new Error("Backend options were not constructed by the composition DAG (legacy local construction refused)");
  }
  return owner;
};

const OWNER_PERMITS = Effect.runSync(
  Effect.provide(ProviderPermits.use((permits) => Effect.succeed(permits)), makeCompositionLayer(DEFAULT_COMPOSITION_CONFIG)),
);

/** Wraps BOTH provider methods on a backend instance so every consumer runs under the DAG permit. */
export const withBackendProviderPermits = <
  T extends { readonly executeChatCompletions: unknown; readonly executeResponses: unknown },
>(backend: T): T => {
  // The wrapper INHERITS from the backend (prototype chain) instead of spreading: registry,
  // effectiveRegistry and every other getter keep evaluating live on each access, so execution-mode and
  // config changes are visible immediately. Only the two provider methods become own data properties
  // bound to the DAG permit.
  // SAFETY: the wrapper is a prototype view of the same backend; the two provider methods are the only overrides.
  const wrapped = Object.create(backend) as T;
  // SAFETY: each wrapped field is the same provider method; the cast only restores the exact field type.
  Object.defineProperty(wrapped, "executeChatCompletions", {
    configurable: true,
    enumerable: true,
    value: withProviderPermit(backend.executeChatCompletions as never),
    writable: false,
  });
  // SAFETY: as above, the responses provider method keeps its exact field type after the wrap.
  Object.defineProperty(wrapped, "executeResponses", {
    configurable: true,
    enumerable: true,
    value: withProviderPermit(backend.executeResponses as never),
    writable: false,
  });
  return wrapped;
};

// SAFETY: F is the exact provider-method field type; the runtime shape is the same function with the
// same parameters, only wrapped so the call runs inside the DAG permit.
const withProviderPermit =
  (fn: (...args: readonly never[]) => Promise<never>) =>
  (...args: readonly never[]): Promise<never> =>
    Effect.runPromise(
      OWNER_PERMITS.withPermit(
        Effect.tryPromise({ try: () => fn(...args), catch: (cause) => cause }),
      ) as Effect.Effect<never, never>,
    ) as Promise<never>;

export interface BackendOwnerInput {
  readonly host: string;
  readonly port: number;
  readonly staticRoot?: string;
  readonly runtimeStateRoot?: string;
  readonly runtimeChannel?: StartBridgeServerOptions["runtimeChannel"];
  readonly operatorAuthToken?: string;
  readonly operatorContext?: StartBridgeServerOptions["operatorContext"];
  readonly observabilityScope?: StartBridgeServerOptions["observabilityScope"];
  readonly anonymousLearningReads?: "on" | "off";
  readonly rescoreLearningScores?: StartBridgeServerOptions["rescoreLearningScores"];
  readonly resolveLearningPolicySource?: StartBridgeServerOptions["resolveLearningPolicySource"];
  readonly shutdown?: () => Promise<void>;
  readonly resolveBackend: BackendResolver;
  readonly readBootstrapState: () => unknown;
  readonly projectCliStartupReadiness: (state: never) => unknown;
  readonly emptyRegistry: StartBridgeServerOptions["registry"];
  readonly emptyCatalog: ReturnType<NonNullable<StartBridgeServerOptions["getExecutionCatalog"]>>;
  /** Host-provided backend close (dependency teardown run last by the Server owner). */
  readonly closeBackend?: () => Promise<void>;
  readonly overrides: Readonly<Partial<Pick<StartBridgeServerOptions,
    | "readCaptureEvidence" | "readLogs" | "readHealthStatus" | "readTrackBReplayStatus"
    | "controlTrackBReplay" | "readTrackBLearningSummary" | "readStoreDegradationReceipts">>>;
}

export const composeBackendOwner = (input: BackendOwnerInput): BackendOwner => {
  const resolveBackend = input.resolveBackend;
  const bindBackendMethod = (resolve: BackendResolver, key: string) =>
    ((...args: readonly never[]) => {
      const backend = resolve();
      if (backend === undefined || backend === null) throw new Error("runtime backend is not ready");
      return readBackendMember(backend, key)(...args);
    }) as never;
  const options = {
    host: input.host,
    port: input.port,
    staticRoot: input.staticRoot,
    runtimeStateRoot: input.runtimeStateRoot,
    runtimeChannel: input.runtimeChannel,
    operatorAuthToken: input.operatorAuthToken,
    operatorContext: input.operatorContext,
    ...(input.observabilityScope ? { observabilityScope: input.observabilityScope } : NO_OPTION_OVERRIDES),
    ...(input.anonymousLearningReads ? { anonymousLearningReads: input.anonymousLearningReads } : NO_OPTION_OVERRIDES),
    ...(input.rescoreLearningScores ? { rescoreLearningScores: input.rescoreLearningScores } : NO_OPTION_OVERRIDES),
    ...(input.resolveLearningPolicySource ? { resolveLearningPolicySource: input.resolveLearningPolicySource } : NO_OPTION_OVERRIDES),
    shutdown: input.shutdown,
    registry: resolveBackend()?.effectiveRegistry ?? input.emptyRegistry,
    getRegistry: () => resolveBackend()?.effectiveRegistry ?? input.emptyRegistry,
    getExecutionCatalog: () => resolveBackend()?.getExecutionCatalog?.() ?? input.emptyCatalog,
    // SAFETY: the CLI's readiness projection accepts the CLI bootstrap state; the owner passes the same
    // state value through, so the never-cast only satisfies the structural input type.
    readStartupReadiness: () => input.projectCliStartupReadiness(input.readBootstrapState() as never),
    getRoutableInventory: () => resolveBackend()?.getEffectiveRoutableInventory?.() ?? null,
    readLlamaSwapVendorStatus: bindBackendMethod(resolveBackend, "readLlamaSwapVendorStatus") as StartBridgeServerOptions["readLlamaSwapVendorStatus"],
    executeChatCompletions: bindBackendMethod(resolveBackend, "executeChatCompletions") as StartBridgeServerOptions["executeChatCompletions"],
    executeResponses: bindBackendMethod(resolveBackend, "executeResponses") as StartBridgeServerOptions["executeResponses"],
    readVersionInfo: bindBackendMethod(resolveBackend, "readVersionInfo") as StartBridgeServerOptions["readVersionInfo"],
    listActivityMetrics: bindBackendMethod(resolveBackend, "listActivityMetrics") as StartBridgeServerOptions["listActivityMetrics"],
    listActivityMetricsPage: bindBackendMethod(resolveBackend, "listActivityMetricsPage") as StartBridgeServerOptions["listActivityMetricsPage"],
    readActivityCapture: bindBackendMethod(resolveBackend, "readActivityCapture") as StartBridgeServerOptions["readActivityCapture"],
    recordClientLatency: bindBackendMethod(resolveBackend, "recordClientLatency") as StartBridgeServerOptions["recordClientLatency"],
    proxyVendorLogStream: bindBackendMethod(resolveBackend, "proxyVendorLogStream") as StartBridgeServerOptions["proxyVendorLogStream"],
    readRuntimeSummary: bindBackendMethod(resolveBackend, "readRuntimeSummary") as StartBridgeServerOptions["readRuntimeSummary"],
    readRuntimeConfig: bindBackendMethod(resolveBackend, "readRuntimeConfig") as StartBridgeServerOptions["readRuntimeConfig"],
    updateRuntimeConfig: bindBackendMethod(resolveBackend, "updateRuntimeConfig") as StartBridgeServerOptions["updateRuntimeConfig"],
    readTelemetrySummary: bindBackendMethod(resolveBackend, "readTelemetrySummary") as StartBridgeServerOptions["readTelemetrySummary"],
    listTelemetryComparisonRows: bindBackendMethod(resolveBackend, "listTelemetryComparisonRows") as StartBridgeServerOptions["listTelemetryComparisonRows"],
    listTelemetryRequests: bindBackendMethod(resolveBackend, "listTelemetryRequests") as StartBridgeServerOptions["listTelemetryRequests"],
    listTelemetryRequestPage: bindBackendMethod(resolveBackend, "listTelemetryRequestPage") as StartBridgeServerOptions["listTelemetryRequestPage"],
    queryTelemetryAnalytics: bindBackendMethod(resolveBackend, "queryTelemetryAnalytics") as StartBridgeServerOptions["queryTelemetryAnalytics"],
    subscribeTelemetry: bindBackendMethod(resolveBackend, "subscribeTelemetry") as StartBridgeServerOptions["subscribeTelemetry"],
    listProviders: bindBackendMethod(resolveBackend, "listProviders") as StartBridgeServerOptions["listProviders"],
    listModels: bindBackendMethod(resolveBackend, "listModels") as StartBridgeServerOptions["listModels"],
    listExtensions: bindBackendMethod(resolveBackend, "listExtensions") as StartBridgeServerOptions["listExtensions"],
    mutateExtension: bindBackendMethod(resolveBackend, "mutateExtension") as StartBridgeServerOptions["mutateExtension"],
    readTrackBQaExtensions: bindBackendMethod(resolveBackend, "readTrackBQaExtensions") as StartBridgeServerOptions["readTrackBQaExtensions"],
    readTrackBShadowReceipts: bindBackendMethod(resolveBackend, "readTrackBShadowReceipts") as StartBridgeServerOptions["readTrackBShadowReceipts"],
    readTrackBPostObservationReceipt: bindBackendMethod(resolveBackend, "readTrackBPostObservationReceipt") as StartBridgeServerOptions["readTrackBPostObservationReceipt"],
    recordTrackBContributionAggregate: bindBackendMethod(resolveBackend, "recordTrackBContributionAggregate") as StartBridgeServerOptions["recordTrackBContributionAggregate"],
    retryTrackBContributionAggregates: bindBackendMethod(resolveBackend, "retryTrackBContributionAggregates") as StartBridgeServerOptions["retryTrackBContributionAggregates"],
    readTrackBExtensionReadback: bindBackendMethod(resolveBackend, "readTrackBExtensionReadback") as StartBridgeServerOptions["readTrackBExtensionReadback"],
    runTrackBSupervisedReplay: bindBackendMethod(resolveBackend, "runTrackBSupervisedReplay") as StartBridgeServerOptions["runTrackBSupervisedReplay"],
    readOperatorStatus: bindBackendMethod(resolveBackend, "readOperatorStatus") as StartBridgeServerOptions["readOperatorStatus"],
    listOperatorTraceRoots: bindBackendMethod(resolveBackend, "listOperatorTraceRoots") as StartBridgeServerOptions["listOperatorTraceRoots"],
    readOperatorTraceRoot: bindBackendMethod(resolveBackend, "readOperatorTraceRoot") as StartBridgeServerOptions["readOperatorTraceRoot"],
    listReplayJobs: bindBackendMethod(resolveBackend, "listReplayJobs") as StartBridgeServerOptions["listReplayJobs"],
    createReplayJob: bindBackendMethod(resolveBackend, "createReplayJob") as StartBridgeServerOptions["createReplayJob"],
    cancelReplayJob: bindBackendMethod(resolveBackend, "cancelReplayJob") as StartBridgeServerOptions["cancelReplayJob"],
    readReplayJob: bindBackendMethod(resolveBackend, "readReplayJob") as StartBridgeServerOptions["readReplayJob"],
    readReplayResults: bindBackendMethod(resolveBackend, "readReplayResults") as StartBridgeServerOptions["readReplayResults"],
    listEvaluationJobs: bindBackendMethod(resolveBackend, "listEvaluationJobs") as StartBridgeServerOptions["listEvaluationJobs"],
    readEvaluationJob: bindBackendMethod(resolveBackend, "readEvaluationJob") as StartBridgeServerOptions["readEvaluationJob"],
    listEvaluationTrials: bindBackendMethod(resolveBackend, "listEvaluationTrials") as StartBridgeServerOptions["listEvaluationTrials"],
    listEvaluationScorers: bindBackendMethod(resolveBackend, "listEvaluationScorers") as StartBridgeServerOptions["listEvaluationScorers"],
    listEvaluationComparisons: bindBackendMethod(resolveBackend, "listEvaluationComparisons") as StartBridgeServerOptions["listEvaluationComparisons"],
    listEvaluationGroups: bindBackendMethod(resolveBackend, "listEvaluationGroups") as StartBridgeServerOptions["listEvaluationGroups"],
    cancelEvaluationJob: bindBackendMethod(resolveBackend, "cancelEvaluationJob") as StartBridgeServerOptions["cancelEvaluationJob"],
    retryEvaluationJob: bindBackendMethod(resolveBackend, "retryEvaluationJob") as StartBridgeServerOptions["retryEvaluationJob"],
    readLearningState: bindBackendMethod(resolveBackend, "readLearningState") as StartBridgeServerOptions["readLearningState"],
    readLearningProfile: bindBackendMethod(resolveBackend, "readLearningProfile") as StartBridgeServerOptions["readLearningProfile"],
    readLearningAdvisory: bindBackendMethod(resolveBackend, "readLearningAdvisory") as StartBridgeServerOptions["readLearningAdvisory"],
    updateLearningMode: bindBackendMethod(resolveBackend, "updateLearningMode") as StartBridgeServerOptions["updateLearningMode"],
    rollbackLearning: bindBackendMethod(resolveBackend, "rollbackLearning") as StartBridgeServerOptions["rollbackLearning"],
    readLearningRollout: bindBackendMethod(resolveBackend, "readLearningRollout") as StartBridgeServerOptions["readLearningRollout"],
    readLearningRecords: bindBackendMethod(resolveBackend, "readLearningRecords") as StartBridgeServerOptions["readLearningRecords"],
    readLearningDecisions: bindBackendMethod(resolveBackend, "readLearningDecisions") as StartBridgeServerOptions["readLearningDecisions"],
    readLearningMeasurement: bindBackendMethod(resolveBackend, "readLearningMeasurement") as StartBridgeServerOptions["readLearningMeasurement"],
    readLearningActivity: bindBackendMethod(resolveBackend, "readLearningActivity") as StartBridgeServerOptions["readLearningActivity"],
    readLearningHistory: bindBackendMethod(resolveBackend, "readLearningHistory") as StartBridgeServerOptions["readLearningHistory"],
    readQueues: bindBackendMethod(resolveBackend, "readQueues") as StartBridgeServerOptions["readQueues"],
    readQueueJobs: bindBackendMethod(resolveBackend, "readQueueJobs") as StartBridgeServerOptions["readQueueJobs"],
    readQueueJob: bindBackendMethod(resolveBackend, "readQueueJob") as StartBridgeServerOptions["readQueueJob"],
    readQueueReceipts: bindBackendMethod(resolveBackend, "readQueueReceipts") as StartBridgeServerOptions["readQueueReceipts"],
    readQueueConfig: bindBackendMethod(resolveBackend, "readQueueConfig") as StartBridgeServerOptions["readQueueConfig"],
    setQueueConfig: bindBackendMethod(resolveBackend, "setQueueConfig") as StartBridgeServerOptions["setQueueConfig"],
    retryQueueJob: bindBackendMethod(resolveBackend, "retryQueueJob") as StartBridgeServerOptions["retryQueueJob"],
    cancelQueueJob: bindBackendMethod(resolveBackend, "cancelQueueJob") as StartBridgeServerOptions["cancelQueueJob"],
    setQueueDrain: bindBackendMethod(resolveBackend, "setQueueDrain") as StartBridgeServerOptions["setQueueDrain"],
    readLearningPolicy: bindBackendMethod(resolveBackend, "readLearningPolicy") as StartBridgeServerOptions["readLearningPolicy"],
    setLearningPolicy: bindBackendMethod(resolveBackend, "setLearningPolicy") as StartBridgeServerOptions["setLearningPolicy"],
    rollbackLearningPolicy: bindBackendMethod(resolveBackend, "rollbackLearningPolicy") as StartBridgeServerOptions["rollbackLearningPolicy"],
    activateLearningPack: bindBackendMethod(resolveBackend, "activateLearningPack") as StartBridgeServerOptions["activateLearningPack"],
    rollbackLearningPack: bindBackendMethod(resolveBackend, "rollbackLearningPack") as StartBridgeServerOptions["rollbackLearningPack"],
    materializeRouteLadders: bindBackendMethod(resolveBackend, "materializeRouteLadders") as StartBridgeServerOptions["materializeRouteLadders"],
    recordLearningGuardrailBreach: bindBackendMethod(resolveBackend, "recordLearningGuardrailBreach") as StartBridgeServerOptions["recordLearningGuardrailBreach"],
    restoreLearningScenarioActivation: bindBackendMethod(resolveBackend, "restoreLearningScenarioActivation") as StartBridgeServerOptions["restoreLearningScenarioActivation"],
    engageLearningKillSwitch: bindBackendMethod(resolveBackend, "engageLearningKillSwitch") as StartBridgeServerOptions["engageLearningKillSwitch"],
    measureNoRichCaptureBaseline: bindBackendMethod(resolveBackend, "measureNoRichCaptureBaseline") as StartBridgeServerOptions["measureNoRichCaptureBaseline"],
    readDevelopmentVerificationStatus: bindBackendMethod(resolveBackend, "readDevelopmentVerificationStatus") as StartBridgeServerOptions["readDevelopmentVerificationStatus"],
    readGraphMigration: bindBackendMethod(resolveBackend, "readGraphMigration") as StartBridgeServerOptions["readGraphMigration"],
    advanceGraphMigration: bindBackendMethod(resolveBackend, "advanceGraphMigration") as StartBridgeServerOptions["advanceGraphMigration"],
    rollbackGraphMigration: bindBackendMethod(resolveBackend, "rollbackGraphMigration") as StartBridgeServerOptions["rollbackGraphMigration"],
    readStorageRetention: bindBackendMethod(resolveBackend, "readStorageRetention") as StartBridgeServerOptions["readStorageRetention"],
    dryRunStorageRetention: bindBackendMethod(resolveBackend, "dryRunStorageRetention") as StartBridgeServerOptions["dryRunStorageRetention"],
    updateStorageRetentionPolicy: bindBackendMethod(resolveBackend, "updateStorageRetentionPolicy") as StartBridgeServerOptions["updateStorageRetentionPolicy"],
    executeStorageRetention: bindBackendMethod(resolveBackend, "executeStorageRetention") as StartBridgeServerOptions["executeStorageRetention"],
    cancelStorageRetentionJob: bindBackendMethod(resolveBackend, "cancelStorageRetentionJob") as StartBridgeServerOptions["cancelStorageRetentionJob"],
    rollbackStorageRetention: bindBackendMethod(resolveBackend, "rollbackStorageRetention") as StartBridgeServerOptions["rollbackStorageRetention"],
    readContributionState: bindBackendMethod(resolveBackend, "readContributionState") as StartBridgeServerOptions["readContributionState"],
    updateContributionState: bindBackendMethod(resolveBackend, "updateContributionState") as StartBridgeServerOptions["updateContributionState"],
    listRecommendations: bindBackendMethod(resolveBackend, "listRecommendations") as StartBridgeServerOptions["listRecommendations"],
    downloadRecommendations: bindBackendMethod(resolveBackend, "downloadRecommendations") as StartBridgeServerOptions["downloadRecommendations"],
    applyRecommendation: bindBackendMethod(resolveBackend, "applyRecommendation") as StartBridgeServerOptions["applyRecommendation"],
    dismissRecommendation: bindBackendMethod(resolveBackend, "dismissRecommendation") as StartBridgeServerOptions["dismissRecommendation"],
    readActivePack: bindBackendMethod(resolveBackend, "readActivePack") as StartBridgeServerOptions["readActivePack"],
    listRoles: bindBackendMethod(resolveBackend, "listRoles") as StartBridgeServerOptions["listRoles"],
    listAccounts: bindBackendMethod(resolveBackend, "listAccounts") as StartBridgeServerOptions["listAccounts"],
    listProviderDeviceAuthorizations: bindBackendMethod(resolveBackend, "listProviderDeviceAuthorizations") as StartBridgeServerOptions["listProviderDeviceAuthorizations"],
    upsertProviderAccount: bindBackendMethod(resolveBackend, "upsertProviderAccount") as StartBridgeServerOptions["upsertProviderAccount"],
    startProviderDeviceAuthorization: bindBackendMethod(resolveBackend, "startProviderDeviceAuthorization") as StartBridgeServerOptions["startProviderDeviceAuthorization"],
    pollProviderDeviceAuthorization: bindBackendMethod(resolveBackend, "pollProviderDeviceAuthorization") as StartBridgeServerOptions["pollProviderDeviceAuthorization"],
    reconnectProviderAccount: bindBackendMethod(resolveBackend, "reconnectProviderAccount") as StartBridgeServerOptions["reconnectProviderAccount"],
    updateProviderApiKey: bindBackendMethod(resolveBackend, "updateProviderApiKey") as StartBridgeServerOptions["updateProviderApiKey"],
    openExternalUrl: bindBackendMethod(resolveBackend, "openExternalUrl") as StartBridgeServerOptions["openExternalUrl"],
    removeProviderAccountModel: bindBackendMethod(resolveBackend, "removeProviderAccountModel") as StartBridgeServerOptions["removeProviderAccountModel"],
    activateEndpoint: bindBackendMethod(resolveBackend, "activateEndpoint") as StartBridgeServerOptions["activateEndpoint"],
    activateEndpointBatch: bindBackendMethod(resolveBackend, "activateEndpointBatch") as StartBridgeServerOptions["activateEndpointBatch"],
    removeEndpoint: bindBackendMethod(resolveBackend, "removeEndpoint") as StartBridgeServerOptions["removeEndpoint"],
    readControllerAssignment: bindBackendMethod(resolveBackend, "readControllerAssignment") as StartBridgeServerOptions["readControllerAssignment"],
    updateControllerAssignment: bindBackendMethod(resolveBackend, "updateControllerAssignment") as StartBridgeServerOptions["updateControllerAssignment"],
    readRouterSummary: bindBackendMethod(resolveBackend, "readRouterSummary") as StartBridgeServerOptions["readRouterSummary"],
    readRouterConfig: bindBackendMethod(resolveBackend, "readRouterConfig") as StartBridgeServerOptions["readRouterConfig"],
    listRouterCandidates: bindBackendMethod(resolveBackend, "listRouterCandidates") as StartBridgeServerOptions["listRouterCandidates"],
    listRouterDecisions: bindBackendMethod(resolveBackend, "listRouterDecisions") as StartBridgeServerOptions["listRouterDecisions"],
    listRouterDecisionPage: bindBackendMethod(resolveBackend, "listRouterDecisionPage") as StartBridgeServerOptions["listRouterDecisionPage"],
    readRouterDecision: bindBackendMethod(resolveBackend, "readRouterDecision") as StartBridgeServerOptions["readRouterDecision"],
    listEndpoints: bindBackendMethod(resolveBackend, "listEndpoints") as StartBridgeServerOptions["listEndpoints"],
    listRecentRequestIds: bindBackendMethod(resolveBackend, "listRecentRequestIds") as StartBridgeServerOptions["listRecentRequestIds"],
    listRecentRequestObservations: bindBackendMethod(resolveBackend, "listRecentRequestObservations") as StartBridgeServerOptions["listRecentRequestObservations"],
    readRequestObservation: bindBackendMethod(resolveBackend, "readRequestObservation") as StartBridgeServerOptions["readRequestObservation"],
    exportVerifiersTrace: bindBackendMethod(resolveBackend, "exportVerifiersTrace") as StartBridgeServerOptions["exportVerifiersTrace"],
    recoverLegacyTerminalFailure: bindBackendMethod(resolveBackend, "recoverLegacyTerminalFailure") as StartBridgeServerOptions["recoverLegacyTerminalFailure"],
    readEndpointProfile: bindBackendMethod(resolveBackend, "readEndpointProfile") as StartBridgeServerOptions["readEndpointProfile"],
    readBenchmarkSuite: bindBackendMethod(resolveBackend, "readBenchmarkSuite") as StartBridgeServerOptions["readBenchmarkSuite"],
    runBenchmark: bindBackendMethod(resolveBackend, "runBenchmark") as StartBridgeServerOptions["runBenchmark"],
    readBenchmarkRun: bindBackendMethod(resolveBackend, "readBenchmarkRun") as StartBridgeServerOptions["readBenchmarkRun"],
    readActiveBenchmarkRun: bindBackendMethod(resolveBackend, "readActiveBenchmarkRun") as StartBridgeServerOptions["readActiveBenchmarkRun"],
    clearBenchmarkEndpointData: bindBackendMethod(resolveBackend, "clearBenchmarkEndpointData") as StartBridgeServerOptions["clearBenchmarkEndpointData"],
    clearBenchmarkData: bindBackendMethod(resolveBackend, "clearBenchmarkData") as StartBridgeServerOptions["clearBenchmarkData"],
    readBenchmarkSummary: bindBackendMethod(resolveBackend, "readBenchmarkSummary") as StartBridgeServerOptions["readBenchmarkSummary"],
    readBenchmarkPortfolio: bindBackendMethod(resolveBackend, "readBenchmarkPortfolio") as StartBridgeServerOptions["readBenchmarkPortfolio"],
    listBenchmarkRuns: bindBackendMethod(resolveBackend, "listBenchmarkRuns") as StartBridgeServerOptions["listBenchmarkRuns"],
    readBenchmarkSampleRunStates: bindBackendMethod(resolveBackend, "readBenchmarkSampleRunStates") as StartBridgeServerOptions["readBenchmarkSampleRunStates"],
    readBenchmarkSummariesByMode: bindBackendMethod(resolveBackend, "readBenchmarkSummariesByMode") as StartBridgeServerOptions["readBenchmarkSummariesByMode"],
    readBenchmarkPreferences: bindBackendMethod(resolveBackend, "readBenchmarkPreferences") as StartBridgeServerOptions["readBenchmarkPreferences"],
    updateBenchmarkPreferences: bindBackendMethod(resolveBackend, "updateBenchmarkPreferences") as StartBridgeServerOptions["updateBenchmarkPreferences"],
    listLocalModels: bindBackendMethod(resolveBackend, "listLocalModels") as StartBridgeServerOptions["listLocalModels"],
    listPeerLocalModels: bindBackendMethod(resolveBackend, "listPeerLocalModels") as StartBridgeServerOptions["listPeerLocalModels"],
    listLlamaSwapLocalModels: bindBackendMethod(resolveBackend, "listLlamaSwapLocalModels") as StartBridgeServerOptions["listLlamaSwapLocalModels"],
    loadLocalModel: bindBackendMethod(resolveBackend, "loadLocalModel") as StartBridgeServerOptions["loadLocalModel"],
    loadPeerModel: bindBackendMethod(resolveBackend, "loadPeerModel") as StartBridgeServerOptions["loadPeerModel"],
    loadLlamaSwapModel: bindBackendMethod(resolveBackend, "loadLlamaSwapModel") as StartBridgeServerOptions["loadLlamaSwapModel"],
    setPeerModelRoles: bindBackendMethod(resolveBackend, "setPeerModelRoles") as StartBridgeServerOptions["setPeerModelRoles"],
    setLlamaSwapModelRoles: bindBackendMethod(resolveBackend, "setLlamaSwapModelRoles") as StartBridgeServerOptions["setLlamaSwapModelRoles"],
    unloadPeerModel: bindBackendMethod(resolveBackend, "unloadPeerModel") as StartBridgeServerOptions["unloadPeerModel"],
    unloadLocalModel: bindBackendMethod(resolveBackend, "unloadLocalModel") as StartBridgeServerOptions["unloadLocalModel"],
    readLocalPolicy: bindBackendMethod(resolveBackend, "readLocalPolicy") as StartBridgeServerOptions["readLocalPolicy"],
    updateLocalPolicy: bindBackendMethod(resolveBackend, "updateLocalPolicy") as StartBridgeServerOptions["updateLocalPolicy"],
    readRolePolicy: bindBackendMethod(resolveBackend, "readRolePolicy") as StartBridgeServerOptions["readRolePolicy"],
    createRolePolicyRole: bindBackendMethod(resolveBackend, "createRolePolicyRole") as StartBridgeServerOptions["createRolePolicyRole"],
    updateRolePolicyRole: bindBackendMethod(resolveBackend, "updateRolePolicyRole") as StartBridgeServerOptions["updateRolePolicyRole"],
    listTaskDefinitions: bindBackendMethod(resolveBackend, "listTaskDefinitions") as StartBridgeServerOptions["listTaskDefinitions"],
    updateTaskDefinitions: bindBackendMethod(resolveBackend, "updateTaskDefinitions") as StartBridgeServerOptions["updateTaskDefinitions"],
    listSwapHistory: bindBackendMethod(resolveBackend, "listSwapHistory") as StartBridgeServerOptions["listSwapHistory"],
    getLocalLogs: bindBackendMethod(resolveBackend, "getLocalLogs") as StartBridgeServerOptions["getLocalLogs"],
    readModelOverrides: bindBackendMethod(resolveBackend, "readModelOverrides") as StartBridgeServerOptions["readModelOverrides"],
    updateModelOverrides: bindBackendMethod(resolveBackend, "updateModelOverrides") as StartBridgeServerOptions["updateModelOverrides"],
    readPeers: bindBackendMethod(resolveBackend, "readPeers") as StartBridgeServerOptions["readPeers"],
    updatePeers: bindBackendMethod(resolveBackend, "updatePeers") as StartBridgeServerOptions["updatePeers"],
    checkPeerHealth: bindBackendMethod(resolveBackend, "checkPeerHealth") as StartBridgeServerOptions["checkPeerHealth"],
    ...input.overrides,
  // SAFETY: the literal above supplies the complete 181-name field set; the cast names the exact
  // StartBridgeServerOptions type (every field comes from the moved binding ledger).
  } as StartBridgeServerOptions;
  // The provider methods are wrapped ON THE BACKEND (index.ts createRuntimeBridgeBackend ->
  // withBackendProviderPermits), so both the route binding here and the raw backend consumers (the
  // pairwise judge's executeChatCompletions handle) run under the same DAG permit.
  const owner = Object.freeze({
    [BACKEND_OWNER_BRAND]: true,
    id: "backend-owner:" + DEFAULT_COMPOSITION_CONFIG.instanceId,
    options,
    close: input.closeBackend,
  });
  // The owner travels WITH its options (non-enumerable symbol), so the server facade recovers the REAL
  // composed owner instead of re-branding plain options. Object.keys is unaffected (181-key ledger).
  Object.defineProperty(options, BACKEND_OWNER_REF, { enumerable: false, value: owner });
  return owner;
};

/** Recovers the REAL composed Backend owner that travels with its options (undefined for bare/test options). */
export const composedBackendOwnerOf = (options: StartBridgeServerOptions): BackendOwner | undefined => {
  const ref = Object(options)[BACKEND_OWNER_REF];
  return ref !== undefined && isComposedBackendOwner(ref) ? ref : undefined;
};
// S313 (R27): the DAG Server owner is the ONE lifecycle construction site. It consumes the composed
// Backend owner options plus a typed transport bundle from index.ts (listener factory, createServer,
// listen, close) and keeps the exact start/stop ordering: listener -> createServer -> listen; close is
// the transport's server.close only.
export const SERVER_OWNER_BRAND = Symbol.for("role-model-router.server-owner");

export const isComposedServerOwner = (owner: { readonly id?: string } | null | undefined): owner is ServerOwner =>
  owner !== null && Object.prototype.hasOwnProperty.call(owner, SERVER_OWNER_BRAND) && Object(owner)[SERVER_OWNER_BRAND] === true;

export const assertComposedServerOwner = (owner: { readonly id?: string } | null | undefined): ServerOwner => {
  if (!isComposedServerOwner(owner)) {
    throw new Error("Server owner was not constructed by the composition DAG (legacy local construction refused)");
  }
  return owner;
};

/** Opaque http server handle: the DAG never inspects it, it only passes it back to listen/close. */
export interface ServerHandle {
  readonly close?: unknown;
}

export interface ServerTransport {
  readonly createListener: (
    options: StartBridgeServerOptions,
    handlerFactory: (options: StartBridgeServerOptions) => (request: never, response: never) => Promise<void>,
  ) => (request: never, response: never) => void;
  readonly createServer: (listener: (request: never, response: never) => void, options: StartBridgeServerOptions) => ServerHandle;
  readonly listen: (server: ServerHandle, host: string, port: number) => Promise<number>;
  readonly close: (server: ServerHandle) => Promise<void>;
  /** Admission stop before join/interrupt; optional so simple test transports keep working. */
  readonly stopAccepting?: (server: ServerHandle) => Promise<void>;
  /** Joins in-flight work after admission stopped. */
  readonly join?: (server: ServerHandle) => Promise<void>;
  /** Interrupts remaining tasks after the join bound. */
  readonly interrupt?: (server: ServerHandle) => void;
}

export interface BackendOwnerClose {
  readonly close?: () => Promise<void>;
}

export interface ServerOwner {
  readonly id: string;
  readonly backend: BackendOwner;
  readonly start: () => Promise<{ readonly port: number; readonly close: () => Promise<void> }>;
  /** Ordered shutdown: stop admission -> join -> interrupt -> close transport -> close backend; release-all. */
  readonly shutdown: () => Promise<void>;
}

export const composeServerOwner = (input: {
  readonly backend: BackendOwner;
  readonly handlerFactory: (options: StartBridgeServerOptions) => (request: never, response: never) => Promise<void>;
  readonly transport: ServerTransport;
  /** Bounded join/drain before interrupt (default 10s). */
  readonly joinTimeoutMs?: number;
}): ServerOwner => {
  const backend = assertComposedBackendOwner(input.backend);
  // SAFETY: the brand symbol is the runtime identity marker; the static type is BackendOwner.
  const brandedBackend = backend as BackendOwner;
  let handle: ServerHandle | null = null;
  let shutdownPromise: Promise<void> | null = null;
  const owner = Object.freeze({
    [SERVER_OWNER_BRAND]: true,
    backend: brandedBackend,
    id: "server-owner:" + DEFAULT_COMPOSITION_CONFIG.instanceId,
    async start() {
      const listener = input.transport.createListener(backend.options, input.handlerFactory);
      const server = input.transport.createServer(listener, backend.options);
      handle = server;
      const port = await input.transport.listen(server, backend.options.host, backend.options.port);
      return {
        close: () => owner.shutdown(),
        port,
      };
    },
    shutdown() {
      if (shutdownPromise !== null) return shutdownPromise;
      shutdownPromise = (async () => {
        const server = handle;
        if (server === null) return;
        const steps: Array<() => Promise<void>> = [];
        if (input.transport.stopAccepting !== undefined) steps.push(() => input.transport.stopAccepting!(server));
        if (input.transport.join !== undefined) {
          const joinTimeoutMs = input.joinTimeoutMs ?? 10_000;
          steps.push(
            () =>
              new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => reject(new ServerJoinTimeoutError(joinTimeoutMs)), joinTimeoutMs);
                input.transport.join!(server).then(
                  () => { clearTimeout(timer); resolve(); },
                  (error: Error) => { clearTimeout(timer); reject(error); },
                );
              }),
          );
        }
        if (input.transport.interrupt !== undefined) steps.push(async () => { input.transport.interrupt!(server); });
        steps.push(() => input.transport.close(server));
        if (brandedBackend.close !== undefined) steps.push(() => brandedBackend.close!());
        await runReleaseAll(steps);
      })();
      return shutdownPromise;
    },
  });
  return owner;
};

/** TEST SEAM ONLY: bare StartBridgeServerOptions (tests that do not go through composeBackendOwner) are
 * branded for the facade. Production options always carry the REAL composed owner (composedBackendOwnerOf). */
export const testSeamBackendOwner = (options: StartBridgeServerOptions): BackendOwner => {
  const owner: BackendOwner = { id: "backend-owner:facade", options };
  Object.defineProperty(owner, BACKEND_OWNER_BRAND, { enumerable: false, value: true });
  return owner;
};

export const composeBootstrapOwner = (): BootstrapContract =>
  Effect.runSync(
    Effect.provide(
      Bootstrap.use((owner) => Effect.succeed(owner)),
      CompositionLayer,
    ),
  );

export const bootstrapOwner: BootstrapContract = composeBootstrapOwner();
