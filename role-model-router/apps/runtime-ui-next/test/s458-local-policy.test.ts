import { Effect, Option } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Url } from "@role-model-router/foldkit";

import { defineLocalPolicyCommands, localPolicyCommands } from "../src/commands";
import { OPERATOR_TOKEN_STORAGE_KEY } from "../src/operator-token";
import { READBACK_PATHS } from "../src/runtime-endpoints";
import { createInit } from "../src/init";
import { Message } from "../src/message";
import {
  READBACK_SPECS,
  localPolicyDraftFromReadback,
  localPolicyFromReadback,
} from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";
import { resolveAppUrl, routeFromUrl } from "../src/route";

/** S458: original local-policy route + exact redirects; strict RED before implementation. */

const urlOf = (href: string) => Option.getOrThrow(Url.fromString("http://localhost" + href));
describe("S458 local policy port RED", () => {
  it("parses /local/llama-swap/policy as the LocalPolicy route", () => {
    expect(routeFromUrl(urlOf("/local/llama-swap/policy"))).toMatchObject({ _tag: "LocalPolicy" });
  });

  it("registers a real localPolicy readback for GET /api/role-model/local/policy", () => {
    expect(READBACK_SPECS.localPolicy.parse({ autoUnload: false, maxConcurrency: 2, ttl: 120 }, 1)).toMatchObject({ status: "ok" });
  });

  it("replaces the original policy and matrix URLs with the canonical targets", () => {
    expect(resolveAppUrl(urlOf("/app/local/policy")).redirectHref).toBe("/local/llama-swap/policy");
    expect(resolveAppUrl(urlOf("/app/local/matrix")).redirectHref).toBe("/local/llama-swap/models?view=grid");
    expect(resolveAppUrl(urlOf("/app/local/llama-swap/matrix")).redirectHref).toBe("/local/llama-swap/models?view=grid");
  });
});

const policyBody = { autoUnload: false, extra: "keep-me", maxConcurrency: 2, ttl: 120 };
const policyModel = () => {
  const parsed = READBACK_SPECS.localPolicy.parse(policyBody, 1);
  return shellModel({
    readbacks: { ...shellModel().readbacks, localPolicy: parsed },
    route: { _tag: "LocalPolicy" },
  });
};
const commandsOf = (result: ReturnType<typeof shellUpdate>) => result.commands ?? [];

