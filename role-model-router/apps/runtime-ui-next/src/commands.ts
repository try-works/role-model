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
import { type DeviceAuthClient, type DeviceAuthStartPayload, type DeviceActivationPayload } from "./device-auth";
import { type ProviderAccountActivationBatch, type ProviderAccountClient, type ProviderAccountCreatePayload } from "./provider-account";
import { type RouterBlockSavePayload, type RouterConfigClient, type RouterPostureSavePayload } from "./router-config";
import { type RetentionPolicyPayload, type StorageRetentionClient } from "./storage-retention";
import { type EndpointActivationPayload, type EndpointAdmissionClient, type EndpointBatchPayload } from "./endpoint-admission";
import { type LearningRankingClient, type LearningRollbackPayload } from "./learning-ranking";
import { type RequestsRankingClient, type RequestsRankingQuery } from "./requests-ranking";
import { Message } from "./message";
import { createRuntimeConfigClient, type RuntimeConfigClient } from "./runtime-config";
import { type StudioClient, StudioState, studioRequestFor } from "./studio";
import { type ObservabilityReader, parseObservabilitySnapshot } from "./observability";
import { type RuntimeHttpClient, createRuntimeHttpClient } from "./http/runtime-client";
import { readStoredOperatorToken } from "./operator-token";
import { ReadbackKeySchema } from "./readback";
import {
  READBACK_SPECS,
  type LocalPolicyObject,
  type ReadbackKey,
  type ReadbackReader,
  readbackFromResult,
} from "./readback";
import { READBACK_PATHS } from "./runtime-endpoints";

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
    args: { configText: Schema.String, originalText: Schema.String, token: Schema.Number },
    messages: [Message.RuntimeConfigSaved, Message.RuntimeConfigSaveFailed],
    execute: ({ configText, originalText, token }): Effect.Effect<ReturnType<typeof Message.RuntimeConfigSaved> | ReturnType<typeof Message.RuntimeConfigSaveFailed>> => {
      let config: Readonly<Record<string, unknown>>;
      try { const parsed: unknown = JSON.parse(configText); if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Config must be a JSON object."); config = parsed as Readonly<Record<string, unknown>>; } catch (error) { return Effect.succeed(Message.RuntimeConfigSaveFailed({ message: error instanceof Error ? error.message : "Invalid JSON.", status: 0, token })); }
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.read() })), (checkExit) => {
        if (!Exit.isSuccess(checkExit)) return Effect.succeed(Message.RuntimeConfigSaveFailed({ message: "Runtime config re-read failed before save", status: 0, token }));
        let currentText = "{}";
        try { const record = checkExit.value.body as { config?: unknown }; if (record.config !== null && typeof record.config === "object") currentText = JSON.stringify(record.config, null, 2); } catch {}
        if (currentText !== originalText) return Effect.succeed(Message.RuntimeConfigSaveFailed({ message: "Server config changed since Load; review the new snapshot before saving.", status: 0, token }));
        return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.save(config) })), (saveExit) =>
        Exit.isSuccess(saveExit) && saveExit.value.status >= 200 && saveExit.value.status < 300
          ? Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.read() })), (readExit) => Effect.succeed(Exit.isSuccess(readExit) ? Message.RuntimeConfigSaved({ recordJson: JSON.stringify(readExit.value.body), status: readExit.value.status, token }) : Message.RuntimeConfigSaveFailed({ message: "Runtime config re-read failed: " + describeCause(Option.getOrElse(Exit.findErrorOption(readExit), () => new Error("read failed"))), status: 0, token })))
          : Effect.succeed(Message.RuntimeConfigSaveFailed({ message: "Runtime config save failed: HTTP " + String(Exit.isSuccess(saveExit) ? saveExit.value.status : 0) + (Exit.isSuccess(saveExit) ? (() => { const record = saveExit.value.body; const reason = record !== null && typeof record === "object" && "message" in record && typeof record.message === "string" ? record.message : undefined; return reason === undefined ? "" : " (" + reason + ")"; })() : ""), status: Exit.isSuccess(saveExit) ? saveExit.value.status : 0, token })),
      );
      });
    },
  });
export type SaveRuntimeConfigCommand = ReturnType<typeof defineSaveRuntimeConfig>;
export const defineReplayAutoQueueCommands = (client: RuntimeConfigClient) => ({
  save: Command.define("ReplayAutoQueueSave", {
    args: { dailyCap: Schema.Number, enabled: Schema.Boolean, token: Schema.Number },
    messages: [Message.ReplayAutoQueueSaved, Message.ReplayAutoQueueSaveFailed],
    execute: ({ dailyCap, enabled, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.patchReplayAutoQueue({ dailyCap, enabled }),
          }),
        ),
        (exit) => Effect.succeed(
          Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
            ? Message.ReplayAutoQueueSaved({ token })
            : Message.ReplayAutoQueueSaveFailed({
                message: "Replay auto-queue save failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0),
                token,
              }),
        ),
      ),
  }),
});
export type ReplayAutoQueueCommands = ReturnType<typeof defineReplayAutoQueueCommands>;
export const noopReplayAutoQueueCommands = defineReplayAutoQueueCommands(createRuntimeConfigClient({ fetchImpl: async () => new Response("{}", { status: 200 }) }));
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

