import { Subscription } from "@role-model-router/foldkit";
import type { Subscriptions } from "@role-model-router/foldkit/subscription";
import { Effect, Queue, Schema, Stream } from "effect";

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
        source.addEventListener("revision.update", (event) => {
          const revision = decodeRevision(event);
          if (revision !== null) {
            Queue.offerUnsafe(queue, Message.RuntimeRevisionReceived({ revision }));
          }
        });
        return source;
      }),
      (source) => Effect.sync(() => source.close()),
    ),
  );

/** The shell's single Subscription entry; no route owns a second source. */
export const makeRefreshSubscriptions = (
  factory: RuntimeEventSourceFactory,
): Subscriptions<Model, Message> =>
  Subscription.make<Model, Message>()(() => ({
    refresh: Subscription.persistentEntry(refreshRevisionStream(factory)),
  }));