describe("S458 local policy behavior", () => {
  it("edits control fields while preserving unknown persisted fields", () => {
    const edited = shellUpdate(policyModel(), Message.LocalPolicyTtlChanged({ value: 90 }));
    const draft = localPolicyDraftFromReadback(edited.model.readbacks.localPolicy);
    expect(draft).toEqual({ ...policyBody, ttl: 90 });
    const saved = localPolicyFromReadback(edited.model.readbacks.localPolicy);
    expect(saved).toEqual(policyBody);
    const reset = shellUpdate(edited.model, Message.LocalPolicyResetRequested({}));
    expect(localPolicyDraftFromReadback(reset.model.readbacks.localPolicy)).toEqual(policyBody);
    expect(localPolicyDraftFromReadback(shellUpdate(edited.model, Message.LocalPolicyMaxConcurrencyChanged({ value: 0 })).model.readbacks.localPolicy)?.maxConcurrency).toBe(1);
    expect(localPolicyDraftFromReadback(shellUpdate(edited.model, Message.LocalPolicyTtlChanged({ value: -3 })).model.readbacks.localPolicy)?.ttl).toBe(0);
  });

  it("save sends the whole exact draft including unknown fields and success re-reads policy", async () => {
    const submitted = shellUpdate(policyModel(), Message.LocalPolicySaveRequested({}));
    const command = commandsOf(submitted)[0]!;
    // SAFETY: this command was produced by the production save handler with these typed args.
    const args = command.args as { readonly payload: string; readonly token: number };
    // SAFETY: the payload is JSON produced by the production save handler for this draft.
    expect(JSON.parse(args.payload)).toEqual(policyBody);
    const seen: unknown[] = [];
    const merged = { ...policyBody, hostMerged: true };
    const commands = defineLocalPolicyCommands({ save: async (payload) => { seen.push(payload); return merged; } });
    const message = await Effect.runPromise(commands.save(args).effect);
    expect(message._tag).toBe("LocalPolicySaved");
    expect(message).toMatchObject({ token: args.token });
    expect(seen).toEqual([policyBody]);
    const saved = shellUpdate(submitted.model, message);
    expect(saved.commands ?? []).toEqual([]);
    expect(localPolicyFromReadback(saved.model.readbacks.localPolicy)).toEqual(merged);
    expect(localPolicyDraftFromReadback(saved.model.readbacks.localPolicy)).toEqual(merged);
    const failedRefresh = shellUpdate(saved.model, Message.ReadbackFailed({ key: "localPolicy", message: "refresh failed", token: saved.model.readbacks.localPolicy.token }));
    expect(localPolicyFromReadback(failedRefresh.model.readbacks.localPolicy)).toEqual(merged);
    expect(failedRefresh.model.readbacks.localPolicy.message).toBe("refresh failed");
  });

  it("save failure keeps the draft and surfaces the bounded error", () => {
    const submitted = shellUpdate(policyModel(), Message.LocalPolicySaveRequested({}));
    const token = submitted.model.readbacks.localPolicy.token;
    const failed = shellUpdate(submitted.model, Message.LocalPolicySaveFailed({ message: "policy conflict", token }));
    expect(localPolicyDraftFromReadback(failed.model.readbacks.localPolicy)).toEqual(policyBody);
    expect(failed.model.readbacks.localPolicy.message).toBe("policy conflict");
    expect(failed.model.readbacks.localPolicy.status).toBe("ok");
  });

  it("direct entry reads the policy and degraded payloads do not fabricate a policy", () => {
    // SAFETY: initRoute only reads command name/args from these typed-command stand-ins.
    const init = createInit(
      (() => ({ args: {}, name: "ReadDiagnostics" })) as never,
      (() => ({ args: {}, name: "ReadObservability" })) as never,
      ((args: { readonly key: string }) => ({ args, name: "ReadReadback" })) as never,
      (() => ({ args: {}, name: "ReadControl" })) as never,
      false,
    );
    const entry = init(urlOf("/local/llama-swap/policy"));
    expect((entry.commands ?? []).map((command) => command.args?.key)).toEqual(["localPolicy"]);
    expect(entry.model.readbacks.localPolicy.status).toBe("loading");
    const bad = READBACK_SPECS.localPolicy.parse([], 1);
    expect(bad.status).toBe("error");
    expect(localPolicyDraftFromReadback(bad)).toBeUndefined();
  });

  it("matrix redirect uses a fixed view=grid query and replace, dropping incoming search/hash", () => {
    const matrix = resolveAppUrl(urlOf("/app/local/matrix?incoming=1#frag"));
    expect(matrix.redirectHref).toBe("/local/llama-swap/models?view=grid");
    expect(matrix.route._tag).toBe("LocalLlamaSwapModels");
    const direct = resolveAppUrl(urlOf("/app/local/llama-swap/matrix?incoming=1"));
    expect(direct.redirectHref).toBe("/local/llama-swap/models?view=grid");
    const replaced = shellUpdate(shellModel(), Message.ChangedUrl({ url: urlOf("/app/local/policy") }));
    expect((replaced.commands ?? []).map((command) => command.name)).toContain("ReplaceLegacyUrl");
    expect((replaced.commands ?? []).find((command) => command.name === "ReplaceLegacyUrl")?.args?.href).toBe("/local/llama-swap/policy");
  });
});
describe("S488 shared runtime HTTP client (local policy)", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sends the local policy PUT through the shared client with exact path, auth, and an abort signal", async () => {
    localStorage.setItem(OPERATOR_TOKEN_STORAGE_KEY, "shared-client-token");
    const seen: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(input), init: init ?? {} });
      return new Response(JSON.stringify({ ttl: 120 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    const payload = { ttl: 120 };
    const message = await Effect.runPromise(
      localPolicyCommands.save({ payload: JSON.stringify(payload), token: 7 }).effect,
    );
    expect(message._tag).toBe("LocalPolicySaved");
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe(READBACK_PATHS.localPolicy);
    expect(seen[0]?.init.method).toBe("PUT");
    expect(JSON.parse(String(seen[0]?.init.body))).toEqual(payload);
    const headers = new Headers(seen[0]?.init.headers);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer shared-client-token");
    expect(headers.get("content-type")).toBe("application/json");
    expect(seen[0]?.init.signal).toBeInstanceOf(AbortSignal);
    localStorage.removeItem(OPERATOR_TOKEN_STORAGE_KEY);
  });
});
