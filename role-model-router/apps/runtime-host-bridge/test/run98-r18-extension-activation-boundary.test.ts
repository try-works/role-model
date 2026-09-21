import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  DEFAULT_EXTENSION_ACTIVATION_BOUNDARY,
  extensionActivationBoundaryFor,
} from "../src/extension-activation-boundaries.js";
import {
  createTrackBOperations,
  seedTrackBExtensionBridgeState,
} from "../src/track-b-operations.js";

const roots: string[] = [];
const tempRoot = async (label: string): Promise<string> => {
  const root = path.join(os.tmpdir(), `run98-r18-${label}-${Date.now()}-${roots.length}`);
  roots.push(root);
  await mkdir(root, { recursive: true });
  return root;
};

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

const catalog = [
  { id: "event-log", packageClass: "canonical_extension", routingDependency: true },
  { id: "knowledge-worker", packageClass: "canonical_extension", routingDependency: false },
] as const;

type Row = {
  readonly id: string;
  readonly enabled: boolean;
  readonly enabledMode: string;
  readonly lifecycle: string;
  readonly activationBoundary?: {
    readonly policyGated: boolean;
    readonly defaultMode: string;
    readonly allowedModes: readonly string[];
    readonly prohibitedActions: readonly string[];
    readonly prohibitedCapabilities: readonly string[];
  };
  readonly health: { readonly available: boolean };
};

const rowFor = (rows: readonly Row[], id: string): Row => {
  const row = rows.find((entry) => entry.id === id);
  if (!row) throw new Error(`row missing for ${id}`);
  return row;
};

