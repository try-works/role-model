import { existsSync, mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, describe, expect, test } from "vitest";

import {
  type BridgeServer,
  type StartBridgeServerOptions,
  startBridgeServer,
} from "../src/index.js";

/**
 * Run 115 S15h/S15i (R21): the diagnostics read path over a REAL in-process HTTP socket on an
 * ephemeral 127.0.0.1 port. These tests deliberately do not use a stub handler: the bind, peer
 * address, auth gate, owner-claim handling and wire headers are all exercised by fetch.
 *
 * S15i adds the mutation-proofs: all three owner-claim headers (+ an untrusted-peer value), a
 * same-length wrong token, CORS scans on 500/OPTIONS/context-403/404, a closed-port refusal and
 * no leftover temp dirs, and an assertion that the port option passed was 0.
 *
 * Wording (corrected): the owner-claim headers are rejected by the DIAGNOSTICS HANDLER, after the
 * generic operator gate has already authorized the loopback request; the handler checks the claim
 * headers before its own authorization. It is not a "rejected before authorization" path.
 *
 * No operator port (3456/3457/3458) is ever bound and no operator state is read/written.
 */

const diagnosticsPath = "/api/role-model/operator/diagnostics";
const servers: BridgeServer[] = [];
const tempRoots: string[] = [];
const createdRoots: string[] = [];
const startedOptions: StartBridgeServerOptions[] = [];
const baseTemp =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() || path.join(tmpdir(), "role-model-run115");

afterEach(async () => {
  while (servers.length > 0) {
    const server = servers.pop();
    await server?.close().catch(() => undefined);
  }
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
});

afterAll(() => {
  // No leftover temp dir: cleanup on every path also removes the created roots.
  for (const root of createdRoots) {
    expect(existsSync(root)).toBe(false);
  }
});

async function tempStateRoot(): Promise<string> {
  mkdirSync(baseTemp, { recursive: true });
  const root = await mkdtemp(path.join(baseTemp, "s15i-"));
  tempRoots.push(root);
  createdRoots.push(root);
  return root;
}

async function startDiagnosticsServer(
  overrides: Partial<StartBridgeServerOptions> = {},
): Promise<BridgeServer> {
  const runtimeStateRoot = await tempStateRoot();
  const options = {
    host: "127.0.0.1",
    port: 0,
    runtimeStateRoot,
    operatorContext: { channel: "development", scope: "s15h-live", authorizationEpoch: 1 },
    // Explicitly disabled: no writer is enabled and no source is supplied.
    diagnostics: { enabled: false },
    registry: {
      endpoints: [],
      diagnostics: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    },
    executeChatCompletions: async () => {
      throw new Error("diagnostics tests never execute a model request");
    },
    ...overrides,
  } as StartBridgeServerOptions;
  startedOptions.push(options);
  const server = await startBridgeServer(options);
  servers.push(server);
  return server;
}

function accessControlHeaders(response: Response): string[] {
  return [...response.headers.keys()].filter((header) => header.startsWith("access-control-"));
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const value = (await response.json()) as unknown;
  expect(value && typeof value === "object" && !Array.isArray(value)).toBe(true);
  return value as Record<string, unknown>;
}