export const defineDeviceAuthCommands = (client: DeviceAuthClient) => ({
  activate: Command.define("ActivateDeviceEndpoint", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.activate(JSON.parse(payload) as DeviceActivationPayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.DeviceAuthActivated({ token }) : Message.DeviceAuthFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("device authorization request failed"))), token })),
      ),
    messages: [Message.DeviceAuthActivated, Message.DeviceAuthFailed],
  }),
  poll: Command.define("PollDeviceAuthorization", {
    args: { authRequestId: Schema.String, delayMs: Schema.Number, intervalMs: Schema.Number, token: Schema.Number },
    execute: ({ authRequestId, delayMs, intervalMs, token }) =>
      Effect.flatMap(Effect.sleep(delayMs), () =>
        Effect.flatMap(
          Effect.exit(
            Effect.tryPromise({
              catch: (cause) => new Error(describeCause(cause)),
              try: () => client.poll(authRequestId),
            }),
          ),
          (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.DeviceAuthPolled({ session: exit.value, token }) : Message.DeviceAuthFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("device authorization request failed"))), token })),
        ),
      ),
    messages: [Message.DeviceAuthPolled, Message.DeviceAuthFailed],
    // S459: the scheduled poll owns the sleep+request lifetime, so cancel must interrupt it by the
    // authorization identity (the token advances every poll and is not a stable address).
    interrupt: {
      keyFields: ["authRequestId"],
      toKey: ({ authRequestId }) => "device-auth-poll:" + authRequestId,
    },
  }),
  read: Command.define("ReadDeviceAuthorizations", {
    args: { token: Schema.Number },
    execute: ({ token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.list(),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.DeviceAuthSessionsLoaded({ sessions: [...exit.value], token }) : Message.DeviceAuthFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("device authorization request failed"))), token })),
      ),
    messages: [Message.DeviceAuthSessionsLoaded, Message.DeviceAuthFailed],
  }),
  start: Command.define("StartDeviceAuthorization", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.start(JSON.parse(payload) as DeviceAuthStartPayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.DeviceAuthStarted({ session: exit.value, token }) : Message.DeviceAuthFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("device authorization request failed"))), token })),
      ),
    messages: [Message.DeviceAuthStarted, Message.DeviceAuthFailed],
  }),
});
export type DeviceAuthCommands = ReturnType<typeof defineDeviceAuthCommands>;
const noopDeviceAuthClient: DeviceAuthClient = {
  activate: async () => ({}),
  list: async () => [],
  poll: async () => ({ authRequestId: "", providerAccountId: "", status: "pending" }),
  start: async () => ({ authRequestId: "", providerAccountId: "", status: "pending" }),
};
export const noopDeviceAuthCommands = defineDeviceAuthCommands(noopDeviceAuthClient);

export const defineProviderAccountCommands = (client: ProviderAccountClient) => ({
  activate: Command.define("ActivateProviderAccountEndpoints", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.activate(JSON.parse(payload) as ProviderAccountActivationBatch),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.ProviderAccountEndpointsActivated({ token }) : Message.ProviderAccountFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("provider endpoint activation failed"))), token })),
      ),
    messages: [Message.ProviderAccountEndpointsActivated, Message.ProviderAccountFailed],
  }),
  create: Command.define("CreateProviderAccount", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.create(JSON.parse(payload) as ProviderAccountCreatePayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.ProviderAccountCreateSucceeded({ token }) : Message.ProviderAccountFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("provider account save failed"))), token })),
      ),
    messages: [Message.ProviderAccountCreateSucceeded, Message.ProviderAccountFailed],
  }),
  deleteModel: Command.define("DeleteProviderAccountModel", {
    args: { modelId: Schema.String, providerAccountId: Schema.String, token: Schema.Number },
    execute: ({ modelId, providerAccountId, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.deleteModel(providerAccountId, modelId),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.ProviderAccountModelDeleted({ modelId, token }) : Message.ProviderAccountFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("provider model removal failed"))), token })),
      ),
    messages: [Message.ProviderAccountModelDeleted, Message.ProviderAccountFailed],
  }),
  updateKey: Command.define("UpdateProviderAccountKey", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.updateKey(JSON.parse(payload) as { apiKey: string; providerAccountId: string }),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.ProviderAccountKeyUpdated({ token }) : Message.ProviderAccountFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("provider key update failed"))), token })),
      ),
    messages: [Message.ProviderAccountKeyUpdated, Message.ProviderAccountFailed],
  }),
});
export type ProviderAccountCommands = ReturnType<typeof defineProviderAccountCommands>;
const noopProviderAccountClient: ProviderAccountClient = {
  activate: async () => ({}),
  create: async () => ({}),
  deleteModel: async () => ({}),
  updateKey: async () => ({}),
};
export const noopProviderAccountCommands = defineProviderAccountCommands(noopProviderAccountClient);

