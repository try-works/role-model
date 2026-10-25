import { Command } from "@role-model-router/foldkit";
import { Effect, Exit, Option, Schema } from "effect";

import {
  type ControlClient,
  type ControlKey,
  ControlKeySchema,
  controlErrorMessage,
  controlFromResult,
} from "./control";
import {
  type DiagnosticsReadResult,
  type DiagnosticsReader,
  describeCause,
  parseDiagnosticsSnapshot,
} from "./diagnostics";
import { Message } from "./message";
import type { RuntimeConfigClient } from "./runtime-config";
import { type StudioClient, StudioState, studioRequestFor } from "./studio";
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
    args: { id: Schema.optional(Schema.String), key: ReadbackKeySchema, query: Schema.optional(Schema.String), token: Schema.Number },
    messages: [Message.ReadbackLoaded, Message.ReadbackFailed],
    execute: ({ id, key, query, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: (signal) => readers[key]({ id, query, signal }),
          }),
        ),
        (exit) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? Message.ReadbackLoaded({
                  key,
                  snapshot: readbackFromResult(READBACK_SPECS[key], exit.value, token, id),
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
/** S26k: one GET read per control page. */
export const defineReadControl = (client: ControlClient) =>
  Command.define("ReadControl", {
    args: { key: ControlKeySchema, token: Schema.Number },
    messages: [Message.ControlLoaded, Message.ControlFailed],
    execute: ({ key, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.read(key),
          }),
        ),
        (exit) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? Message.ControlLoaded({
                  key,
                  snapshot: controlFromResult(key, exit.value, token),
                  token,
                })
              : Message.ControlFailed({
                  key,
                  message: controlErrorMessage(
                    key === "controlController"
                      ? "Controller"
                      : key === "providers"
                        ? "Providers"
                        : "Endpoints",
                    0,
                    describeCause(
                      Option.getOrElse(
                        Exit.findErrorOption(exit),
                        () => new Error("control read failed"),
                      ),
                    ),
                  ),
                  token,
                }),
          ),
      ),
  });
export type ReadControlCommand = ReturnType<typeof defineReadControl>;

/** S26k: one explicit non-destructive dispatch per control action. */
export const defineDispatchControl = (client: ControlClient) =>
  Command.define("DispatchControl", {
    args: { endpointId: Schema.optional(Schema.String), key: ControlKeySchema, token: Schema.Number },
    messages: [Message.ControlActionCompleted, Message.ControlActionFailed],
    execute: ({ endpointId, key, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.dispatch(key, endpointId),
          }),
        ),
        (exit) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? exit.value.status >= 200 && exit.value.status < 300
                ? Message.ControlActionCompleted({
                    key,
                    serverEndpointId: (() => { const record = exit.value.body; return record !== null && typeof record === "object" && "endpointId" in record && typeof record.endpointId === "string" ? record.endpointId : endpointId; })(),
                    message:
                      key === "providers"
                        ? "Providers action completed."
                        : key === "endpoints"
                          ? "Endpoints action completed."
                          : "Controller action completed.",
                    token,
                  })
                : Message.ControlActionFailed({
                    key,
                    message:
                      key === "providers"
                        ? `Providers action failed: HTTP ${String(exit.value.status)}`
                        : key === "endpoints"
                          ? `Endpoints action failed: HTTP ${String(exit.value.status)}`
                          : `Controller action failed: HTTP ${String(exit.value.status)}${(() => { const record = exit.value.body; const reason = record !== null && typeof record === "object" && "message" in record && typeof record.message === "string" ? record.message : undefined; return reason === undefined ? "" : ` (${reason})`; })()}`, 
                    token,
                  })
              : Message.ControlActionFailed({
                  key,
                  message: `${key === "controlController" ? "Controller" : key === "providers" ? "Providers" : "Endpoints"} action failed: ${describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("control action failed")))})`,
                  token,
                }),
          ),
      ),
  });
export type DispatchControlCommand = ReturnType<typeof defineDispatchControl>;
export const defineSaveRuntimeConfig = (client: RuntimeConfigClient) =>
  Command.define("SaveRuntimeConfig", {
    args: { configText: Schema.String, token: Schema.Number },
    messages: [Message.RuntimeConfigSaved, Message.RuntimeConfigSaveFailed],
    execute: ({ configText, token }) => {
      let config: Readonly<Record<string, unknown>>;
      try { const parsed: unknown = JSON.parse(configText); if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Config must be a JSON object."); config = parsed as Readonly<Record<string, unknown>>; } catch (error) { return Effect.succeed(Message.RuntimeConfigSaveFailed({ message: error instanceof Error ? error.message : "Invalid JSON.", status: 0, token })); }
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.save(config) })), (saveExit) =>
        Exit.isSuccess(saveExit) && saveExit.value.status >= 200 && saveExit.value.status < 300
          ? Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.read() })), (readExit) => Effect.succeed(Exit.isSuccess(readExit) ? Message.RuntimeConfigSaved({ recordJson: JSON.stringify(readExit.value.body), status: readExit.value.status, token }) : Message.RuntimeConfigSaveFailed({ message: "Runtime config re-read failed: " + describeCause(Option.getOrElse(Exit.findErrorOption(readExit), () => new Error("read failed"))), status: 0, token })))
          : Effect.succeed(Message.RuntimeConfigSaveFailed({ message: "Runtime config save failed: HTTP " + String(Exit.isSuccess(saveExit) ? saveExit.value.status : 0) + (Exit.isSuccess(saveExit) ? (() => { const record = saveExit.value.body; const reason = record !== null && typeof record === "object" && "message" in record && typeof record.message === "string" ? record.message : undefined; return reason === undefined ? "" : " (" + reason + ")"; })() : ""), status: Exit.isSuccess(saveExit) ? saveExit.value.status : 0, token })),
      );
    },
  });
export type SaveRuntimeConfigCommand = ReturnType<typeof defineSaveRuntimeConfig>;
export const defineDispatchStudio = (client: StudioClient) =>
  Command.define("DispatchStudio", {
    args: { state: StudioState, token: Schema.Number },
    messages: [Message.StudioLoaded, Message.StudioFailed],
    execute: ({ state, token }) => {
      const request = studioRequestFor(state);
      if ("error" in request) {
        return Effect.succeed(Message.StudioFailed({ message: request.error, statusCode: 0, responseText: "", token }));
      }
      return Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(cause instanceof Error ? cause.message : "Studio request failed"),
            try: (signal) => client(request, signal),
          }),
        ),
        (exit) =>
          Effect.succeed(
            Exit.isSuccess(exit)
              ? Message.StudioLoaded({ responseText: exit.value.text, statusCode: exit.value.status, tab: request.tab, token })
              : Message.StudioFailed({ message: "Studio request failed", statusCode: 0, responseText: "", token }),
          ),
      );
    },
  });
export type DispatchStudioCommand = ReturnType<typeof defineDispatchStudio>;
