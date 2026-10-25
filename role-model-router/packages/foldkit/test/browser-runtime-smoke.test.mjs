// @vitest-environment happy-dom
/**
 * Run 115 S3d (R5) - runtime smoke of the built browser wrapper graph under a DOM environment.
 *
 * Environment: happy-dom (the environment the vendored Foldkit test configs use,
 * vendor/foldkit/packages/foldkit/vitest.config.ts line 5), installed as a devDependency of this
 * package. It is a DOM SIMULATION, not a real browser: it has no engine, no real event loop, no
 * origin/quota enforcement and only a subset of Web APIs.
 *
 * What this suite proves:
 * - window/document/localStorage exist and window.document is the DOM document;
 * - every built browser entry of the three wrappers imports and exposes exports (85/85, including
 *   the Vitest plugin entry, which only loads inside the Vitest runner);
 * - two browser services run for real: BrowserKeyValueStore's localStorage layer (Web Storage
 *   round-trip) and BrowserCrypto's layer (crypto.getRandomValues + crypto.subtle.digest).
 *
 * What it does NOT prove: real-browser behaviour, browser-condition module resolution, IndexedDB/
 * Web Locks/geolocation (happy-dom lacks them - explicit skips below), or real clipboard/
 * permissions semantics (happy-dom exposes stubs; explicit skips below).
 */
import { describe, expect, it } from "vitest";

import { probeRuntimeGraph } from "./runtime-graph-probe.mjs";

const has = (value) => value !== undefined && value !== null;

describe("s3d browser runtime smoke", () => {
  it("runs in a DOM environment with Web Storage", () => {
    expect("window" in globalThis, "window must exist").toBe(true);
    expect("document" in globalThis, "document must exist").toBe(true);
    expect("localStorage" in globalThis, "localStorage must exist").toBe(true);
    expect(globalThis.document?.nodeType, "document must be a Document node").toBe(9);
    expect(globalThis.window?.document, "window.document is the DOM document").toBe(
      globalThis.document,
    );
  });

  it("imports every built browser entry and every namespace exposes an export", async () => {
    const probe = await probeRuntimeGraph();
    expect(probe.failures, "every built browser entry must load inside the Vitest runner").toEqual(
      [],
    );
    expect(probe.emptyNamespaces).toEqual([]);
    expect(probe.loaded, "every manifest entry is a separate built module").toBe(probe.total);
    expect(probe.total, "three wrappers publish 85 browser entries").toBe(85);
  }, 60_000);

  it("exercises BrowserKeyValueStore's localStorage layer for real", async () => {
    const { Effect } = await import("effect");
    // The module exports the service key itself; it is an Effect, so it is yielded directly.
    const { KeyValueStore } = await import("effect/persistence/KeyValueStore");
    const { layerLocalStorage } = await import(
      "@role-model-router/effect-platform-browser/BrowserKeyValueStore"
    );

    const readBack = await Effect.runPromise(
      Effect.gen(function* () {
        const store = yield* KeyValueStore;
        yield* store.set("s3d-smoke-key", "s3d-smoke-value");
        return yield* store.get("s3d-smoke-key");
      }).pipe(Effect.provide(layerLocalStorage)),
    );

    expect(readBack).toBe("s3d-smoke-value");
    // The layer must have gone through the DOM Web Storage API, not an in-memory fallback.
    expect(globalThis.localStorage.getItem("s3d-smoke-key")).toBe("s3d-smoke-value");
  });

  it("exercises BrowserCrypto's layer for real (getRandomValues + subtle.digest)", async () => {
    const { Effect } = await import("effect");
    // The module exports the service key itself; it is an Effect, so it is yielded directly.
    const { Crypto } = await import("effect/Crypto");
    const { layer } = await import("@role-model-router/effect-platform-browser/BrowserCrypto");

    const observed = await Effect.runPromise(
      Effect.gen(function* () {
        const crypto = yield* Crypto;
        const bytes = yield* crypto.randomBytes(16);
        const digest = yield* crypto.digest("SHA-256", new TextEncoder().encode("s3d-smoke"));
        const uuid = yield* crypto.randomUUIDv4();
        return { bytes: bytes.length, digest: digest.length, uuid };
      }).pipe(Effect.provide(layer)),
    );

    expect(observed.bytes).toBe(16);
    expect(observed.digest).toBe(32, "SHA-256 digest length comes from crypto.subtle.digest");
    expect(observed.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

/**
 * Services this suite deliberately does NOT run under happy-dom. Each skip names the reason; a
 * service that becomes available later still needs an explicit exercise, never a silent pass.
 */
describe("s3d browser services not exercised under happy-dom", () => {
  it.skip(
    !has(globalThis.indexedDB)
      ? "BrowserPersistence/IndexedDb*: happy-dom 20.14.6 does not implement indexedDB"
      : "BrowserPersistence/IndexedDb*: indexedDB exists but no IndexedDb provider/keyspace is configured in S3d",
  );
  it.skip(
    !has(globalThis.navigator?.locks)
      ? "Web Locks: happy-dom 20.14.6 does not implement navigator.locks"
      : "Web Locks: navigator.locks exists but no service in this smoke acquires a lock",
  );
  it.skip(
    !has(globalThis.navigator?.geolocation)
      ? "Geolocation: happy-dom 20.14.6 does not implement navigator.geolocation"
      : "Geolocation: navigator.geolocation exists but no position provider/permission is configured",
  );
  it.skip(
    has(globalThis.navigator?.clipboard)
      ? "Clipboard: happy-dom exposes a stub navigator.clipboard without OS access or a permission prompt; not exercised"
      : "Clipboard: navigator.clipboard is absent in this environment",
  );
  it.skip(
    has(globalThis.navigator?.permissions)
      ? "Permissions: happy-dom exposes a stub navigator.permissions without a real permission store; not exercised"
      : "Permissions: navigator.permissions is absent in this environment",
  );
});
