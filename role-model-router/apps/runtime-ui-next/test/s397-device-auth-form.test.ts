import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

import { Message } from "../src/message";
import {
  activationPlanForConnectedSession,
  createDeviceAuthClient,
  deviceAuthStartPlan,
  initialDeviceAuthState,
  validateDeviceAuthDraft,
  type DeviceAuthSession,
} from "../src/device-auth";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S396a (M8): provider device-authorization connect form. Exact HTTP for start/list/poll/
 * activate, conflict restore without a duplicate start, retry keeping authRequestId, one poll in
 * flight per interval, one activation per selected model, cancel/token fencing, validation, and
 * errors that keep the draft.
 */

const session = (overrides: Partial<DeviceAuthSession> = {}): DeviceAuthSession => ({
  authRequestId: "auth-1",
  intervalSeconds: 5,
  providerAccountId: "openai.personal.openai-codex-subscription",
  status: "pending",
  ...overrides,
});

const draft = {
  authMode: "oauth2-device-code",
  modelInput: "",
  providerId: "openai",
  providerKind: "openai",
  region: "global",
  selectedModelIds: ["gpt-6"],
  variantId: "openai-codex-subscription",
};

const stateWithDraft = (extra: Partial<ReturnType<typeof initialDeviceAuthState>> = {}) => ({
  ...initialDeviceAuthState(),
  draft,
  token: 1,
  ...extra,
});

const authOf = (model: ReturnType<typeof shellModel>) => model.deviceAuth ?? initialDeviceAuthState();

const modelWith = (deviceAuth: ReturnType<typeof initialDeviceAuthState>) =>
  shellModel({ deviceAuth });

const commandNames = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).map((command) => command.name);

describe("S396a device-authorization client (exact HTTP)", () => {
  interface RecordedInit { readonly body?: string; readonly method?: string }
  const recordingFetch = () => {
    const calls: Array<{ readonly body?: string; readonly method?: string; readonly url: string }> = [];
    // SAFETY: the production client always sends a JSON string body; this test stub only records it.
    const fetchImpl = (async (url: string, init?: RecordedInit) => {
      calls.push({ body: init?.body, method: init?.method, url });
      return new Response(JSON.stringify(session()), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    return { calls, fetchImpl };
  };

  it("POSTs the exact start payload to /accounts/device/start", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const client = createDeviceAuthClient({ fetchImpl });
    const plan = deviceAuthStartPlan({ ...initialDeviceAuthState(), draft }, []);
    if (plan.kind !== "start") throw new Error("expected a start plan");
    await client.start(plan.payload);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("/api/role-model/accounts/device/start");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      allowedModels: ["gpt-6"],
      budgetPolicyRef: "budget.default",
      deniedModels: [],
      entitlementTags: ["chat"],
      modelRoleBindings: [
        {
          disabledRoleIds: [],
          enabledRoleIds: [],
          modelId: "gpt-6",
          roleAssignmentMode: "include",
          roleIds: [],
        },
      ],
      providerAccountId: "openai.personal.openai-codex-subscription",
      providerId: "openai",
      providerKind: "openai",
      quotaPolicyRef: "quota.default",
      variantId: "openai-codex-subscription",
    });
  });

  it("POSTs {authRequestId} to /accounts/device/poll and GETs /accounts/device", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const client = createDeviceAuthClient({ fetchImpl });
    await client.poll("auth-1");
    await client.list();
    expect(calls.map((call) => [call.method, call.url])).toEqual([
      ["POST", "/api/role-model/accounts/device/poll"],
      ["GET", "/api/role-model/accounts/device"],
    ]);
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({ authRequestId: "auth-1" });
  });

  it("POSTs exactly one activation per selected model", async () => {
    const { calls, fetchImpl } = recordingFetch();
    const client = createDeviceAuthClient({ fetchImpl });
    await client.activate({ modelId: "gpt-6", providerAccountId: "openai.personal.x", region: "global" });
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("/api/role-model/endpoints");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      modelId: "gpt-6",
      providerAccountId: "openai.personal.x",
      region: "global",
    });
  });
});

