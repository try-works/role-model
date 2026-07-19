import { describe, expect, it } from "vitest";

import {
  SESSION_BOOTSTRAP_STAGE_ORDER,
  createPendingBootstrapState,
  runSessionBootstrapStages,
  summarizeSessionBootstrapStatus,
} from "./session-bootstrap.js";

describe("session-bootstrap", () => {
  it("runs bootstrap stages in the documented order", async () => {
    const order: string[] = [];

    const result = await runSessionBootstrapStages({
      credentials: async () => {
        order.push("credentials");
        return { status: "ready" };
      },
      endpoints: async () => {
        order.push("endpoints");
        return { status: "ready" };
      },
      peers: async () => {
        order.push("peers");
        return { status: "ready" };
      },
      vendors: async () => {
        order.push("vendors");
        return { status: "ready" };
      },
      localReload: async () => {
        order.push("local-reload");
        return { status: "ready" };
      },
      remoteHealth: async () => {
        order.push("remote-health");
        return { status: "skipped", message: "deferred" };
      },
      inventory: async () => {
        order.push("inventory");
        return { status: "skipped", message: "deferred" };
      },
    });

    expect(order).toEqual([...SESSION_BOOTSTRAP_STAGE_ORDER]);
    expect(result.status).toBe("ready");
    expect(result.stages).toHaveLength(SESSION_BOOTSTRAP_STAGE_ORDER.length);
  });

  it("treats a degraded peer stage as advisory when every required stage is ready", async () => {
    const order: string[] = [];

    const result = await runSessionBootstrapStages({
      credentials: async () => ({ status: "ready" }),
      endpoints: async () => ({ status: "ready" }),
      peers: async () => {
        order.push("peers");
        return { status: "degraded", message: "peer reload failed" };
      },
      vendors: async () => {
        order.push("vendors");
        return { status: "ready" };
      },
      localReload: async () => {
        order.push("local-reload");
        return { status: "ready" };
      },
      remoteHealth: async () => ({ status: "skipped" }),
      inventory: async () => ({ status: "skipped" }),
    });

    expect(order).toEqual(["peers", "vendors", "local-reload"]);
    expect(result.status).toBe("ready");
    expect(result.stages.find((stage) => stage.stageId === "peers")?.status).toBe("degraded");
    expect(result.stages.find((stage) => stage.stageId === "vendors")?.status).toBe("ready");
  });

  it("marks bootstrap blocked when credentials stage fails", async () => {
    const result = await runSessionBootstrapStages({
      credentials: async () => ({ status: "failed", message: "credential hydrate failed" }),
      endpoints: async () => ({ status: "ready" }),
      peers: async () => ({ status: "ready" }),
      vendors: async () => ({ status: "ready" }),
      localReload: async () => ({ status: "ready" }),
      remoteHealth: async () => ({ status: "skipped" }),
      inventory: async () => ({ status: "skipped" }),
    });

    expect(result.status).toBe("blocked");
    expect(summarizeSessionBootstrapStatus(result.stages, false)).toBe("blocked");
  });

  it("starts from pending bootstrap state", () => {
    const pending = createPendingBootstrapState();
    expect(pending.status).toBe("pending");
    expect(pending.stages).toEqual([]);
    expect(summarizeSessionBootstrapStatus(pending.stages, true)).toBe("running");
  });
});
