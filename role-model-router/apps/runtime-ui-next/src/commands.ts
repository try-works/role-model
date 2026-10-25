import { Command } from "@role-model-router/foldkit";
import { Effect, Exit, Option, Schema } from "effect";

import {
  type DiagnosticsReadResult,
  type DiagnosticsReader,
  describeCause,
  parseDiagnosticsSnapshot,
} from "./diagnostics";
import { Message } from "./message";
import { type ObservabilityReader, parseObservabilitySnapshot } from "./observability";
import { ReadbackKeySchema } from "./readback";
import {
  READBACK_SPECS,
  type ReadbackKey,
  type ReadbackReader,
  readbackFromResult,
} from "./readback";

/**
 * The diagnostics read is a Command whose execute is an Effect.tryPromise over the injected
 * reader. The runtime runs the batch after update returns (src/update/update.ts:124-127) and then
 * dispatches the Message this Effect produces (src/command/index.ts:12-24, :130-166). The thunk
 * declares `signal`, so Effect.tryPromise forwards an AbortSignal
 * (vendor/effect/packages/effect/src/Effect.ts:1008-1013; internal/effect.ts:1166).
 */
export const defineReadDiagnostics = (reader: DiagnosticsReader) =>
  Command.define("ReadDiagnostics", {
    args: { id: Schema.String },
    messages: [Message.DiagnosticsLoaded, Message.DiagnosticsFailed],
    execute: ({ id }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: (signal) => reader({ id, signal }),
          }),
        ),
        (exit: Exit.Exit<DiagnosticsReadResult, Error>) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? Message.DiagnosticsLoaded({
                  id,
                  snapshot: parseDiagnosticsSnapshot(id, exit.value),
                })
              : Message.DiagnosticsFailed({
                  id,
                  message: describeCause(
                    Option.getOrElse(
                      Exit.findErrorOption(exit),
                      () => new Error("diagnostics read failed"),
                    ),
                  ),
                }),
          ),
      ),
  });

export type ReadDiagnosticsCommand = ReturnType<typeof defineReadDiagnostics>;
/** Injected shell snapshot read used by the gap-triggered resync Command. */
export interface RefreshSnapshotReaderInput {
  readonly token: number;
  /** The route whose snapshot is being resynced (empty for non-data routes). */
  readonly routeId: string;
  readonly signal: AbortSignal;
}
export type RefreshSnapshotReader = (
  input: RefreshSnapshotReaderInput,
) => Promise<DiagnosticsReadResult | undefined>;

/**
 * S25b: one explicit snapshot resync Command. It is dispatched as soon as a revision gap is
 * observed, so it runs even when no later event ever arrives. The token fences the result: an
 * older resync cannot overwrite a newer one.
 */
export const defineRefreshSnapshot = (readSnapshot: RefreshSnapshotReader) =>
  Command.define("RefreshSnapshot", {
    args: { routeId: Schema.String, token: Schema.Number },
    messages: [Message.RefreshResynced, Message.RefreshResyncFailed],
    execute: ({ routeId, token }): Effect.Effect<RefreshResyncMessage, never, never> =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: (signal) => readSnapshot({ routeId, signal, token }),
          }),
        ),
        (exit): Effect.Effect<RefreshResyncMessage, never, never> => {
          if (Exit.isSuccess(exit) && exit.value !== undefined) {
            return Effect.succeed(
              Message.RefreshResynced({
                routeId,
                snapshot: parseDiagnosticsSnapshot(routeId, exit.value),
                token,
              }),
            );
          }
          return Effect.succeed(
            Message.RefreshResyncFailed({
              message: Exit.isSuccess(exit)
                ? "snapshot payload is not applicable to this route"
                : describeCause(
                    Option.getOrElse(
                      Exit.findErrorOption(exit),
                      () => new Error("snapshot resync failed"),
                    ),
                  ),
              routeId,
              token,
            }),
          );
        },
      ),
  });

export type RefreshSnapshotCommand = ReturnType<typeof defineRefreshSnapshot>;
type RefreshResyncMessage = Extract<
  Message,
  { readonly _tag: "RefreshResynced" | "RefreshResyncFailed" }
>;
/** S26d: the wave-2 read Command; the reader is injected with a real fetch client by default. */
export const defineReadObservability = (reader: ObservabilityReader) =>
  Command.define("ReadObservability", {
    args: { token: Schema.Number },
    messages: [Message.ObservabilityLoaded, Message.ObservabilityFailed],
    execute: ({ token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: (signal) => reader({ signal }),
          }),
        ),
        (exit) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? Message.ObservabilityLoaded({
                  snapshot: parseObservabilitySnapshot(exit.value),
                  token,
                })
              : Message.ObservabilityFailed({
                  message: `Observability read failed: ${describeCause(
                    Option.getOrElse(Exit.findErrorOption(exit), () => new Error("read failed")),
                  )}`,
                  token,
                }),
          ),
      ),
  });

export type ReadObservabilityCommand = ReturnType<typeof defineReadObservability>;
/** S26e: one Command for the four shared readback routes, with per-route readers. */
export const defineReadReadback = (readers: Readonly<Record<ReadbackKey, ReadbackReader>>) =>
  Command.define("ReadReadback", {
    args: { key: ReadbackKeySchema, token: Schema.Number },
    messages: [Message.ReadbackLoaded, Message.ReadbackFailed],
    execute: ({ key, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: (signal) => readers[key]({ signal }),
          }),
        ),
        (exit) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? Message.ReadbackLoaded({
                  key,
                  snapshot: readbackFromResult(READBACK_SPECS[key], exit.value, token),
                  token,
                })
              : Message.ReadbackFailed({
                  key,
                  message: `${READBACK_SPECS[key].label} read failed: ${describeCause(
                    Option.getOrElse(Exit.findErrorOption(exit), () => new Error("read failed")),
                  )}`,
                  token,
                }),
          ),
      ),
  });

export type ReadReadbackCommand = ReturnType<typeof defineReadReadback>;