export const defineRouterConfigCommands = (client: RouterConfigClient) => ({
  saveBlock: Command.define("SaveRouterConfigBlock", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.saveBlock(JSON.parse(payload) as RouterBlockSavePayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.RouterPostureSaved({ token }) : Message.RouterPostureFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("router config update failed"))), token })),
      ),
    messages: [Message.RouterPostureSaved, Message.RouterPostureFailed],
  }),
  savePosture: Command.define("SaveRouterPosture", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.savePosture(JSON.parse(payload) as RouterPostureSavePayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.RouterPostureSaved({ token }) : Message.RouterPostureFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("router config update failed"))), token })),
      ),
    messages: [Message.RouterPostureSaved, Message.RouterPostureFailed],
  }),
});
export type RouterConfigCommands = ReturnType<typeof defineRouterConfigCommands>;
const noopRouterConfigClient: RouterConfigClient = {
  saveBlock: async () => ({}),
  savePosture: async () => ({}),
};
export const noopRouterConfigCommands = defineRouterConfigCommands(noopRouterConfigClient);

export interface OperatorLearningClient {
  readonly killSwitch: (body: Record<string, unknown>) => Promise<unknown>;
  readonly rollback: () => Promise<unknown>;
  readonly rollbackPack: (body: Record<string, unknown>) => Promise<unknown>;
  readonly updateMode: (mode: string) => Promise<unknown>;
}
export const createOperatorLearningClient = (http: RuntimeHttpClient): OperatorLearningClient => ({
  killSwitch: (body) => http.request<unknown, Record<string, unknown>>({ method: "POST", path: "/api/role-model/operator/learning/kill-switch", body }),
  rollback: () => http.request<unknown, Record<string, never>>({ method: "POST", path: "/api/role-model/operator/learning/rollback", body: {} }),
  rollbackPack: (body) => http.request<unknown, Record<string, unknown>>({ method: "POST", path: "/api/role-model/operator/learning/rollback-pack", body }),
  updateMode: (mode) => http.request<unknown, { mode: string }>({ method: "POST", path: "/api/role-model/operator/learning/mode", body: { mode } }),
});
export const defineOperatorLearningCommands = (client: OperatorLearningClient) => ({
  killSwitch: Command.define("LearningKillSwitch", {
    args: { engaged: Schema.Boolean, scopeId: Schema.String, token: Schema.Number },
    execute: ({ engaged, scopeId, token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({
          catch: (cause) => new Error(describeCause(cause)),
          try: () => client.killSwitch(engaged ? { scopeId } : { engaged: false, scopeId }),
        })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.LearningKillSwitchSucceeded({ token }) : Message.LearningKillSwitchFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("learning kill switch failed"))), token })),
      ),
    messages: [Message.LearningKillSwitchSucceeded, Message.LearningKillSwitchFailed],
  }),
  rollbackPack: Command.define("LearningPackRollback", {
    args: { scopeId: Schema.String, token: Schema.Number },
    execute: ({ scopeId, token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({
          catch: (cause) => new Error(describeCause(cause)),
          try: () => client.rollbackPack({ reason: "operator_ui_rollback", scopeId }),
        })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.LearningPackRollbackSucceeded({ token }) : Message.LearningPackRollbackFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("learning pack rollback failed"))), token })),
      ),
    messages: [Message.LearningPackRollbackSucceeded, Message.LearningPackRollbackFailed],
  }),
  rollback: Command.define("LearningRollback", {
    args: { token: Schema.Number },
    execute: ({ token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.rollback() })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.LearningModeSucceeded({ token }) : Message.LearningModeFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("learning rollback failed"))), token })),
      ),
    messages: [Message.LearningModeSucceeded, Message.LearningModeFailed],
  }),
  updateMode: Command.define("LearningModeUpdate", {
    args: { mode: Schema.String, token: Schema.Number },
    execute: ({ mode, token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.updateMode(mode) })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.LearningModeSucceeded({ token }) : Message.LearningModeFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("learning mode update failed"))), token })),
      ),
    messages: [Message.LearningModeSucceeded, Message.LearningModeFailed],
  }),
});
export type OperatorLearningCommands = ReturnType<typeof defineOperatorLearningCommands>;
const noopOperatorLearningClient: OperatorLearningClient = {
  killSwitch: async () => ({}),
  rollback: async () => ({}),
  rollbackPack: async () => ({}),
  updateMode: async () => ({}),
};
export const noopOperatorLearningCommands = defineOperatorLearningCommands(noopOperatorLearningClient);