describe("S396a device-authorization form state", () => {
  it("validates provider/models/region without dropping the draft", () => {
    expect(validateDeviceAuthDraft({ ...draft, modelInput: "", providerId: "", selectedModelIds: [] })).toEqual([
      "Select a provider.",
      "Select at least one model.",
    ]);
  });

  it("restores a pending session instead of starting a duplicate (conflict)", () => {
    const state = stateWithDraft();
    const pending = session();
    const plan = deviceAuthStartPlan(state, [pending]);
    expect(plan.kind).toBe("restore");
    if (plan.kind === "restore") expect(plan.session.authRequestId).toBe("auth-1");
  });

  it("builds the exact start payload when no pending session exists", () => {
    const state = stateWithDraft();
    const plan = deviceAuthStartPlan(state, []);
    expect(plan.kind).toBe("start");
    if (plan.kind === "start") {
      expect(plan.payload).toMatchObject({
        allowedModels: ["gpt-6"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
    }
  });

  it("activates each selected model exactly once", () => {
    const plan = activationPlanForConnectedSession({
      draft: { ...draft, selectedModelIds: ["gpt-6", "gpt-6", "gpt-6-mini"] },
      session: session({ status: "connected" }),
    });
    expect(plan).toHaveLength(2);
    expect(plan.map((payload) => payload.modelId).sort()).toEqual(["gpt-6", "gpt-6-mini"]);
  });
});

describe("S396a device-authorization update transitions", () => {
  const loaded = (sessions: readonly DeviceAuthSession[]) =>
    Message.DeviceAuthSessionsLoaded({ sessions: [...sessions], token: 1 });

  it("conflict restore schedules ONE poll and never a start", () => {
    const state = stateWithDraft();
    const result = shellUpdate(modelWith(state), loaded([session()]));
    expect(commandNames(result)).toEqual(["PollDeviceAuthorization"]);
    expect(authOf(result.model).session?.authRequestId).toBe("auth-1");
    const poll = (result.commands ?? [])[0];
    expect(poll?.args).toMatchObject({ authRequestId: "auth-1", delayMs: 5_000, intervalMs: 5_000 });
  });

  it("no pending session starts once with the exact payload", () => {
    const state = stateWithDraft();
    const result = shellUpdate(modelWith(state), loaded([]));
    expect(commandNames(result)).toEqual(["StartDeviceAuthorization"]);
    const start = (result.commands ?? [])[0];
    const payload = JSON.parse(String(start?.args?.payload));
    expect(payload.allowedModels).toEqual(["gpt-6"]);
    expect(payload.providerAccountId).toBe("openai.personal.openai-codex-subscription");
  });

  it("keeps authRequestId on retry and issues ONE poll in flight", () => {
    const state = stateWithDraft({ session: session(), status: "pending" as const });
    const failed = shellUpdate(modelWith(state), Message.DeviceAuthFailed({ message: "network", token: 1 }));
    expect(authOf(failed.model).status).toBe("error");
    expect(authOf(failed.model).draft).toEqual(state.draft);
    expect(authOf(failed.model).session?.authRequestId).toBe("auth-1");
    const retried = shellUpdate(failed.model, Message.DeviceAuthRetryRequested({}));
    expect(commandNames(retried)).toEqual(["PollDeviceAuthorization"]);
    expect((retried.commands ?? [])[0]?.args).toMatchObject({ authRequestId: "auth-1", delayMs: 0 });
  });

  it("refuses a second start while a poll is in flight or one is starting", () => {
    const inFlight = stateWithDraft({ inflight: true, session: session(), status: "pending" as const });
    expect(commandNames(shellUpdate(modelWith(inFlight), Message.DeviceAuthStartRequested({})))).toEqual([]);
    const starting = stateWithDraft({ status: "starting" as const });
    expect(commandNames(shellUpdate(modelWith(starting), Message.DeviceAuthStartRequested({})))).toEqual([]);
    const idle = stateWithDraft();
    expect(commandNames(shellUpdate(modelWith(idle), Message.DeviceAuthStartRequested({})))).toEqual(["ReadDeviceAuthorizations"]);
  });

  it("refuses a retry while a poll is in flight and allows it once settled", () => {
    const inFlight = stateWithDraft({ inflight: true, session: session(), status: "pending" as const });
    const refused = shellUpdate(modelWith(inFlight), Message.DeviceAuthRetryRequested({}));
    expect(commandNames(refused)).toEqual([]);
    const settled = stateWithDraft({ inflight: false, session: session(), status: "pending" as const });
    const retried = shellUpdate(modelWith(settled), Message.DeviceAuthRetryRequested({}));
    expect(commandNames(retried)).toEqual(["PollDeviceAuthorization"]);
  });

  it("cancel clears the session and token-fences a late poll result", () => {
    const state = stateWithDraft({ session: session(), status: "pending" as const });
    const cancelled = shellUpdate(modelWith(state), Message.DeviceAuthCancelled({}));
    expect(authOf(cancelled.model).session).toBeUndefined();
    expect(authOf(cancelled.model).status).toBe("draft");
    expect(commandNames(cancelled)).toEqual([]);
    const late = shellUpdate(cancelled.model, Message.DeviceAuthPolled({ session: session({ status: "connected" }), token: 1 }));
    expect(commandNames(late)).toEqual([]);
    expect(authOf(late.model).status).toBe("draft");
  });

  it("on connected activates ONE command per selected model", () => {
    const state = stateWithDraft({ session: session(), status: "pending" as const });
    const result = shellUpdate(modelWith(state), Message.DeviceAuthPolled({ session: session({ status: "connected" }), token: 1 }));
    expect(commandNames(result)).toEqual(["ActivateDeviceEndpoint"]);
    expect(JSON.parse(String((result.commands ?? [])[0]?.args?.payload))).toMatchObject({
      modelId: "gpt-6",
      providerAccountId: "openai.personal.openai-codex-subscription",
      region: "global",
    });
  });
});

describe("S398 device-authorization retry control (DOM)", () => {
  const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
  afterEach(() => {
    for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
    window.history.replaceState({}, "", "/");
  });
  const waitFor = async (read: () => HTMLElement | undefined, label: string): Promise<HTMLElement> => {
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      const value = read();
      if (value !== undefined) return value;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timed out waiting for " + label);
  };
  it("shows a retry control after a failed read and retries the device read on click", async () => {
    window.history.replaceState({}, "", "/control/providers");
    const deviceReads: string[] = [];
    // SAFETY: this test stub only reads the URL; the production client calls fetch with the same signature.
    const fetchImpl = (async (url: string) => {
      if (url.includes("/accounts/device")) {
        deviceReads.push(url);
        return new Response(JSON.stringify({ error: "device read failed" }), { headers: { "content-type": "application/json" }, status: 500 });
      }
      return new Response(JSON.stringify([]), { headers: { "content-type": "application/json" }, status: 200 });
    }) as typeof fetch;
    const container = document.createElement("div");
    container.id = "s398-retry";
    document.body.append(container);
    const handle = mountShell(container, { deviceAuthFetchImpl: fetchImpl, readbackReaders: createReadbackClients({ fetchImpl }) });
    mounted.push({ container, handle });
    const start = await waitFor(() => document.querySelector<HTMLElement>("[data-device-auth-start]") ?? undefined, "start button");
    start.click();
    const retry = await waitFor(() => document.querySelector<HTMLElement>("[data-device-auth-retry]") ?? undefined, "retry button");
    expect(document.querySelector("[data-device-auth-state='error']")).not.toBeNull();
    const before = deviceReads.length;
    retry.click();
    await waitFor(() => (deviceReads.length > before ? retry : undefined), "retry device read");
    expect(deviceReads.length).toBeGreaterThan(before);
  });
});
