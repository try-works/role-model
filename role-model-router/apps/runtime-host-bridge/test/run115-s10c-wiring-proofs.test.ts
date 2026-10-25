/**
 * Run 115 S10c (R20): proofs for the ONE module-health wiring edge.
 *
 * These tests target the extracted edge itself (no server, no port): wireModuleHealth constructs the
 * composition once and injects that composition's source by identity; createBridgeRequestListener
 * builds the wiring once per listener (never per request) and reports a rejected handler exactly
 * once. The three S10b mutations (no source injection, no report call, construction moved per
 * request) each turn one of these assertions red.
 */
import { describe, expect, it, vi } from "vitest";

import type { IncomingMessage, ServerResponse } from "node:http";

import { createBridgeRequestListener, wireModuleHealth } from "../src/index.js";
import type { ModuleHealthComposition } from "../src/index.js";
import type { LocalDiagnosticsSource } from "../src/local-diagnostics-read.js";
import { makeModuleHealthWriter } from "../src/module-health-writer.js";

const flush = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve));

const compositionOf = () => {
  const writer = makeModuleHealthWriter({ buildId: "build-s10c", instanceId: "inst-s10c" });
  const report = vi.fn();
  return {
    composition: {
      reportRequestFailure: report,
      source: () => writer.source(),
      writer,
    },
    report,
  };
};

const options = { diagnostics: { buildId: "build-s10c", enabled: true, instanceId: "inst-s10c" } };
const fail = new Error("route exploded");
// SAFETY: the injected handler factory ignores both objects; only the wiring and the rejected
// promise are exercised here.
const request = {} as IncomingMessage;
// SAFETY: the injected handler factory ignores both objects; only the wiring and the rejected
// promise are exercised here.
const response = {} as ServerResponse;

describe("S10c module-health wiring proofs", () => {
  it("constructs the composition once and injects its source by identity", () => {
    let composeCalls = 0;
    const { composition, report } = compositionOf();
    const wiring = wireModuleHealth(options, () => {
      composeCalls += 1;
      return composition;
    });

    expect(composeCalls).toBe(1);
    expect(wiring.handlerOptions.readDiagnosticsSource).toBe(composition.source);
    expect(wiring.handlerOptions.diagnostics).toEqual(options.diagnostics);

    const error = new Error("transport failure");
    wiring.reportRequestFailure(error);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(error);
  });

  it("passes options through unchanged and no-ops the report when disabled", () => {
    const disabledOptions = {};
    const wiring = wireModuleHealth(disabledOptions, () => undefined);

    expect(wiring.handlerOptions).toBe(disabledOptions);
    expect(wiring.handlerOptions.readDiagnosticsSource).toBeUndefined();
    expect(() => wiring.reportRequestFailure(new Error("ignored"))).not.toThrow();
  });

  it("builds the wiring once per listener and reports each rejected handler exactly once", async () => {
    const { composition, report } = compositionOf();
    let composeCalls = 0;
    const captured: Array<{
      readonly readDiagnosticsSource?: () => LocalDiagnosticsSource;
    }> = [];
    const listener = createBridgeRequestListener(
      options,
      (handlerOptions) => {
        captured.push(handlerOptions);
        return async () => {
          throw fail;
        };
      },
      () => {
        composeCalls += 1;
        return composition;
      },
      () => true,
    );

    expect(composeCalls).toBe(1);
    listener(request, response);
    await flush();
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(fail);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.readDiagnosticsSource).toBe(composition.source);

    listener(request, response);
    await flush();
    expect(composeCalls).toBe(1);
    expect(report).toHaveBeenCalledTimes(2);
    expect(captured).toHaveLength(2);
    expect(captured[1]?.readDiagnosticsSource).toBe(composition.source);
  });

  it("does not report a handler that resolves", async () => {
    const { composition, report } = compositionOf();
    const listener = createBridgeRequestListener(
      options,
      () => async () => {},
      () => composition,
      () => true,
    );

    listener(request, response);
    await flush();
    expect(report).not.toHaveBeenCalled();
  });

  it("disabled listener: the handler sees the unchanged options and a rejection is not reported", async () => {
    const disabledOptions = { diagnostics: { enabled: false } };
    const seen: Array<typeof disabledOptions> = [];
    const handler = (handlerOptions: typeof disabledOptions) => {
      seen.push(handlerOptions);
      return async () => {
        throw fail;
      };
    };
    const listener = createBridgeRequestListener(disabledOptions, handler, () => undefined, () => true);

    listener(request, response);
    await flush();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(disabledOptions);
  });
});