export const defineStorageRetentionCommands = (client: StorageRetentionClient) => ({
  dryRun: Command.define("RetentionDryRun", {
    args: { token: Schema.Number },
    execute: ({ token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.dryRun() })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.RetentionSucceeded({ token, ...(Exit.isSuccess(exit) && exit.value.manifestHash !== undefined ? { manifestHash: exit.value.manifestHash } : {}) }) : Message.RetentionFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("storage retention dry-run failed"))), token })),
      ),
    messages: [Message.RetentionSucceeded, Message.RetentionFailed],
  }),
  execute: Command.define("RetentionExecute", {
    args: { manifestHash: Schema.String, token: Schema.Number },
    execute: ({ manifestHash, token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.execute(manifestHash) })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.RetentionSucceeded({ token }) : Message.RetentionFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("storage retention execute failed"))), token })),
      ),
    messages: [Message.RetentionSucceeded, Message.RetentionFailed],
  }),
  savePolicy: Command.define("RetentionSavePolicy", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.savePolicy(JSON.parse(payload) as RetentionPolicyPayload) })),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.RetentionSucceeded({ token }) : Message.RetentionFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("storage retention policy save failed"))), token })),
      ),
    messages: [Message.RetentionSucceeded, Message.RetentionFailed],
  }),
});
export type StorageRetentionCommands = ReturnType<typeof defineStorageRetentionCommands>;
const noopStorageRetentionClient: StorageRetentionClient = {
  dryRun: async () => ({}),
  execute: async () => ({}),
  savePolicy: async () => ({}),
};
export const noopStorageRetentionCommands = defineStorageRetentionCommands(noopStorageRetentionClient);
export const defineEndpointAdmissionCommands = (client: EndpointAdmissionClient) => ({
  activate: Command.define("ActivateEndpoint", {
    args: { activationId: Schema.String, generation: Schema.Number, payload: Schema.String },
    execute: ({ activationId, generation, payload }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.activate(JSON.parse(payload) as EndpointActivationPayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.EndpointAdmissionSucceeded({ activationId, generation }) : Message.EndpointAdmissionFailed({ activationId, generation, message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("endpoint activation failed"))) })),
      ),
    messages: [Message.EndpointAdmissionSucceeded, Message.EndpointAdmissionFailed],
  }),
  activateBatch: Command.define("ActivateEndpointBatch", {
    args: { activationId: Schema.String, generation: Schema.Number, payload: Schema.String },
    execute: ({ activationId, generation, payload }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.activateBatch(JSON.parse(payload) as EndpointBatchPayload),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.EndpointAdmissionSucceeded({ activationId, generation }) : Message.EndpointAdmissionFailed({ activationId, generation, message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("endpoint activation batch failed"))) })),
      ),
    messages: [Message.EndpointAdmissionSucceeded, Message.EndpointAdmissionFailed],
  }),
});
export type EndpointAdmissionCommands = ReturnType<typeof defineEndpointAdmissionCommands>;
const noopEndpointAdmissionClient: EndpointAdmissionClient = {
  activate: async () => ({}),
  activateBatch: async () => ({}),
};
export const noopEndpointAdmissionCommands = defineEndpointAdmissionCommands(noopEndpointAdmissionClient);

export const defineLearningRankingCommands = (client: LearningRankingClient) => ({
  rollbackLadder: Command.define("RollbackLearningLadder", {
    args: { payload: Schema.String, roleId: Schema.String, scopeId: Schema.String, taskTypeId: Schema.String, token: Schema.Number },
    execute: ({ payload, roleId, scopeId, taskTypeId, token }) => {
      // SAFETY: payload is JSON.stringify of the typed LearningRollbackPayload built by the update handler.
      const parsed = JSON.parse(payload) as LearningRollbackPayload;
      return Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: () => client.rollbackLadder(parsed),
          }),
        ),
        (exit) => Effect.succeed(Exit.isSuccess(exit) ? Message.LearningLadderUpdated({ rolledBack: parsed.rolledBack, roleId, scopeId, taskTypeId, token }) : Message.LearningLadderFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("learning ladder rollback failed"))), roleId, scopeId, taskTypeId, token })),
      );
    },
    messages: [Message.LearningLadderUpdated, Message.LearningLadderFailed],
  }),
});
export type LearningRankingCommands = ReturnType<typeof defineLearningRankingCommands>;
export interface LocalPolicyClient {
  readonly save: (payload: LocalPolicyObject, signal?: AbortSignal) => Promise<LocalPolicyObject>;
}
export const createLocalPolicyClient = (http: RuntimeHttpClient): LocalPolicyClient => ({
  save: (payload, signal) =>
    http.request<LocalPolicyObject, LocalPolicyObject>({
      method: "PUT",
      path: READBACK_PATHS.localPolicy,
      body: payload,
      signal,
    }),
});
export const defineLocalPolicyCommands = (client: LocalPolicyClient) => ({
  save: Command.define("SaveLocalPolicy", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) => {
      // SAFETY: payload is JSON.stringify of the local policy draft object built by the update handler.
      const draft = JSON.parse(payload) as LocalPolicyObject;
      return Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            try: (signal) => client.save(draft, signal),
          }),
        ),
        (exit) => Effect.succeed(
          Exit.isSuccess(exit)
            ? Message.LocalPolicySaved({ policy: JSON.stringify(exit.value), token })
            : Message.LocalPolicySaveFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("local policy save failed"))), token }),
        ),
      );
    },
    messages: [Message.LocalPolicySaved, Message.LocalPolicySaveFailed],
  }),
});
export type LocalPolicyCommands = ReturnType<typeof defineLocalPolicyCommands>;
export const createLocalPolicyCommands = (fetchImpl: typeof fetch): LocalPolicyCommands =>
  defineLocalPolicyCommands(
    createLocalPolicyClient(
      createRuntimeHttpClient({
        fetchImpl,
        tokenProvider: readStoredOperatorToken,
      }),
    ),
  );
export const localPolicyCommands = defineLocalPolicyCommands(
  createLocalPolicyClient(
    createRuntimeHttpClient({
      tokenProvider: readStoredOperatorToken,
    }),
  ),
);

