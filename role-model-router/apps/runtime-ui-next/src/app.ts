import {
  type RefreshSnapshotReader,
  defineDispatchStudio,
  defineDeviceAuthCommands,
  createLocalPolicyCommands,
  defineProviderAccountCommands,
  defineLearningRankingCommands,
  defineRequestsRankingCommands,
  defineEndpointAdmissionCommands,
  defineRouterConfigCommands,
  defineDispatchControl,
  defineReadControl,
  defineReadDiagnostics,
  defineReadObservability,
  defineReadReadback,
  defineRefreshSnapshot,
  defineSaveRuntimeConfig,
} from "./commands";
import { createDeviceAuthClient } from "./device-auth";
import { createEndpointAdmissionClient } from "./endpoint-admission";
import { createLearningRankingClient } from "./learning-ranking";
import { createRequestsRankingClient } from "./requests-ranking";
import { createProviderAccountClient } from "./provider-account";
import { createRouterConfigClient } from "./router-config";
import { type ControlClient, createControlClients } from "./control";
import type { DiagnosticsReader } from "./diagnostics";
import { createInit } from "./init";
import { Model } from "./model";
import { type ObservabilityReader, createObservabilityClient } from "./observability";
import { readStoredOperatorToken } from "./operator-token";
import { type ReadbackKey, type ReadbackReader, createReadbackClients } from "./readback";
import { createRuntimeConfigClient } from "./runtime-config";
import {
  type RuntimeEventSourceFactory,
  defaultRuntimeEventSourceFactory,
  makeRefreshSubscriptions,
} from "./refresh";
import { createStudioClient } from "./studio";
import { createUpdate } from "./update";
import { view } from "./view";

export interface ShellOptions {
  /** Injected diagnostics reader; tests provide one so no server is started. */
  readonly readDiagnostics?: DiagnosticsReader;
  /** S25b: injectable runtime event source; defaults to a real EventSource. */
  readonly runtimeEventSourceFactory?: RuntimeEventSourceFactory;
  /** S25b: snapshot read used when a revision gap requires a resync. */
  readonly readRefreshSnapshot?: RefreshSnapshotReader;
  /** S26d: injected observability readback; defaults to the real fetch client. */
  readonly readObservability?: ObservabilityReader;
  readonly observabilityBaseUrl?: string;
  readonly observabilityFetchImpl?: typeof fetch;
  readonly observabilityToken?: string;
  /** S26e: injected readers for the four shared readback routes. */
  readonly readbackReaders?: Readonly<Record<ReadbackKey, ReadbackReader>>;
  readonly readbackBaseUrl?: string;
  readonly readbackFetchImpl?: typeof fetch;
  readonly readbackToken?: string;
  /** S26k: injected control client; tests never touch operator state. */
  readonly controlClient?: ControlClient;
  readonly studioClient?: import("./studio").StudioClient;
  readonly studioBaseUrl?: string;
  readonly studioFetchImpl?: typeof fetch;
  readonly controlBaseUrl?: string;
  readonly controlFetchImpl?: typeof fetch;
  readonly runtimeConfigFetchImpl?: typeof fetch;
  readonly deviceAuthFetchImpl?: typeof fetch;
  readonly providerAccountFetchImpl?: typeof fetch;
  readonly endpointAdmissionFetchImpl?: typeof fetch;
  readonly learningRankingFetchImpl?: typeof fetch;
  readonly requestsRankingFetchImpl?: typeof fetch;
  readonly routerConfigFetchImpl?: typeof fetch;
  readonly localPolicyFetchImpl?: typeof fetch;
  readonly controlToken?: string;
}

const readerNotConfigured: DiagnosticsReader = async () => {
  throw new Error("diagnostics reader is not configured");
};

/** Builds the Foldkit app with the injected reader bound to the ReadDiagnostics Command. */
/**
 * Default snapshot resync: re-read the diagnostics snapshot when the shell is on the diagnostics
 * route. Other routes have no snapshot reader in this client; an injected reader can cover them.
 */
const defaultRefreshSnapshot =
  (readDiagnostics: DiagnosticsReader | undefined): RefreshSnapshotReader =>
  async ({ routeId, signal }) =>
    routeId !== "" && readDiagnostics !== undefined
      ? await readDiagnostics({ id: routeId, signal })
      : undefined;

