/**
 * L1: configuration schema.
 *
 * The Harness loader validates a plugin's `config` against its exported schema
 * before activation and reports a schema-less plugin as `absent`. These specs lock
 * the validation and defaulting a user's patch row relies on.
 */

import { describe, expect, test } from "vitest";
import { createRoleModelConfig } from "../src/config.js";
import { Config } from "../src/index.js";

/**
 * Read a parsed config field to its plain value.
 *
 * Every user-editable field is `.volatile()`, so a parsed field is a live reference
 * (`{ get() }`) rather than a plain value. This mirrors what the Harness does when it
 * reads `config.timeoutMs.get()` or unwraps a snapshot through `plainConfig`.
 * @param value - a parsed field.
 * @returns the current plain value.
 */
function plain<T>(value: T): unknown {
  const inner = value as unknown as { get?: () => unknown };
  return typeof inner?.get === "function" ? inner.get() : value;
}

describe("Config validation", () => {
  test("fills defaults for an empty row", () => {
    const config = Config({});
    expect(plain(config.endpoint)).toBe("http://127.0.0.1:3456");
    expect(plain(config.allowRemote)).toBe(false);
    expect(plain(config.requestTimeoutMs)).toBe(2500);
    expect(plain(config.providerRoute)).toBe("role-model");
  });

  test("resolves an unset preference to null rather than dropping it", () => {
    // `selectedAlias`/`hostLlmModule` are nullable preferences, and a nullable field
    // cannot express "unset" through a null default: schemastery leaves the field
    // absent and a `const(null)` member only accepts an explicit null. They default
    // to an empty string instead, and the resolver reads that as null.
    const config = Config({});
    expect(plain(config.selectedAlias)).toBe("");
    expect(plain(config.hostLlmModule)).toBe("");
    expect(createRoleModelConfig(config).selectedAlias).toBeNull();
    expect(createRoleModelConfig(config).hostLlmModule).toBeNull();
  });

  test("accepts and preserves an explicit configuration", () => {
    const config = Config({
      endpoint: "http://127.0.0.1:3457",
      allowRemote: true,
      requestTimeoutMs: 5000,
      providerRoute: "role-model-local",
      selectedAlias: "baseline.remote-only",
      hostLlmModule: "/host/dsh-llm.js",
    });
    expect(plain(config.endpoint)).toBe("http://127.0.0.1:3457");
    expect(plain(config.allowRemote)).toBe(true);
    expect(plain(config.requestTimeoutMs)).toBe(5000);
    expect(plain(config.providerRoute)).toBe("role-model-local");
    expect(plain(config.selectedAlias)).toBe("baseline.remote-only");
    expect(plain(config.hostLlmModule)).toBe("/host/dsh-llm.js");
  });

  test("exposes a schema the loader can project", () => {
    expect(typeof Config).toBe("function");
    // schemastery attaches `toJSON` for schema projection.
    expect(typeof (Config as unknown as { toJSON?: unknown }).toJSON).toBe("function");
  });

  test("rejects a non-boolean allowRemote", () => {
    expect(() => Config({ allowRemote: "yes" as unknown as boolean })).toThrow();
  });

  test("rejects a non-positive timeout", () => {
    expect(() => Config({ requestTimeoutMs: 0 })).toThrow();
    expect(() => Config({ requestTimeoutMs: -5 })).toThrow();
  });

  test("normalizes the endpoint during activation resolution, not in the schema", () => {
    // The schema carries the raw value; `createRoleModelConfig` owns normalization,
    // and `apply` always resolves through it so no un-normalized endpoint is used.
    const normalized = createRoleModelConfig(Config({ endpoint: "http://127.0.0.1:3457/v1/" }));
    expect(normalized.endpoint).toBe("http://127.0.0.1:3457");
  });
});

describe("the settings surface", () => {
  /**
   * A field the Harness settings system can render and edit must be marked
   * `volatile()`. `volatileForm` walks the Config schema and returns `undefined`
   * unless it finds one, and a schema with no form produces **no settings
   * namespace** — which in turn removes the provider from the Models page, because
   * that page only lists configurable providers whose namespace exists.
   *
   * Without the marker the whole configuration surface is inert: no page, no way to
   * edit the endpoint, and no row in the provider directory.
   */
  test("declares live-editable fields so settings can render a form", () => {
    const dict = (Config as unknown as { dict?: Record<string, { meta?: { volatile?: boolean } }> })
      .dict;
    expect(dict).toBeDefined();
    const volatile = Object.entries(dict ?? {})
      .filter(([, field]) => field.meta?.volatile === true)
      .map(([key]) => key);
    expect(volatile.length).toBeGreaterThan(0);
  });

  test("marks the settings a user must be able to change", () => {
    const dict = (Config as unknown as { dict?: Record<string, { meta?: { volatile?: boolean } }> })
      .dict;
    for (const key of ["endpoint", "selectedAlias", "allowRemote", "requestTimeoutMs"]) {
      expect(dict?.[key]?.meta?.volatile, `${key} must be editable`).toBe(true);
    }
  });

  /**
   * A parsed volatile field is a live reference, not a plain value: schemastery
   * returns an object whose `get()` reads the current value. The Harness reads such
   * fields as `config.timeoutMs.get()` for exactly this reason, and unwraps whole
   * configs through `plainConfig`, which is not importable from here — this package
   * resolves its own dependencies and does not depend on `dsh-settings`.
   */
  test("a volatile field parses to a live reference, not a plain value", () => {
    const parsed = Config({ endpoint: "http://127.0.0.1:3457" }) as unknown as {
      endpoint: { get?: () => unknown };
    };
    expect(typeof parsed.endpoint.get).toBe("function");
    expect(parsed.endpoint.get?.()).toBe("http://127.0.0.1:3457");
  });

  test("activation reads volatile fields through their live reference", () => {
    // The resolver must not treat the reference object as the endpoint string.
    const normalized = createRoleModelConfig(Config({ endpoint: "http://127.0.0.1:3457/v1/" }));
    expect(normalized.endpoint).toBe("http://127.0.0.1:3457");
    expect(typeof normalized.endpoint).toBe("string");
  });

  test("activation reads volatile defaults through their live reference", () => {
    const normalized = createRoleModelConfig(Config({}));
    expect(normalized.endpoint).toBe("http://127.0.0.1:3456");
    expect(normalized.allowRemote).toBe(false);
    expect(normalized.requestTimeoutMs).toBe(2500);
    expect(normalized.providerRoute).toBe("role-model");
  });
});
