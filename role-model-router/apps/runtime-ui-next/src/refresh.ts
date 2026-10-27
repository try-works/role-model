import { Subscription } from "@role-model-router/foldkit";
import type { Subscriptions } from "@role-model-router/foldkit/subscription";
import { Effect, Option, Queue, Schema, Stream } from "effect";

import { Message } from "./message";
import type { Model } from "./model";

/**
 * Run 115 S25b (R12): the Foldkit client's one shell-owned refresh subscription.
 *
 * The event source is injected (defaults to a real EventSource); the subscription emits only the
 * revision signal. The shell owns the single subscription and disposes it when the runtime stops.
 * Gap detection/resync lives in update.ts so it remains a pure transition.
 */

export interface RuntimeEventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export type RuntimeEventSourceFactory = (url: string) => RuntimeEventSourceLike;

/** The browser page lifecycle surface the stream owns; injectable so tests need no global mock. */
export interface RuntimePageLifecycle {
  addEventListener(type: "pagehide" | "pageshow", listener: (event: Event) => void): void;
  removeEventListener(type: "pagehide" | "pageshow", listener: (event: Event) => void): void;
}

export const REFRESH_STREAM_URL = "/api/role-model/telemetry/stream";

const inertSource: RuntimeEventSourceLike = {
  addEventListener: () => undefined,
  close: () => undefined,
};

export const defaultRuntimeEventSourceFactory: RuntimeEventSourceFactory = (url) => {
  // happy-dom/the server render has no EventSource; production has the browser one.
  if (typeof EventSource === "undefined") return inertSource;
  return new EventSource(url);
};

export const RuntimeRefreshState = Schema.Struct({
  lastAppliedRevision: Schema.Number,
  message: Schema.optional(Schema.String),
  resyncToken: Schema.Number,
  status: Schema.Literals(["idle", "live", "stale"]),
});
export type RuntimeRefreshState = typeof RuntimeRefreshState.Type;

export const initialRuntimeRefreshState = (): RuntimeRefreshState => ({
  lastAppliedRevision: 0,
  resyncToken: 0,
  status: "idle",
});

/**
 * S278 (R12): the real telemetry event contract (`runtime-api.ts:693-698`): eventName,
 * emittedAtMs and the persisted request. It carries NO revision, so this decoder can only ever
 * produce a route invalidation — never a topology revision number.
 */
const RuntimeTelemetryEvent = Schema.Struct({
  emittedAtMs: Schema.Number,
  eventName: Schema.Literals(["telemetry.update"]),
  request: Schema.Struct({ requestId: Schema.String }),
});

const decodeTelemetry = (
  event: MessageEvent<string>,
): { readonly emittedAtMs: number; readonly requestId: string } | null => {
  try {
    const decoded = Schema.decodeUnknownOption(RuntimeTelemetryEvent)(JSON.parse(event.data));
    if (Option.isNone(decoded)) return null;
    const { emittedAtMs, request } = decoded.value;
    // `Schema.Number` only proves the value is a number: JSON.parse turns 1e999 into Infinity, and a
    // fractional timestamp is not a real emittedAtMs either. Require the same bounded integer the
    // revision decoder requires, and an identity that can invalidate something honestly.
    if (!Number.isSafeInteger(emittedAtMs)) return null;
    return request.requestId.length === 0 ? null : { emittedAtMs, requestId: request.requestId };
  } catch {
    return null;
  }
};

const decodeRevision = (event: MessageEvent<string>): number | null => {
  try {
    const parsed = JSON.parse(event.data) as { revision?: unknown };
    return typeof parsed.revision === "number" && Number.isSafeInteger(parsed.revision)
      ? parsed.revision
      : null;
  } catch {
    return null;
  }
};

interface RefreshGeneration {
  readonly source: RuntimeEventSourceLike;
  active: boolean;
}

interface EventPersisted extends Event {
  readonly persisted: boolean;
}

const isPersistedPageshow = (event: Event): event is EventPersisted =>
  "persisted" in event && event.persisted === true;