export const createShellApp = (options: ShellOptions = {}) => {
  const readDiagnostics = defineReadDiagnostics(options.readDiagnostics ?? readerNotConfigured);
  const refreshSnapshot = defineRefreshSnapshot(
    options.readRefreshSnapshot ?? defaultRefreshSnapshot(options.readDiagnostics),
  );
  const storedToken = readStoredOperatorToken();
  const observabilityToken = options.observabilityToken ?? storedToken;
  const readbackToken = options.readbackToken ?? storedToken;
  const observabilityReader =
    options.readObservability ??
    createObservabilityClient({
      ...(options.observabilityBaseUrl === undefined
        ? {}
        : { baseUrl: options.observabilityBaseUrl }),
      ...(options.observabilityFetchImpl === undefined
        ? {}
        : { fetchImpl: options.observabilityFetchImpl }),
      ...(observabilityToken === undefined ? {} : { token: observabilityToken }),
    });
  const readObservability = defineReadObservability(observabilityReader);
  const readbackReaders =
    options.readbackReaders ??
    createReadbackClients({
      ...(options.readbackBaseUrl === undefined ? {} : { baseUrl: options.readbackBaseUrl }),
      ...(options.readbackFetchImpl === undefined ? {} : { fetchImpl: options.readbackFetchImpl }),
      ...(readbackToken === undefined ? {} : { token: readbackToken }),
    });
  const controlToken = options.controlToken ?? storedToken;
  const controlClient =
    options.controlClient ??
    createControlClients({
      ...(options.controlBaseUrl === undefined ? {} : { baseUrl: options.controlBaseUrl }),
      ...(options.controlFetchImpl === undefined ? {} : { fetchImpl: options.controlFetchImpl }),
      ...(controlToken === undefined ? {} : { token: controlToken }),
    });
  const readControl = defineReadControl(controlClient);
  const dispatchControl = defineDispatchControl(controlClient);
  const saveRuntimeConfig = defineSaveRuntimeConfig(createRuntimeConfigClient({ ...(options.runtimeConfigFetchImpl === undefined ? {} : { fetchImpl: options.runtimeConfigFetchImpl }), ...(controlToken === undefined ? {} : { token: controlToken }) }));
  const readReadback = defineReadReadback(readbackReaders);
  const studioClient = options.studioClient ?? createStudioClient({ ...(options.studioBaseUrl === undefined ? {} : { baseUrl: options.studioBaseUrl }), ...(options.studioFetchImpl === undefined ? {} : { fetchImpl: options.studioFetchImpl }) });
  const dispatchStudio = defineDispatchStudio(studioClient);
  return {
    Model,
    init: createInit(readDiagnostics, readObservability, readReadback, readControl, options.readbackReaders === undefined),
    subscriptions: makeRefreshSubscriptions(
      options.runtimeEventSourceFactory ?? defaultRuntimeEventSourceFactory,
    ),
    update: createUpdate(
      readDiagnostics,
      refreshSnapshot,
      readObservability,
      readReadback,
      readControl,
      dispatchControl,
      dispatchStudio,
      saveRuntimeConfig,
      defineDeviceAuthCommands(createDeviceAuthClient({ ...(options.deviceAuthFetchImpl === undefined ? {} : { fetchImpl: options.deviceAuthFetchImpl }) })),
      defineProviderAccountCommands(createProviderAccountClient({ ...(options.providerAccountFetchImpl === undefined ? {} : { fetchImpl: options.providerAccountFetchImpl }) })),
      defineEndpointAdmissionCommands(createEndpointAdmissionClient({ ...(options.endpointAdmissionFetchImpl === undefined ? {} : { fetchImpl: options.endpointAdmissionFetchImpl }) })),
      defineLearningRankingCommands(createLearningRankingClient({ ...(options.learningRankingFetchImpl === undefined ? {} : { fetchImpl: options.learningRankingFetchImpl }) })),
      defineRequestsRankingCommands(createRequestsRankingClient({ fetchImpl: options.requestsRankingFetchImpl })),
      defineRouterConfigCommands(createRouterConfigClient({ ...(options.routerConfigFetchImpl === undefined ? {} : { fetchImpl: options.routerConfigFetchImpl }), ...(controlToken === undefined ? {} : { token: controlToken }) })),
      ...(options.localPolicyFetchImpl === undefined ? [] : [createLocalPolicyCommands(options.localPolicyFetchImpl)]),
    ),
    view,
  };
};
