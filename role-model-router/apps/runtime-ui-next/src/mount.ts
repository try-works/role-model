import { embed, makeApplication } from "@role-model-router/foldkit/runtime";

import { type ShellOptions, createShellApp } from "./app";
import { createDiagnosticsClient } from "./diagnostics-client";
import { Message } from "./message";

/**
 * The Foldkit application shell with real routing and an injected diagnostics reader.
 *
 * makeApplication reads window.location at startup and passes the Url to init
 * (vendor/foldkit/packages/foldkit/src/runtime/makeApplication.ts:307-309, :370-383); the runtime
 * installs the popstate/link-click/'foldkit:urlchange' listeners from the routing config
 * (src/runtime/browserListeners.ts:13-27, :29-41, :43-102, :104-116; src/runtime/runtime.ts:601-609).
 * embed returns an idempotent EmbedHandle dispose (src/runtime/start.ts:186-286).
 */
export const makeShell = (container: HTMLElement, options: ShellOptions = {}) =>
  makeApplication({
    ...createShellApp(options),
    container,
    routing: {
      onUrlChange: (url) => Message.ChangedUrl({ url }),
      onUrlRequest: (request) => Message.ClickedLink({ request }),
    },
  });

export const mountShell = (container: HTMLElement, options: ShellOptions = {}) =>
  embed(makeShell(container, options));

/**
 * The diagnostics embedding entry: same shell as mountShell, but the reader defaults to the REAL
 * fetch client instead of the no-host "reader not configured" default.
 *
 * - mountShell(container) keeps the existing no-host default (mount.test.ts/routes.test.ts rely on
 *   it and must not perform network I/O).
 * - mountWithDiagnostics(container, { fetchImpl }) wires createDiagnosticsClient; tests pass a stub
 *   fetch, the deployed entry passes the same-origin default (or a baseUrl/token for an embedded
 *   build). An explicit readDiagnostics still wins, so tests can mount other readers through the
 *   same entry.
 */
export interface DiagnosticsMountOptions extends ShellOptions {
  readonly baseUrl?: string;
  readonly token?: string;
  readonly fetchImpl?: typeof fetch;
  /**
   * S15g test seam: defaults to the real createDiagnosticsClient. A spy can assert the exact
   * options the entry passes, and a fake return value proves the mounted reader is that instance.
   */
  readonly createReader?: typeof createDiagnosticsClient;
}

export const mountWithDiagnostics = (
  container: HTMLElement,
  options: DiagnosticsMountOptions = {},
) => {
  const createReader = options.createReader ?? createDiagnosticsClient;
  const readDiagnostics =
    options.readDiagnostics ??
    createReader({
      ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
      ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
      ...(options.token === undefined ? {} : { token: options.token }),
    });
  return mountShell(container, {
    readDiagnostics,
    ...(options.runtimeEventSourceFactory === undefined
      ? {}
      : { runtimeEventSourceFactory: options.runtimeEventSourceFactory }),
    ...(options.readRefreshSnapshot === undefined
      ? {}
      : { readRefreshSnapshot: options.readRefreshSnapshot }),
  });
};