describe("run98 R18 extension activation boundary", () => {
  test("AC-R18-01/02 the knowledge-worker boundary is declared once and enforced", () => {
    const boundary = extensionActivationBoundaryFor("knowledge-worker");
    expect(boundary).toMatchObject({
      policyGated: true,
      defaultMode: "shadow",
      allowedModes: ["disabled", "shadow", "advisory"],
      prohibitedActions: ["activate_production", "deactivate_production"],
      prohibitedCapabilities: [
        "knowledge:prompt-inject",
        "knowledge:activate",
        "knowledge:deactivate",
      ],
    });
    expect(boundary.allowedModes).not.toContain("bounded");
    expect(boundary.allowedModes).not.toContain("active");
    expect(extensionActivationBoundaryFor("event-log")).toEqual(
      DEFAULT_EXTENSION_ACTIVATION_BOUNDARY,
    );
    expect(DEFAULT_EXTENSION_ACTIVATION_BOUNDARY.defaultMode).toBe("active");
  });

  test("AC-R18-03 every listed row carries its activation boundary", async () => {
    const root = await tempRoot("list");
    const statePath = path.join(root, "track-b-production-bridge.json");
    await seedTrackBExtensionBridgeState({ statePath, catalog: catalog as never });
    const ops = createTrackBOperations({ statePath, catalog: catalog as never });
    const rows = (await ops.listExtensions()) as readonly Row[];
    const knowledgeWorker = rowFor(rows, "knowledge-worker");
    expect(knowledgeWorker.activationBoundary).toMatchObject({
      policyGated: true,
      defaultMode: "shadow",
      allowedModes: ["disabled", "shadow", "advisory"],
    });
    expect(knowledgeWorker.enabledMode).toBe("shadow");
    const eventLog = rowFor(rows, "event-log");
    expect(eventLog.activationBoundary).toMatchObject({
      policyGated: false,
      defaultMode: "active",
    });
    expect(eventLog.enabledMode).toBe("active");
  });

  test("AC-R18-02 advisory is selectable, bounded and active are refused with the ceiling", async () => {
    const root = await tempRoot("mutate");
    const statePath = path.join(root, "track-b-production-bridge.json");
    await seedTrackBExtensionBridgeState({ statePath, catalog: catalog as never });
    const ops = createTrackBOperations({ statePath, catalog: catalog as never });

    const applied = (await ops.mutateExtension({
      id: "knowledge-worker",
      action: "set_mode",
      mode: "advisory",
    })) as { extensions: readonly Row[] };
    expect(rowFor(applied.extensions, "knowledge-worker").enabledMode).toBe("advisory");

    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "set_mode", mode: "bounded" }),
    ).rejects.toThrow(/advisory|ceiling/i);
    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "set_mode", mode: "active" }),
    ).rejects.toThrow(/advisory|ceiling/i);
    await expect(
      ops.mutateExtension({
        id: "knowledge-worker",
        action: "activate_production",
        activationPolicyVersion: 1,
        operatorAttestation: "activate-production",
      }),
    ).rejects.toThrow(/prohibited|shadow-only/i);

    const listed = (await ops.listExtensions()) as readonly Row[];
    expect(rowFor(listed, "knowledge-worker").enabledMode).toBe("advisory");
  });

  test("AC-R18-02 enable without a mode uses the declared default boundary", async () => {
    const root = await tempRoot("enable");
    const statePath = path.join(root, "track-b-production-bridge.json");
    await seedTrackBExtensionBridgeState({ statePath, catalog: catalog as never });
    const ops = createTrackBOperations({ statePath, catalog: catalog as never });
    await ops.mutateExtension({ id: "knowledge-worker", action: "disable" });
    const enabled = (await ops.mutateExtension({
      id: "knowledge-worker",
      action: "enable",
    })) as { extensions: readonly Row[] };
    expect(rowFor(enabled.extensions, "knowledge-worker")).toMatchObject({
      enabled: true,
      enabledMode: "shadow",
    });
    const eventLog = (await ops.mutateExtension({ id: "event-log", action: "enable" })) as {
      extensions: readonly Row[];
    };
    expect(rowFor(eventLog.extensions, "event-log").enabledMode).toBe("active");
  });

  test("AC-R18-02/03 the supervised runtime path persists and enforces the boundary mode", async () => {
    const root = await tempRoot("runtime");
    const statePath = path.join(root, "track-b-production-bridge.json");
    const runtimeRows = [
      { id: "event-log", desiredState: "enabled", lifecycle: "ready", pid: 11, revision: 3 },
      { id: "knowledge-worker", desiredState: "enabled", lifecycle: "ready", pid: 12, revision: 3 },
    ] as const;
    const runtime = {
      listExtensions: async () => runtimeRows.map((row) => ({ ...row })),
      mutateExtension: async (input: Record<string, unknown>) => ({
        mutationId: input.mutationId,
        state: { id: input.id, lifecycle: "ready", desiredState: "enabled", pid: 13, revision: 4 },
      }),
    };
    const ops = createTrackBOperations({
      statePath,
      catalog: catalog as never,
      extensionRuntime: runtime,
    });
    const seeded = (await ops.listExtensions()) as readonly Row[];
    expect(rowFor(seeded, "knowledge-worker")).toMatchObject({
      enabledMode: "shadow",
      activationBoundary: { allowedModes: ["disabled", "shadow", "advisory"] },
    });

    const applied = (await ops.mutateExtension({
      id: "knowledge-worker",
      action: "set_mode",
      mode: "advisory",
    })) as {
      extensions: readonly Row[];
      receipts: readonly { action: string; mode: string }[];
    };
    expect(rowFor(applied.extensions, "knowledge-worker").enabledMode).toBe("advisory");
    expect(applied.receipts.at(-1)).toMatchObject({ action: "set_mode", mode: "advisory" });

    // Durable: a fresh operations instance reads the stored boundary mode back.
    const reopened = createTrackBOperations({
      statePath,
      catalog: catalog as never,
      extensionRuntime: runtime,
    });
    expect(
      rowFor((await reopened.listExtensions()) as readonly Row[], "knowledge-worker"),
    ).toMatchObject({
      enabledMode: "advisory",
    });

    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "set_mode", mode: "active" }),
    ).rejects.toThrow(/ceiling/i);
    await expect(
      ops.mutateExtension({ id: "knowledge-worker", action: "activate_production" }),
    ).rejects.toThrow(/prohibited/i);
  });
});
