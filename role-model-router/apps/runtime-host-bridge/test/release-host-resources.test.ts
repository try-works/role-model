import { describe, expect, it } from "vitest";
import { releaseHostResources } from "../src/release-host-resources.js";

const recorder = () => {
  const events: string[] = [];
  const step = (name: string, fail = false) => async () => { events.push(name); if (fail) throw new Error(name + " failed"); };
  return { events, step };
};

describe("S87a releaseHostResources", () => {
  it("releases server, packaged runtime then extension runtime in order", async () => {
    const { events, step } = recorder();
    const result = await releaseHostResources({ server: step("server"), packagedRuntime: step("packaged"), extensionRuntime: step("extension") });
    expect(events).toEqual(["server", "packaged", "extension"]);
    expect(result.released).toEqual(["server", "packaged", "extension"]);
    expect(result.errors).toEqual([]);
  });

  it("keeps going after a throwing server and names the failing step", async () => {
    const { events, step } = recorder();
    const seen: string[] = [];
    const result = await releaseHostResources({ server: step("server", true), packagedRuntime: step("packaged"), extensionRuntime: step("extension") }, (failure) => seen.push(failure.step));
    expect(events).toEqual(["server", "packaged", "extension"]);
    expect(result.released).toEqual(["packaged", "extension"]);
    expect(result.errors.map((entry) => entry.step)).toEqual(["server"]);
    expect(seen).toEqual(["server"]);
  });

  it("still attempts extensionRuntime when the packaged runtime throws", async () => {
    const { events, step } = recorder();
    const result = await releaseHostResources({ server: step("server"), packagedRuntime: step("packaged", true), extensionRuntimeOwner: step("owner") });
    expect(events).toEqual(["server", "packaged", "owner"]);
    expect(result.errors.map((entry) => entry.step)).toEqual(["packaged"]);
  });

  it("is idempotent for the same release functions", async () => {
    const { events, step } = recorder();
    const resources = { server: step("server"), packagedRuntime: step("packaged"), extensionRuntime: step("extension") };
    await releaseHostResources(resources);
    const second = await releaseHostResources(resources);
    expect(events).toEqual(["server", "packaged", "extension"]);
    expect(second.released).toEqual([]);
  });

  it("skips absent resources and uses backend when there is no packaged runtime", async () => {
    const { events, step } = recorder();
    const result = await releaseHostResources({ backend: step("backend") });
    expect(events).toEqual(["backend"]);
    expect(result.released).toEqual(["backend"]);
    expect(result.errors).toEqual([]);
  });
});
