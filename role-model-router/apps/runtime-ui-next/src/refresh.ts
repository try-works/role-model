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

export const refreshRevisionStream = (
  factory: RuntimeEventSourceFactory,
): Stream.Stream<Message, never> =>
  Stream.callback<Message>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const source = factory(REFRESH_STREAM_URL);
        // A real EventSource detaches its listeners on close, but a retaining source can still invoke
        // them. Offering into a finalised queue must never happen, so every offer is guarded by this
        // stream instance's own active flag, set false by the finalizer before the source closes.
        const state = { active: true };
        const offer = (message: Message): void => {
          if (state.active) Queue.offerUnsafe(queue, message);
        };
        source.addEventListener("revision.update", (event) => {
          const revision = decodeRevision(event);
          if (revision !== null) {
            offer(Message.RuntimeRevisionReceived({ revision }));
          }
        });
        // S278 (R12): the same one source also carries newly persisted telemetry requests. A
        // malformed event is ignored rather than classified as a revision, so the watermark and the
        // gap/resync token can never be polluted by a telemetry payload.
        source.addEventListener("telemetry.update", (event) => {
          const telemetry = decodeTelemetry(event);
          if (telemetry !== null) {
            offer(
              Message.RuntimeTelemetryReceived({
                emittedAtMs: telemetry.emittedAtMs,
                requestId: telemetry.requestId,
              }),
            );
          }
        });
        return { source, state };
      }),
      ({ source, state }) =>
        Effect.sync(() => {
          state.active = false;
          source.close();
        }),
    ),
  );

/** The shell's single Subscription entry; no route owns a second source. */
export const makeRefreshSubscriptions = (
  factory: RuntimeEventSourceFactory,
): Subscriptions<Model, Message> =>
  Subscription.make<Model, Message>()(() => ({
    refresh: Subscription.persistentEntry(refreshRevisionStream(factory)),
  }));
