/**
 * L1: config and endpoint trust.
 *
 * Trust is decided **before any network call**. A remote (non-loopback) endpoint
 * is blocked unless explicitly allowed, and a runtime that reports
 * `authentication.required` fails closed rather than being contacted with a
 * placeholder token. These specs lock that, plus the endpoint normalization the
 * whole plugin depends on.
 */

import { describe, expect, test } from "vitest";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_RUNTIME_PORT,
  RUNTIME_CHANNELS,
  assessEndpointTrust,
  createRoleModelConfig,
  endpointForPort,
  isTruthyFlag,
  normalizeEndpoint,
  resolveAllowRemote,
} from "../src/config.js";

describe("normalizeEndpoint", () => {
  test("strips trailing slashes", () => {
    expect(normalizeEndpoint("http://127.0.0.1:3457/")).toBe("http://127.0.0.1:3457");
    expect(normalizeEndpoint("http://127.0.0.1:3457///")).toBe("http://127.0.0.1:3457");
  });

  test("strips a trailing /v1 so the plugin can append it exactly once", () => {
    expect(normalizeEndpoint("http://127.0.0.1:3457/v1")).toBe("http://127.0.0.1:3457");
    expect(normalizeEndpoint("http://127.0.0.1:3457/v1/")).toBe("http://127.0.0.1:3457");
  });

  test("is idempotent", () => {
    const once = normalizeEndpoint("http://127.0.0.1:3457/v1/");
    expect(normalizeEndpoint(once)).toBe(once);
  });
});

describe("isTruthyFlag", () => {
  test("accepts the documented truthy spellings", () => {
    for (const value of ["1", "true", "yes", "TRUE", "Yes", " true "]) {
      expect(isTruthyFlag(value)).toBe(true);
    }
  });

  test("rejects everything else, including the usual falsy words", () => {
    for (const value of ["0", "false", "no", "off", "", "   ", undefined, null]) {
      expect(isTruthyFlag(value)).toBe(false);
    }
  });
});

describe("createRoleModelConfig", () => {
  test("defaults to the production runtime on 3456", () => {
    expect(DEFAULT_ENDPOINT).toBe("http://127.0.0.1:3456");
    const config = createRoleModelConfig({ env: {} });
    expect(config.endpoint).toBe(DEFAULT_ENDPOINT);
    expect(config.allowRemote).toBe(false);
    expect(config.requestTimeoutMs).toBe(DEFAULT_REQUEST_TIMEOUT_MS);
    expect(config.selectedAlias).toBeNull();
  });

  test("prefers explicit input over the environment", () => {
    const config = createRoleModelConfig({
      endpoint: "http://127.0.0.1:3457",
      allowRemote: true,
      env: { ROLE_MODEL_ENDPOINT: "http://example.test:9000", ROLE_MODEL_ALLOW_REMOTE: "0" },
    });
    expect(config.endpoint).toBe("http://127.0.0.1:3457");
    expect(config.allowRemote).toBe(true);
  });

  test("honours ROLE_MODEL_ENDPOINT and ROLE_MODEL_ALLOW_REMOTE as fallbacks", () => {
    const config = createRoleModelConfig({
      env: { ROLE_MODEL_ENDPOINT: "http://127.0.0.1:3458/v1/", ROLE_MODEL_ALLOW_REMOTE: "yes" },
    });
    expect(config.endpoint).toBe("http://127.0.0.1:3458");
    expect(config.allowRemote).toBe(true);
  });

  test("normalizes a configured endpoint and keeps the route name verbatim", () => {
    const config = createRoleModelConfig({ endpoint: "http://127.0.0.1:3457/v1/", env: {} });
    expect(config.endpoint).toBe("http://127.0.0.1:3457");
    expect(config.providerRoute).toBe("role-model");
  });

  test("keeps the selected alias verbatim and normalizes it to null when blank", () => {
    expect(
      createRoleModelConfig({ selectedAlias: "baseline.remote-only", env: {} }).selectedAlias,
    ).toBe("baseline.remote-only");
    expect(createRoleModelConfig({ selectedAlias: "   ", env: {} }).selectedAlias).toBeNull();
  });
});

describe("resolveAllowRemote", () => {
  test("a defined explicit value wins over the environment", () => {
    expect(resolveAllowRemote(false, { ROLE_MODEL_ALLOW_REMOTE: "true" })).toBe(false);
    expect(resolveAllowRemote(true, { ROLE_MODEL_ALLOW_REMOTE: "false" })).toBe(true);
  });

  test("falls back to the environment when undefined", () => {
    expect(resolveAllowRemote(undefined, { ROLE_MODEL_ALLOW_REMOTE: "1" })).toBe(true);
    expect(resolveAllowRemote(undefined, {})).toBe(false);
  });
});

