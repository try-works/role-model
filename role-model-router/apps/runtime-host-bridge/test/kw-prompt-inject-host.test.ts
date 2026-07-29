import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  configureKwPromptInjectHost,
  deriveDefaultKwPromptInjectQuery,
  readDurableKwProductionActivation,
  withKwProductionAutoArm,
} from "../src/kw-prompt-inject-host.js";

describe("kw-prompt-inject-host default inject query", () => {
  test("derives bounded production retrieve query from latest user message", () => {
    expect(
      deriveDefaultKwPromptInjectQuery([
        { role: "system", content: "ignore me" },
        { role: "user", content: "Please prefer verified evidence for run85" },
      ]),
    ).toEqual({
      scopeId: "runtime-default",
      query: "please prefer verified evidence for run85",
      filters: { activeOnly: true, sensitivityMax: "private" },
      limit: 5,
    });
  });

  test("returns undefined when no searchable user terms exist", () => {
    expect(deriveDefaultKwPromptInjectQuery([{ role: "assistant", content: "hi" }])).toBeUndefined();
    expect(deriveDefaultKwPromptInjectQuery([{ role: "user", content: "!!!" }])).toBeUndefined();
  });
});

describe("kw-prompt-inject-host auto-arm", () => {
  test("does not arm when durable KW production activation is off", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kw-arm-off-"));
    const bridgeStatePath = path.join(dir, "track-b-production-bridge.json");
    writeFileSync(
      bridgeStatePath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        revision: "rev-1",
        extensions: [
          {
            id: "knowledge-worker",
            productionActivation: false,
            health: { available: true, routingDependency: false, productionActivation: false },
          },
        ],
      }),
      "utf8",
    );
    configureKwPromptInjectHost({ bridgeStatePath });
    expect(readDurableKwProductionActivation()).toBe(false);
    expect(withKwProductionAutoArm({ sessionId: "s1" })).toEqual({ sessionId: "s1" });
    configureKwPromptInjectHost({});
  });

  test("auto-arms kwProductionActivation from durable bridge state", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kw-arm-on-"));
    const bridgeStatePath = path.join(dir, "track-b-production-bridge.json");
    writeFileSync(
      bridgeStatePath,
      JSON.stringify({
        schemaVersion: "role-model.track-b-production-bridge.v1",
        revision: "rev-on",
        extensions: [
          {
            id: "knowledge-worker",
            productionActivation: true,
            health: { available: true, routingDependency: false, productionActivation: true },
          },
        ],
      }),
      "utf8",
    );
    configureKwPromptInjectHost({ bridgeStatePath });
    expect(readDurableKwProductionActivation()).toBe(true);
    expect(withKwProductionAutoArm(undefined)).toEqual({
      sessionId: "rev-on",
      kwProductionActivation: true,
    });
    // Client session headers must not steal the KW join key (host-owned).
    expect(withKwProductionAutoArm({ sessionId: "client-session", clientRequestId: "r1" })).toEqual(
      {
        sessionId: "rev-on",
        clientRequestId: "r1",
        kwProductionActivation: true,
      },
    );
    configureKwPromptInjectHost({});
  });
});
