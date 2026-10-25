import {
  type RefreshSnapshotReader,
  defineReadDiagnostics,
  defineReadObservability,
  defineReadReadback,
  defineRefreshSnapshot,
} from "./commands";
import type { DiagnosticsReader } from "./diagnostics";
import { createInit } from "./init";
import { Model } from "./model";
import { type ObservabilityReader, createObservabilityClient } from "./observability";
import { readStoredOperatorToken } from "./operator-token";
import { type ReadbackKey, type ReadbackReader, createReadbackClients } from "./readback";
import {
  type RuntimeEventSourceFactory,
  defaultRuntimeEventSourceFactory,
  makeRefreshSubscriptions,
} from "./refresh";
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
  const readReadback = defineReadReadback(readbackReaders);
  return {
    Model,
    init: createInit(readDiagnostics, readObservability, readReadback),
    subscriptions: makeRefreshSubscriptions(
      options.runtimeEventSourceFactory ?? defaultRuntimeEventSourceFactory,
    ),
    update: createUpdate(readDiagnostics, refreshSnapshot, readObservability, readReadback),
    view,
  };
};