describe("assessEndpointTrust", () => {
  test("trusts every loopback spelling by default", () => {
    for (const endpoint of [
      "http://127.0.0.1:3456",
      "http://localhost:3457",
      "http://[::1]:3458",
      "http://127.0.0.1:3456",
    ]) {
      const trust = assessEndpointTrust(endpoint, { allowRemote: false });
      expect(trust.allowed, endpoint).toBe(true);
      expect(trust.remote, endpoint).toBe(false);
      expect(trust.code, endpoint).toBe("local");
    }
  });

  test("blocks a remote endpoint by default and says how to allow it", () => {
    const trust = assessEndpointTrust("https://role-model.example.test", { allowRemote: false });
    expect(trust.allowed).toBe(false);
    expect(trust.remote).toBe(true);
    expect(trust.code).toBe("remote-blocked");
  });

  test("allows a remote endpoint when allowRemote is set", () => {
    const trust = assessEndpointTrust("https://role-model.example.test", { allowRemote: true });
    expect(trust.allowed).toBe(true);
    expect(trust.code).toBe("remote-allowed");
  });

  test("an untrusted project still refuses a remote endpoint even with allowRemote", () => {
    const trust = assessEndpointTrust("https://role-model.example.test", {
      allowRemote: true,
      isProjectTrusted: () => false,
    });
    expect(trust.allowed).toBe(false);
    expect(trust.code).toBe("remote-untrusted");
  });

  test("an unparsable endpoint is refused rather than guessed at", () => {
    const trust = assessEndpointTrust("not a url", { allowRemote: true });
    expect(trust.allowed).toBe(false);
    expect(trust.code).toBe("invalid-endpoint");
  });

  test("every refusal carries remediation text", () => {
    for (const trust of [
      assessEndpointTrust("https://role-model.example.test", { allowRemote: false }),
      assessEndpointTrust("https://role-model.example.test", {
        allowRemote: true,
        isProjectTrusted: () => false,
      }),
      assessEndpointTrust("not a url", { allowRemote: true }),
    ]) {
      expect(trust.allowed).toBe(false);
      expect(trust.message.length).toBeGreaterThan(0);
      expect(trust.remediation.length).toBeGreaterThan(0);
    }
  });

  test("trust decisions never require a network call to be made first", () => {
    // assessEndpointTrust is synchronous by contract: the caller must be able to
    // refuse before it constructs any fetch.
    const trust = assessEndpointTrust("https://role-model.example.test", { allowRemote: false });
    expect(trust).not.toBeInstanceOf(Promise);
  });
});

describe("runtime channels", () => {
  /**
   * The three runtime channels are fixed by this repository's convention: production
   * on 3456, stage on 3457, development on 3458, production being the default. The
   * settings page offers them as a choice rather than asking a user to retype a URL,
   * because picking the wrong channel is otherwise silent — the route registers either
   * way and the only symptom is a runtime that answers differently.
   */
  test("names the three channels with production as the default", () => {
    expect(RUNTIME_CHANNELS.map((channel) => channel.port)).toEqual([3456, 3457, 3458]);
    expect(RUNTIME_CHANNELS[0]?.name).toBe("production");
    expect(DEFAULT_RUNTIME_PORT).toBe(3456);
    // The default endpoint must agree with the default port.
    expect(DEFAULT_ENDPOINT).toBe(`http://127.0.0.1:${String(DEFAULT_RUNTIME_PORT)}`);
  });

  test("describes the runtime each channel runs", () => {
    expect(RUNTIME_CHANNELS.map((channel) => channel.runtime)).toEqual([
      "role-model",
      "role-model-stage",
      "role-model-dev",
    ]);
  });

  test("derives a loopback endpoint from a port", () => {
    expect(endpointForPort(3456)).toBe("http://127.0.0.1:3456");
    expect(endpointForPort(3458)).toBe("http://127.0.0.1:3458");
  });

  test("a chosen port resolves to that channel's endpoint", () => {
    expect(createRoleModelConfig({ port: 3457 }).endpoint).toBe("http://127.0.0.1:3457");
    expect(createRoleModelConfig({ port: 3458 }).endpoint).toBe("http://127.0.0.1:3458");
    // Absent means production, not "unset".
    expect(createRoleModelConfig({}).endpoint).toBe("http://127.0.0.1:3456");
  });

  test("a chosen channel outranks a stored endpoint", () => {
    // A profile written before this field existed still carries production in
    // `endpoint`. Honouring that while a channel is chosen would make the selector
    // appear to do nothing, which is the silent misroute this field exists to prevent.
    expect(createRoleModelConfig({ port: 3458, endpoint: "http://127.0.0.1:3456" }).endpoint).toBe(
      "http://127.0.0.1:3458",
    );
    expect(createRoleModelConfig({ port: 3457, endpoint: "http://127.0.0.1:3456" }).endpoint).toBe(
      "http://127.0.0.1:3457",
    );
  });

  test("with no channel chosen, a stored endpoint stands on its own", () => {
    // The port sentinel is what makes this possible: it keeps a remote host or a
    // non-standard port working without the channel selector interfering.
    expect(createRoleModelConfig({ endpoint: "https://role-model.example.test" }).endpoint).toBe(
      "https://role-model.example.test",
    );
    expect(createRoleModelConfig({ endpoint: "http://127.0.0.1:9999" }).endpoint).toBe(
      "http://127.0.0.1:9999",
    );
  });

  test("an unset channel leaves the default endpoint alone", () => {
    expect(createRoleModelConfig({ port: 0 }).endpoint).toBe(DEFAULT_ENDPOINT);
    expect(createRoleModelConfig({}).endpoint).toBe(DEFAULT_ENDPOINT);
  });

  test("a port that cannot be real is treated as no channel chosen", () => {
    for (const port of [-1, 70_000, 1.5, "3457"]) {
      expect(createRoleModelConfig({ port }).endpoint, String(port)).toBe(DEFAULT_ENDPOINT);
    }
  });
});
