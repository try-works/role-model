import { expect, test } from "vitest";

import { startBridgeServer } from "../src/index.js";

test("run97 operator routes expose replay status and pause/resume control", async () => {
  let paused = false;
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: { revision: 0, endpoints: [] },
    readTrackBReplayStatus: () => ({
      paused,
      ticks: 4,
      lastOutcome: "ok",
      budget: { window: "2026-09-12", counterfactuals: 2, dispatchLimit: 300 },
    }),
    controlTrackBReplay: async (body) => {
      const action = String(body.action ?? "");
      if (action === "pause") paused = true;
      else if (action === "resume") paused = false;
      else throw new Error("replay control action must be pause or resume");
      return { action, status: { paused } };
    },
  });
  try {
    const statusResponse = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/status`,
    );
    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toMatchObject({ paused: false, ticks: 4 });

    const pauseResponse = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/control`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      },
    );
    expect(pauseResponse.status).toBe(200);
    expect(await pauseResponse.json()).toMatchObject({ action: "pause", status: { paused: true } });

    const afterPause = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/status`,
    );
    expect(await afterPause.json()).toMatchObject({ paused: true });

    const resumeResponse = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/control`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      },
    );
    expect(await resumeResponse.json()).toMatchObject({
      action: "resume",
      status: { paused: false },
    });
  } finally {
    await server.close();
  }
});

test("run97 operator routes fail closed on an unknown control action", async () => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: { revision: 0, endpoints: [] },
    readTrackBReplayStatus: () => ({ paused: false }),
    controlTrackBReplay: async (body) => {
      if (String(body.action ?? "") !== "pause" && String(body.action ?? "") !== "resume") {
        throw new Error("replay control action must be pause or resume");
      }
      return { action: body.action };
    },
  });
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/control`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete-everything" }),
      },
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "replay control action must be pause or resume",
    });
  } finally {
    await server.close();
  }
});

test("run97 operator routes stay absent when the loop is not configured", async () => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: { revision: 0, endpoints: [] },
  });
  try {
    const statusResponse = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/status`,
    );
    expect(statusResponse.status).toBe(404);
    const controlResponse = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/track-b/replay/control`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      },
    );
    expect(controlResponse.status).toBe(404);
  } finally {
    await server.close();
  }
});