export interface ModelsClient {
  readonly clearBenchmark: () => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly createRole: (draft: Readonly<Record<string, unknown>>) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly updateRole: (roleId: string, draft: Readonly<Record<string, unknown>>) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly updateTasks: (tasks: readonly Readonly<Record<string, unknown>>[]) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly runBenchmark: (mode: string, judge: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly removeAccountModel: (providerAccountId: string, modelId: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly removeEndpoint: (endpointId: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly removePeerModel: (modelId: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly removeLlamaSwapModel: (modelId: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly setController: (endpointId: string | null) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly setRoles: (modelId: string, kind: "llama-swap" | "peer", roleIds: ReadonlyArray<string>) => Promise<{ readonly body: unknown; readonly status: number }>;
}
export const createModelsClient = (options: { readonly fetchImpl?: typeof fetch } = {}): ModelsClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const send = async (path: string, method: string, body: string) => {
    const response = await fetchImpl(path, { body, headers: { "content-type": "application/json" }, method });
    return { body: await response.json(), status: response.status };
  };
  return {
    clearBenchmark: () => send("/api/role-model/benchmark/data", "DELETE", "{}"),
    createRole: (draft) => send("/api/role-model/roles", "POST", JSON.stringify(draft)),
    updateRole: (roleId, draft) => send("/api/role-model/roles/" + encodeURIComponent(roleId), "PUT", JSON.stringify(draft)),
    updateTasks: (tasks) => send("/api/role-model/tasks", "PUT", JSON.stringify(tasks)),
    runBenchmark: (mode, judge) => send("/api/role-model/benchmark/runs", "POST", JSON.stringify({ judgeEndpointId: judge, mode })),
    removeAccountModel: (providerAccountId, modelId) => send("/api/role-model/accounts/" + encodeURIComponent(providerAccountId) + "/models/" + encodeURIComponent(modelId), "DELETE", "{}"),
    removeEndpoint: (endpointId) => send("/api/role-model/endpoints/" + encodeURIComponent(endpointId), "DELETE", "{}"),
    removePeerModel: (modelId) => send("/api/role-model/local/peer/models/" + encodeURIComponent(modelId) + "/unload", "POST", "{}"),
    removeLlamaSwapModel: (modelId) => send("/api/role-model/local/llama-swap/models/" + encodeURIComponent(modelId) + "/unload", "POST", "{}"),
    setController: (endpointId) => send("/api/role-model/controller", "PATCH", JSON.stringify({ endpointId })),
    setRoles: (modelId, kind, roleIds) => send("/api/role-model/local/" + kind + "/models/" + encodeURIComponent(modelId) + "/roles", "PUT", JSON.stringify({
      disabledRoleIds: [],
      enabledRoleIds: [...roleIds],
      roleAssignmentMode: "include",
      roleIds: [...roleIds],
    })),
  };
};
export const defineModelsCommands = (client: ModelsClient) => ({
  clearBenchmark: Command.define("ClearBenchmark", {
    args: { token: Schema.Number },
    execute: ({ token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.clearBenchmark() })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.ModelsActionSucceeded({ message: "Benchmark data cleared.", token })
          : Message.ModelsActionFailed({ message: "Clear benchmark failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.ModelsActionSucceeded, Message.ModelsActionFailed],
  }),
  createRole: Command.define("CreateRole", {
    args: { draftJson: Schema.String, token: Schema.Number },
    execute: ({ draftJson, token }) => {
      // SAFETY: draftJson is JSON.stringify of the validated role draft built by update.
      const draft = JSON.parse(draftJson) as Readonly<Record<string, unknown>>;
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.createRole(draft) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.RolePolicyWriteSucceeded({ kind: "create", message: "Role created.", token })
          : Message.RolePolicyWriteFailed({ kind: "create", message: "Create role failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token })));
    },
    messages: [Message.RolePolicyWriteSucceeded, Message.RolePolicyWriteFailed],
  }),
  updateRole: Command.define("UpdateRole", {
    args: { draftJson: Schema.String, roleId: Schema.String, token: Schema.Number },
    execute: ({ draftJson, roleId, token }) => {
      // SAFETY: draftJson is JSON.stringify of the validated role draft built by update.
      const draft = JSON.parse(draftJson) as Readonly<Record<string, unknown>>;
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.updateRole(roleId, draft) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.RolePolicyWriteSucceeded({ kind: "edit", message: "Role updated.", token })
          : Message.RolePolicyWriteFailed({ kind: "edit", message: "Update role failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token })));
    },
    messages: [Message.RolePolicyWriteSucceeded, Message.RolePolicyWriteFailed],
  }),
  updateTasks: Command.define("UpdateRoleTaskAllowlists", {
    args: { tasksJson: Schema.String, token: Schema.Number },
    execute: ({ tasksJson, token }) => {
      // SAFETY: tasksJson is JSON.stringify of the parsed task definitions built by update.
      const tasks = JSON.parse(tasksJson) as ReadonlyArray<Readonly<Record<string, unknown>>>;
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.updateTasks(tasks) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.RolePolicyWriteSucceeded({ kind: "tasks", message: "Task allowlists updated.", token })
          : Message.RolePolicyWriteFailed({ kind: "tasks", message: "Update task allowlists failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token })));
    },
    messages: [Message.RolePolicyWriteSucceeded, Message.RolePolicyWriteFailed],
  }),
  runBenchmark: Command.define("RunBenchmark", {
    args: { judgeEndpointId: Schema.String, mode: Schema.Literals(["full", "quick"]), token: Schema.Number },
    execute: ({ judgeEndpointId, mode, token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.runBenchmark(mode, judgeEndpointId) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.ModelsActionSucceeded({ message: "Benchmark run requested.", token })
          : Message.ModelsActionFailed({ message: "Benchmark run failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.ModelsActionSucceeded, Message.ModelsActionFailed],
  }),
  removeModel: Command.define("RemoveModel", {
    args: { accountId: Schema.String, endpointId: Schema.String, kind: Schema.Literals(["account-model", "endpoint", "llama-swap", "peer"]), modelId: Schema.String, token: Schema.Number },
    execute: ({ accountId, endpointId, kind, modelId, token }): Effect.Effect<ReturnType<typeof Message.ModelsActionSucceeded> | ReturnType<typeof Message.ModelsActionFailed>> => {
      const request = kind === "peer"
        ? Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.removePeerModel(modelId) })
        : kind === "llama-swap"
          ? Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.removeLlamaSwapModel(modelId) })
        : kind === "endpoint"
          ? Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.removeEndpoint(endpointId) })
          : Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.removeAccountModel(accountId, modelId) });
      return Effect.flatMap(Effect.exit(request), (exit): Effect.Effect<ReturnType<typeof Message.ModelsActionSucceeded> | ReturnType<typeof Message.ModelsActionFailed>> => {
        if (!Exit.isSuccess(exit) || exit.value.status < 200 || exit.value.status >= 300) {
          return Effect.succeed(Message.ModelsActionFailed({ message: "Remove model failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }));
        }
        if (kind === "peer") return Effect.succeed(Message.ModelsActionSucceeded({ message: "Removed " + modelId + " from the peer-backed router pool.", token }));
        if (kind === "llama-swap") return Effect.succeed(Message.ModelsActionSucceeded({ message: "Unloaded " + modelId + " from llama-swap.", token }));
        if (kind === "endpoint") return Effect.succeed(Message.ModelsActionSucceeded({ message: "Removed " + modelId + "; sibling instances are unchanged.", token }));
        // SAFETY: removeRuntimeAccountModel responds with removedAccount/alreadyAbsent flags.
        const body = exit.value.body as { readonly alreadyAbsent?: boolean; readonly removedAccount?: boolean };
        const message = body.alreadyAbsent === true
          ? modelId + " was already absent from " + accountId + "; the pool is converged."
          : body.removedAccount === true
            ? "Removed " + modelId + " and deleted " + accountId + " because it was the last configured model on that account."
            : "Removed " + modelId + " from " + accountId + ".";
        return Effect.succeed(Message.ModelsActionSucceeded({ message, token }));
      });
    },
    messages: [Message.ModelsActionSucceeded, Message.ModelsActionFailed],
  }),
  setController: Command.define("SetController", {
    args: { endpointId: Schema.Union([Schema.String, Schema.Null]), token: Schema.Number },
    execute: ({ endpointId, token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.setController(endpointId) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.ModelsActionSucceeded({ message: endpointId === null ? "Controller ejected." : "Primary controller updated.", token })
          : Message.ModelsActionFailed({ message: "Controller update failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.ModelsActionSucceeded, Message.ModelsActionFailed],
  }),
  setRoles: Command.define("SetModelRoles", {
    args: { kind: Schema.Literals(["llama-swap", "peer"]), modelId: Schema.String, roleIdsJson: Schema.String, token: Schema.Number },
    execute: ({ kind, modelId, roleIdsJson, token }): Effect.Effect<ReturnType<typeof Message.ModelsActionSucceeded> | ReturnType<typeof Message.ModelsActionFailed>> => {
      // SAFETY: roleIdsJson is JSON.stringify of the string array computed by the update handler.
      const roleIds = JSON.parse(roleIdsJson) as ReadonlyArray<string>;
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.setRoles(modelId, kind, roleIds) })), (exit): Effect.Effect<ReturnType<typeof Message.ModelsActionSucceeded> | ReturnType<typeof Message.ModelsActionFailed>> =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.ModelsActionSucceeded({ message: "Model roles saved.", token })
          : Message.ModelsActionFailed({ message: "Save model roles failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token })));
    },
    messages: [Message.ModelsActionSucceeded, Message.ModelsActionFailed],
  }),
});
export type ModelsCommands = ReturnType<typeof defineModelsCommands>;
export const noopModelsCommands = defineModelsCommands({
  clearBenchmark: async () => ({ body: {}, status: 200 }),
  createRole: async () => ({ body: {}, status: 200 }),
  updateRole: async () => ({ body: {}, status: 200 }),
  updateTasks: async () => ({ body: {}, status: 200 }),
  runBenchmark: async () => ({ body: {}, status: 200 }),
  setRoles: async () => ({ body: {}, status: 200 }),
  removeAccountModel: async () => ({ body: {}, status: 200 }),
  removeEndpoint: async () => ({ body: {}, status: 200 }),
  removePeerModel: async () => ({ body: {}, status: 200 }),
  removeLlamaSwapModel: async () => ({ body: {}, status: 200 }),
  setController: async () => ({ body: {}, status: 200 }),
});

export interface SystemExtensionsClient {
  readonly mutate: (id: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly download: () => Promise<{ readonly body: unknown; readonly status: number }>;
}
export const createSystemExtensionsClient = (fetchImpl: typeof fetch = fetch): SystemExtensionsClient => ({
  download: async () => {
    const response = await fetchImpl("/api/role-model/recommendations/download", { body: "{}", headers: { "content-type": "application/json" }, method: "POST" });
    return { body: await response.json(), status: response.status };
  },
  mutate: async (id) => {
    const response = await fetchImpl("/api/role-model/extensions/mutate", { body: JSON.stringify({ action: "set_mode", id, mode: "disabled" }), headers: { "content-type": "application/json" }, method: "POST" });
    return { body: await response.json(), status: response.status };
  },
});
export const defineSystemExtensionsCommands = (client: SystemExtensionsClient) => ({
  pause: Command.define("PauseSystemExtension", {
    args: { id: Schema.String, token: Schema.Number },
    execute: ({ id, token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.mutate(id) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.SystemExtensionsActionSucceeded({ message: "Paused extension " + id + ".", token })
          : Message.SystemExtensionsActionFailed({ message: "Pause extension failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.SystemExtensionsActionSucceeded, Message.SystemExtensionsActionFailed],
  }),
  download: Command.define("DownloadSystemRecommendations", {
    args: { token: Schema.Number },
    execute: ({ token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.download() })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.SystemExtensionsActionSucceeded({ message: "Downloaded and validated latest recommendations.", token })
          : Message.SystemExtensionsActionFailed({ message: "Download recommendations failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.SystemExtensionsActionSucceeded, Message.SystemExtensionsActionFailed],
  }),
});
export type SystemExtensionsCommands = ReturnType<typeof defineSystemExtensionsCommands>;
export const noopSystemExtensionsCommands = defineSystemExtensionsCommands({ download: async () => ({ body: {}, status: 200 }), mutate: async () => ({ body: {}, status: 200 }) });

export interface SystemOperatorClient {
  readonly loadState: (token: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly createReplay: (traceRootId: string, maxRequests: number, token: string) => Promise<{ readonly body: unknown; readonly status: number }>;
}
export const createSystemOperatorClient = (fetchImpl: typeof fetch = fetch): SystemOperatorClient => ({
  createReplay: async (traceRootId, maxRequests, token) => {
    const response = await fetchImpl("/api/role-model/operator/replay/jobs", { body: JSON.stringify({ budget: { maxRequests }, traceRootId }), headers: { authorization: "Bearer " + token, "content-type": "application/json" }, method: "POST" });
    return { body: await response.json(), status: response.status };
  },
  loadState: async (token) => {
    const response = await fetchImpl("/api/role-model/operator/status", { headers: { authorization: "Bearer " + token } });
    return { body: await response.json(), status: response.status };
  },
});
export const defineSystemOperatorCommands = (client: SystemOperatorClient) => ({
  loadState: Command.define("LoadSystemOperatorState", {
    args: { token: Schema.String, tokenId: Schema.Number },
    execute: ({ token, tokenId }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.loadState(token) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.SystemOperatorActionSucceeded({ message: "Operator state loaded.", token: tokenId })
          : Message.SystemOperatorActionFailed({ message: "Load operator state failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token: tokenId }))),
    messages: [Message.SystemOperatorActionSucceeded, Message.SystemOperatorActionFailed],
  }),
  createReplay: Command.define("CreateSystemOperatorReplay", {
    args: { maxRequests: Schema.Number, token: Schema.String, tokenId: Schema.Number, traceRootId: Schema.String },
    execute: ({ maxRequests, token, tokenId, traceRootId }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.createReplay(traceRootId, maxRequests, token) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.SystemOperatorActionSucceeded({ message: "Replay job created for " + traceRootId + ".", token: tokenId })
          : Message.SystemOperatorActionFailed({ message: "Create replay failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token: tokenId }))),
    messages: [Message.SystemOperatorActionSucceeded, Message.SystemOperatorActionFailed],
  }),
});
export type SystemOperatorCommands = ReturnType<typeof defineSystemOperatorCommands>;
export const noopSystemOperatorCommands = defineSystemOperatorCommands({ createReplay: async () => ({ body: {}, status: 200 }), loadState: async () => ({ body: {}, status: 200 }) });

export interface LocalPeersClient {
  readonly save: (peers: ReadonlyArray<{ readonly authToken?: string; readonly id: string; readonly url: string }>) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly health: (url: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly loadPeerModel: (modelId: string) => Promise<{ readonly body: unknown; readonly status: number }>;
  readonly loadLlamaSwapModel: (modelId: string, allRoles: boolean) => Promise<{ readonly body: unknown; readonly status: number }>;
}
export const createLocalPeersClient = (fetchImpl: typeof fetch = fetch): LocalPeersClient => ({
  health: async (url) => {
    const response = await fetchImpl("/api/role-model/local/peers/health?url=" + encodeURIComponent(url));
    return { body: await response.json(), status: response.status };
  },
  loadLlamaSwapModel: async (modelId, allRoles) => {
    const response = await fetchImpl("/api/role-model/local/llama-swap/models/" + encodeURIComponent(modelId) + "/load", { body: JSON.stringify(allRoles ? { roleAssignmentMode: "all" } : {}), headers: { "content-type": "application/json" }, method: "POST" });
    return { body: await response.json(), status: response.status };
  },
  loadPeerModel: async (modelId) => {
    const response = await fetchImpl("/api/role-model/local/peer/models/" + encodeURIComponent(modelId) + "/load", { body: "{}", headers: { "content-type": "application/json" }, method: "POST" });
    return { body: await response.json(), status: response.status };
  },
  save: async (peers) => {
    const response = await fetchImpl("/api/role-model/local/peers", { body: JSON.stringify(peers), headers: { "content-type": "application/json" }, method: "PUT" });
    return { body: await response.json(), status: response.status };
  },
});
export const defineLocalPeersCommands = (client: LocalPeersClient) => ({
  health: Command.define("CheckLocalPeerHealth", {
    args: { token: Schema.Number, url: Schema.String },
    execute: ({ token, url }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.health(url) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.LocalPeersActionSucceeded({ message: "Peer health checked for " + url + ".", token })
          : Message.LocalPeersActionFailed({ message: "Peer health check failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.LocalPeersActionSucceeded, Message.LocalPeersActionFailed],
  }),
  loadLlamaSwapModel: Command.define("LoadLocalLlamaSwapModel", {
    args: { allRoles: Schema.Boolean, modelId: Schema.String, token: Schema.Number },
    execute: ({ allRoles, modelId, token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.loadLlamaSwapModel(modelId, allRoles) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.LocalLlamaSwapActionSucceeded({ message: allRoles ? "Loaded " + modelId + " with all roles." : "Loaded " + modelId + ".", token })
          : Message.LocalLlamaSwapActionFailed({ message: "Load llama-swap model failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.LocalLlamaSwapActionSucceeded, Message.LocalLlamaSwapActionFailed],
  }),
  loadPeerModel: Command.define("LoadLocalPeerModel", {
    args: { modelId: Schema.String, token: Schema.Number },
    execute: ({ modelId, token }) =>
      Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.loadPeerModel(modelId) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.LocalPeerModelActionSucceeded({ message: "Peer model " + modelId + " loaded.", token })
          : Message.LocalPeerModelActionFailed({ message: "Load peer model failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token }))),
    messages: [Message.LocalPeerModelActionSucceeded, Message.LocalPeerModelActionFailed],
  }),
  save: Command.define("SaveLocalPeers", {
    args: { peersJson: Schema.String, token: Schema.Number },
    execute: ({ peersJson, token }) => {
      // SAFETY: peersJson is JSON.stringify of the typed peer array built by update.
      const peers = JSON.parse(peersJson) as ReadonlyArray<{ readonly authToken?: string; readonly id: string; readonly url: string }>;
      return Effect.flatMap(Effect.exit(Effect.tryPromise({ catch: (cause) => new Error(describeCause(cause)), try: () => client.save(peers) })), (exit) =>
        Effect.succeed(Exit.isSuccess(exit) && exit.value.status >= 200 && exit.value.status < 300
          ? Message.LocalPeersActionSucceeded({ message: "Peer endpoints saved.", token })
          : Message.LocalPeersActionFailed({ message: "Save peer endpoints failed: HTTP " + String(Exit.isSuccess(exit) ? exit.value.status : 0), token })));
    },
    messages: [Message.LocalPeersActionSucceeded, Message.LocalPeersActionFailed],
  }),
});
export type LocalPeersCommands = ReturnType<typeof defineLocalPeersCommands>;
export const noopLocalPeersCommands = defineLocalPeersCommands({ health: async () => ({ body: {}, status: 200 }), loadLlamaSwapModel: async () => ({ body: {}, status: 200 }), loadPeerModel: async () => ({ body: {}, status: 200 }), save: async () => ({ body: {}, status: 200 }) });

const noopLearningRankingClient: LearningRankingClient = { rollbackLadder: async () => undefined };
export const noopLearningRankingCommands = defineLearningRankingCommands(noopLearningRankingClient);

export const defineRequestsRankingCommands = (client: RequestsRankingClient) => ({
  query: Command.define("QueryRequestsRanking", {
    args: { payload: Schema.String, token: Schema.Number },
    execute: ({ payload, token }) =>
      Effect.flatMap(
        Effect.exit(
          Effect.tryPromise({
            catch: (cause) => new Error(describeCause(cause)),
            // SAFETY: payload is JSON.stringify of the typed RequestsRankingQuery built by buildRequestsRankingQuery.
            try: () => client.query(JSON.parse(payload) as RequestsRankingQuery),
          }),
        ),
        (exit) => Effect.succeed(
          Exit.isSuccess(exit)
            ? Message.RequestsRankingLoaded({ rows: exit.value, token })
            : Message.RequestsRankingFailed({ message: describeCause(Option.getOrElse(Exit.findErrorOption(exit), () => new Error("telemetry ranking query failed"))), token }),
        ),
      ),
    messages: [Message.RequestsRankingLoaded, Message.RequestsRankingFailed],
  }),
});
export type RequestsRankingCommands = ReturnType<typeof defineRequestsRankingCommands>;
const noopRequestsRankingClient: RequestsRankingClient = { query: async () => [] };
export const noopRequestsRankingCommands = defineRequestsRankingCommands(noopRequestsRankingClient);