describe("S15h/S15i diagnostics over a real loopback socket", () => {
  test("starts with port option 0, so an ephemeral operator-free port is by construction", async () => {
    const server = await startDiagnosticsServer();
    expect(startedOptions.at(-1)?.port).toBe(0);
    expect(server.port).toBeGreaterThan(0);
    expect([3456, 3457, 3458]).not.toContain(server.port);
  });

  test("token-less loopback read answers the explicit disabled state with no writer enabled", async () => {
    const server = await startDiagnosticsServer();
    const response = await fetch(`http://127.0.0.1:${server.port}${diagnosticsPath}`);
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body).toMatchObject({
      schemaVersion: "role-model.local-diagnostics-read.v1",
      state: "disabled",
    });
    expect(body.records).toEqual([]);
    expect(accessControlHeaders(response)).toEqual([]);
  });

  test("loopback owner trust is explicit: with trust off, missing and wrong credentials are 401 and the configured token is accepted", async () => {
    const token = "s15h-live-read-token";
    const server = await startDiagnosticsServer({
      operatorAuthToken: token,
      deviceOwnerTrust: "off",
    });
    const url = `http://127.0.0.1:${server.port}${diagnosticsPath}`;

    const missing = await fetch(url);
    expect(missing.status).toBe(401);
    expect((await readJson(missing)).error).toBe("operator_authentication_required");
    expect(accessControlHeaders(missing)).toEqual([]);

    const wrong = await fetch(url, { headers: { authorization: "Bearer wrong-token" } });
    expect(wrong.status).toBe(401);
    expect(accessControlHeaders(wrong)).toEqual([]);

    const accepted = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    expect(accepted.status).toBe(200);
    expect(await readJson(accepted)).toMatchObject({ state: "disabled" });
    expect(accessControlHeaders(accepted)).toEqual([]);
  });

  test("a wrong token of the SAME length is still rejected (not a length-only comparison)", async () => {
    const token = "s15i-live-token-0123456789";
    const wrongSameLength = `${token.slice(0, -1)}X`;
    expect(wrongSameLength.length).toBe(token.length);
    expect(wrongSameLength).not.toBe(token);
    const server = await startDiagnosticsServer({
      operatorAuthToken: token,
      deviceOwnerTrust: "off",
    });
    const response = await fetch(`http://127.0.0.1:${server.port}${diagnosticsPath}`, {
      headers: { authorization: `Bearer ${wrongSameLength}` },
    });
    expect(response.status).toBe(401);
    expect((await readJson(response)).error).toBe("operator_authentication_required");
    expect(accessControlHeaders(response)).toEqual([]);
  });

  test("every owner-claim header is rejected by the diagnostics handler (generic gate already authorized) with no CORS", async () => {
    const server = await startDiagnosticsServer();
    const url = `http://127.0.0.1:${server.port}${diagnosticsPath}`;
    const claims = [
      ["x-role-model-device-owner", "1"],
      ["x-role-model-owner", "owner"],
      ["x-role-model-trusted-peer", "1"],
      // Untrusted-peer variant: the value does not matter, presenting the claim at all is refused.
      ["x-role-model-trusted-peer", "untrusted"],
    ] as const;
    for (const [header, value] of claims) {
      const response = await fetch(url, { headers: { [header]: value } });
      expect(response.status).toBe(403);
      expect(await readJson(response)).toMatchObject({
        schemaVersion: "role-model.local-diagnostics-read.v1",
        error: "diagnostics_owner_header_forbidden",
      });
      expect(accessControlHeaders(response)).toEqual([]);
    }
  });

  test("500, OPTIONS, context-mismatch 403 and 404 responses carry no access-control headers", async () => {
    const token = "s15i-live-token-0123456789";
    const server = await startDiagnosticsServer({
      operatorAuthToken: token,
      deviceOwnerTrust: "off",
      readDiagnosticsSource: () => ({
        instanceId: "s15i-live",
        buildId: "live-socket",
        enabled: true,
        records: () => {
          // Forces the handler to throw after the route authorized: the transport catch answers 500.
          throw new Error("s15i source exploded");
        },
      }),
    });
    const url = `http://127.0.0.1:${server.port}${diagnosticsPath}`;
    const internal = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    expect(internal.status).toBe(500);
    expect(accessControlHeaders(internal)).toEqual([]);

    const options = await fetch(url, {
      method: "OPTIONS",
      headers: {
        origin: "http://127.0.0.1:1",
        "access-control-request-method": "GET",
        authorization: `Bearer ${token}`,
      },
    });
    // The host answers OPTIONS with 204 and no CORS headers (no preflight grant exists).
    expect(options.status).toBe(204);
    expect(accessControlHeaders(options)).toEqual([]);

    // Scope: the diagnostics-prefixed path suppresses CORS on every status. The generic operator
    // surface deliberately sends wildcard CORS (setCorsHeaders), so it is not part of this claim.
    const context = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "x-role-model-scope": "s15i-mismatch",
      },
    });
    expect(context.status).toBe(403);
    expect((await readJson(context)).error).toBe("operator_context_mismatch");
    expect(accessControlHeaders(context)).toEqual([]);

    const missing = await fetch(`${url}/s15i-missing`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missing.status).toBe(404);
    expect(accessControlHeaders(missing)).toEqual([]);
  });

  test("close() releases the listener: a fetch to the closed port refuses", async () => {
    const server = await startDiagnosticsServer();
    const port = server.port;
    const index = servers.indexOf(server);
    if (index >= 0) servers.splice(index, 1);
    await server.close();
    const failure = await fetch(`http://127.0.0.1:${port}${diagnosticsPath}`).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
  });

  test("error responses from a real socket never carry access-control headers either", async () => {
    const server = await startDiagnosticsServer({
      operatorAuthToken: "secret",
      deviceOwnerTrust: "off",
    });
    const url = `http://127.0.0.1:${server.port}${diagnosticsPath}`;
    const responses = [
      await fetch(url),
      await fetch(url, { headers: { authorization: "Bearer wrong" } }),
      await fetch(url, { headers: { "x-role-model-trusted-peer": "1" } }),
    ];
    for (const response of responses) {
      expect(accessControlHeaders(response)).toEqual([]);
    }
    expect(responses[0]?.status).toBe(401);
    expect(responses[2]?.status).toBe(403);

    // A disabled source wins over query validation (200); an enabled source makes the
    // invalid query an explicit 400, still with no access-control header.
    const enabled = await startDiagnosticsServer({
      operatorAuthToken: "secret",
      deviceOwnerTrust: "off",
      readDiagnosticsSource: () => ({
        instanceId: "s15h-live",
        buildId: "live-socket",
        enabled: true,
        records: () => [],
      }),
    });
    const invalidQuery = await fetch(
      `http://127.0.0.1:${enabled.port}${diagnosticsPath}?limit=nope`,
      { headers: { authorization: "Bearer secret" } },
    );
    expect(invalidQuery.status).toBe(400);
    expect(accessControlHeaders(invalidQuery)).toEqual([]);
  });
});