export const refreshRevisionStream = (
  factory: RuntimeEventSourceFactory,
  pageLifecycle?: RuntimePageLifecycle,
): Stream.Stream<Message, never> =>
  Stream.callback<Message>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target = pageLifecycle ?? (typeof window === "undefined" ? undefined : window);
        // S290: the stream owns ONE browser connection at a time. Each opened generation carries its
        // own active guard, so a retired source that still invokes its listeners can never publish
        // after a persisted pageshow reopened the connection, and the acquireRelease owner is the only
        // place that closes it.
        let current: RefreshGeneration | null = null;
        let disposed = false;
        const closeCurrent = (): void => {
          const generation = current;
          current = null;
          if (generation === null) return;
          generation.active = false;
          try {
            generation.source.close();
          } catch {
            // A source that already closed itself must not fail the owner; the guard is retired above.
          }
        };
        const open = (announceRestore: boolean): void => {
          const generation: RefreshGeneration = { active: true, source: factory(REFRESH_STREAM_URL) };
          current = generation;
          const publish = (message: Message): void => {
            if (generation.active) Queue.offerUnsafe(queue, message);
          };
          try {
            generation.source.addEventListener("revision.update", (event) => {
              const revision = decodeRevision(event);
              if (revision !== null) publish(Message.RuntimeRevisionReceived({ revision }));
            });
            // S278 (R12): the same one source also carries newly persisted telemetry requests. A
            // malformed event is ignored rather than classified as a revision, so the watermark and the
            // gap/resync token can never be polluted by a telemetry payload.
            generation.source.addEventListener("telemetry.update", (event) => {
              const telemetry = decodeTelemetry(event);
              if (telemetry !== null) {
                publish(
                  Message.RuntimeTelemetryReceived({
                    emittedAtMs: telemetry.emittedAtMs,
                    requestId: telemetry.requestId,
                  }),
                );
              }
            });
          } catch (error) {
            // A partially attached generation must not leak: retire and close it, then propagate.
            generation.active = false;
            if (current === generation) current = null;
            try {
              generation.source.close();
            } catch {
              // The attach failure is the error worth propagating.
            }
            throw error;
          }
          if (announceRestore) publish(Message.RuntimePageRestored({}));
        };
        open(false);
        // BFCache-safe: pagehide always releases the connection (a persisted page may be suspended for
        // an unbounded time); only a persisted pageshow may reopen it, and only once per suspension.
        const onPagehide = (): void => {
          if (!disposed) closeCurrent();
        };
        const reportRestoreFailure = (error: unknown): void => {
          try {
            console.error("[refresh] persisted pageshow restore failed", error);
          } catch {
            // Reporting must never turn a failed restore into a thrown page callback.
          }
        };
        const onPageshow = (event: Event): void => {
          if (disposed || current !== null || !isPersistedPageshow(event)) return;
          // A factory failure must not escape a page callback: report it, keep the owner usable and
          // let the next persisted pageshow retry the reopen.
          try {
            open(true);
          } catch (error) {
            reportRestoreFailure(error);
          }
        };
        try {
          target?.addEventListener("pagehide", onPagehide);
          target?.addEventListener("pageshow", onPageshow);
        } catch (error) {
          target?.removeEventListener("pagehide", onPagehide);
          target?.removeEventListener("pageshow", onPageshow);
          closeCurrent();
          throw error;
        }
        return {
          dispose: (): void => {
            disposed = true;
            closeCurrent();
            target?.removeEventListener("pagehide", onPagehide);
            target?.removeEventListener("pageshow", onPageshow);
          },
        };
      }),
      ({ dispose }) => Effect.sync(dispose),
    ),
  );

/** The shell's single Subscription entry; no route owns a second source. */
export const makeRefreshSubscriptions = (
  factory: RuntimeEventSourceFactory,
): Subscriptions<Model, Message> =>
  Subscription.make<Model, Message>()(() => ({
    refresh: Subscription.persistentEntry(refreshRevisionStream(factory)),
  }));
