import { afterEach, describe, expect, it } from "vitest";

import { Message } from "../src/message";
import {
  createDeviceAuthClient,
  deviceAuthPollDelayMs,
  initialDeviceAuthState,
  type DeviceAuthSession,
} from "../src/device-auth";
import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S425: device-auth correctness against the REAL host contract (S420 audit F8/F9/F11).
 *
 * The host bridge publishes a device poll result as
 * `{ authRequestId, providerAccountId, status: "pending" | "connected" | "expired" | "failed",
 *    retryAfterSeconds?, lastError? }` and a readback list entry that also carries userCode,
 * verificationUri, verificationUriComplete, intervalSeconds and expiresAtMs
 * (apps/runtime-host-bridge/src/index.ts:7603-7623, :21951-21974, :33195-33295).
 *
 * The previous client normalized every non-connected status to "pending" (no lastError, no
 * retryAfterSeconds), so a real "failed"/"expired" poll polled forever; cancel kept inflight:true so a
 * restart was refused; and the pending view never rendered the user code or verification link.
 */
const failedPoll = {
  authRequestId: "auth-failed",
  lastError:
    "Codex Subscription login could not be completed (access denied). Reconnect to continue.",
  providerAccountId: "openai.personal.openai-codex-subscription",
  status: "failed",
};
const expiredPoll = {
  authRequestId: "auth-expired",
  lastError: "Device code expired.",
  providerAccountId: "openai.personal.openai-codex-subscription",
  status: "expired",
};
const transientPoll = {
  authRequestId: "auth-transient",
  lastError:
    "Codex Subscription device authorization is waiting on the network (socket reset).",
  providerAccountId: "openai.personal.openai-codex-subscription",
  retryAfterSeconds: 7,
  status: "pending",
};
const pendingReadback = (verificationUriComplete: string) => ({
  authRequestId: "auth-pending",
  expiresAtMs: Date.now() + 600_000,
  intervalSeconds: 5,
  providerAccountId: "openai.personal.openai-codex-subscription",
  providerId: "openai",
  status: "pending",
  userCode: "ABCD-EFGH",
  variantId: "openai-codex-subscription",
  verificationUri: "https://auth.openai.com/device",
  verificationUriComplete,
});

interface HostPollBody {
  authRequestId: string;
  lastError?: string;
  providerAccountId: string;
  retryAfterSeconds?: number;
  status: string;
}
interface HostReadbackBody extends HostPollBody {
  expiresAtMs: number;
  intervalSeconds: number;
  providerId: string;
  userCode: string;
  variantId: string;
  verificationUri: string;
  verificationUriComplete: string;
}
type HostBody = HostPollBody | readonly HostReadbackBody[];

const json = (body: HostBody): Response =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });

/** SAFETY: this stub only supplies the host JSON body; the production client owns request construction. */
const clientFor = (body: HostBody) =>
  createDeviceAuthClient({ fetchImpl: (async () => json(body)) as typeof fetch });

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

const authOf = (model: ReturnType<typeof shellModel>) => model.deviceAuth ?? initialDeviceAuthState();
const modelWith = (deviceAuth: ReturnType<typeof initialDeviceAuthState>) =>
  shellModel({ deviceAuth });
const commandNames = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).map((command) => command.name);

describe("S425 host device poll parsing", () => {
  it("keeps a real host failed poll status instead of normalizing it to pending", async () => {
    const parsed = await clientFor(failedPoll).poll("auth-failed");
    expect(parsed).toMatchObject({ status: "failed", lastError: failedPoll.lastError });
  });

  it("keeps a real host expired poll status and its reason", async () => {
    const parsed = await clientFor(expiredPoll).poll("auth-expired");
    expect(parsed).toMatchObject({ status: "expired", lastError: expiredPoll.lastError });
  });

  it("keeps the transient pending reason and honors the host retry interval", async () => {
    const parsed = await clientFor(transientPoll).poll("auth-transient");
    expect(parsed).toMatchObject({ status: "pending", lastError: transientPoll.lastError });
    expect(deviceAuthPollDelayMs(parsed)).toBe(7_000);
  });

  it("ignores a non-positive host retry interval instead of busy-looping", async () => {
    const zero = await clientFor({ ...transientPoll, retryAfterSeconds: 0 }).poll("auth-zero");
    expect(deviceAuthPollDelayMs(zero)).toBe(5_000);
    const negative = await clientFor({ ...transientPoll, retryAfterSeconds: -30 }).poll("auth-negative");
    expect(deviceAuthPollDelayMs(negative)).toBe(5_000);
  });

  it("keeps the readback user code and verification URL the pending view needs", async () => {
    const sessions = await clientFor([
      pendingReadback("https://auth.openai.com/device?user_code=ABCD-EFGH"),
    ]).list();
    expect(sessions[0]).toMatchObject({
      status: "pending",
      userCode: "ABCD-EFGH",
      verificationUriComplete: "https://auth.openai.com/device?user_code=ABCD-EFGH",
    });
  });
});

describe("S425 failed/expired poll transitions", () => {
  it("surfaces the host failure reason and stops polling", async () => {
    const parsed = await clientFor(failedPoll).poll("auth-failed");
    const state = { ...initialDeviceAuthState(), draft, session: session(), status: "pending" as const, token: 1 };
    const result = shellUpdate(modelWith(state), Message.DeviceAuthPolled({ session: parsed, token: 1 }));
    expect(commandNames(result)).toEqual([]);
    const next = authOf(result.model);
    expect(next.status).toBe("error");
    expect(next.inflight).toBe(false);
    expect(next.error).toBe(failedPoll.lastError);
    expect(next.session).toMatchObject({ authRequestId: "auth-failed", status: "failed" });
  });

  it("surfaces the expired reason instead of a connected claim", async () => {
    const parsed = await clientFor(expiredPoll).poll("auth-expired");
    const state = { ...initialDeviceAuthState(), draft, session: session(), status: "pending" as const, token: 1 };
    const result = shellUpdate(modelWith(state), Message.DeviceAuthPolled({ session: parsed, token: 1 }));
    expect(commandNames(result)).toEqual([]);
    expect(authOf(result.model).status).toBe("error");
    expect(authOf(result.model).error).toBe(expiredPoll.lastError);
  });

  it("uses the host retry interval for the next pending poll", async () => {
    const parsed = await clientFor(transientPoll).poll("auth-transient");
    const state = { ...initialDeviceAuthState(), draft, session: session(), status: "pending" as const, token: 1 };
    const result = shellUpdate(modelWith(state), Message.DeviceAuthPolled({ session: parsed, token: 1 }));
    expect(commandNames(result)).toEqual(["PollDeviceAuthorization"]);
    expect((result.commands ?? [])[0]?.args).toMatchObject({ delayMs: 7_000, intervalMs: 7_000 });
  });
});

describe("S432 pending poll keeps the authorization challenge", () => {
  const restored = (): DeviceAuthSession => ({
    ...session(),
    authRequestId: "auth-merge",
    userCode: "ABCD-EFGH",
    verificationUri: "https://auth.openai.com/device",
    verificationUriComplete: "https://auth.openai.com/device?user_code=ABCD-EFGH",
  });
  const polledPending = async (authRequestId: string): Promise<DeviceAuthSession> =>
    clientFor({
      authRequestId,
      providerAccountId: "openai.personal.openai-codex-subscription",
      retryAfterSeconds: 5,
      status: "pending",
    }).poll(authRequestId);
  const pendingState = (sessionValue: DeviceAuthSession = restored()) => ({
    ...initialDeviceAuthState(),
    draft,
    inflight: true,
    session: sessionValue,
    status: "pending" as const,
    token: 1,
  });

  it("keeps the restored userCode and verification URL after a minimal pending poll for the same authorization", async () => {
    const polled = await polledPending("auth-merge");
    const result = shellUpdate(
      modelWith(pendingState()),
      Message.DeviceAuthPolled({ session: polled, token: 1 }),
    );
    expect(commandNames(result)).toEqual(["PollDeviceAuthorization"]);
    expect(authOf(result.model).session).toMatchObject({
      authRequestId: "auth-merge",
      retryAfterSeconds: 5,
      status: "pending",
      userCode: "ABCD-EFGH",
      verificationUriComplete: "https://auth.openai.com/device?user_code=ABCD-EFGH",
    });
    expect((result.commands ?? [])[0]?.args).toMatchObject({ delayMs: 5_000 });
  });

  it("never inherits another authorization's challenge", async () => {
    const polled = await polledPending("auth-foreign");
    const result = shellUpdate(
      modelWith(pendingState()),
      Message.DeviceAuthPolled({ session: polled, token: 1 }),
    );
    const next = authOf(result.model).session;
    expect(next).toMatchObject({ authRequestId: "auth-foreign", status: "pending" });
    expect(next?.userCode).toBeUndefined();
    expect(next?.verificationUriComplete).toBeUndefined();
  });

  it("keeps a terminal poll's own reason without resurrecting the old pending challenge", async () => {
    const polled = await clientFor({ ...failedPoll, authRequestId: "auth-merge" }).poll("auth-merge");
    const result = shellUpdate(
      modelWith(pendingState()),
      Message.DeviceAuthPolled({ session: polled, token: 1 }),
    );
    const next = authOf(result.model);
    expect(next.status).toBe("error");
    expect(next.error).toBe(failedPoll.lastError);
    expect(next.session).toMatchObject({
      authRequestId: "auth-merge",
      lastError: failedPoll.lastError,
      status: "failed",
    });
    expect(next.session?.userCode).toBeUndefined();
  });
});

describe("S425 cancel clears inflight and fences stale results", () => {
  it("permits a new start after cancel while a late poll stays fenced", () => {
    const state = { ...initialDeviceAuthState(), draft, inflight: true, session: session(), status: "pending" as const, token: 2 };
    const cancelled = shellUpdate(modelWith(state), Message.DeviceAuthCancelled({}));
    expect(authOf(cancelled.model).inflight).toBe(false);
    expect(authOf(cancelled.model).status).toBe("draft");
    expect(authOf(cancelled.model).session).toBeUndefined();
    const restarted = shellUpdate(cancelled.model, Message.DeviceAuthStartRequested({}));
    expect(commandNames(restarted)).toEqual(["ReadDeviceAuthorizations"]);
    const late = shellUpdate(restarted.model, Message.DeviceAuthPolled({ session: session({ status: "connected" }), token: 2 }));
    expect(commandNames(late)).toEqual([]);
    expect(authOf(late.model).session).toBeUndefined();
  });
});

describe("S425 pending view (mounted)", () => {
  const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
  afterEach(() => {
    for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
    window.history.replaceState({}, "", "/");
  });

  const waitFor = async <T extends Element>(
    read: () => T | null | undefined,
    label: string,
  ): Promise<T> => {
    const end = Date.now() + 3000;
    while (Date.now() < end) {
      const value = read();
      if (value !== null && value !== undefined) return value;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timed out waiting for " + label);
  };

  const mountDeviceAuth = (
    listBody: readonly HostReadbackBody[],
    pollBody: HostPollBody = {
      authRequestId: "auth-pending",
      providerAccountId: "openai.personal.openai-codex-subscription",
      retryAfterSeconds: 5,
      status: "pending",
    },
    pollCalls: string[] = [],
  ): void => {
    window.history.replaceState({}, "", "/control/providers");
    // SAFETY: the stub only answers the device readback/poll; every other reader gets an empty list.
    const fetchImpl = (async (url: string) => {
      const href = String(url);
      if (href.endsWith("/accounts/device")) return json(listBody);
      if (href.includes("/accounts/device/poll")) {
        pollCalls.push(href);
        return json(pollBody);
      }
      return json([]);
    }) as typeof fetch;
    const container = document.createElement("div");
    container.id = "s425-device-auth";
    document.body.append(container);
    const handle = mountShell(container, {
      deviceAuthFetchImpl: fetchImpl,
      readbackReaders: createReadbackClients({ fetchImpl }),
    });
    mounted.push({ container, handle });
  };

  const fieldAt = (index: number): HTMLInputElement => {
    const section = document.querySelector<HTMLElement>('[data-route="device-authorization"]');
    const fields = section === null ? [] : Array.from(section.querySelectorAll<HTMLInputElement>("input"));
    const field = fields[index];
    if (field === undefined) throw new Error("device-auth field " + index + " is missing");
    return field;
  };
  const fill = (index: number, value: string): void => {
    const field = fieldAt(index);
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const clickButton = (label: string): void => {
    const section = document.querySelector<HTMLElement>('[data-route="device-authorization"]');
    const button = section === null
      ? undefined
      : Array.from(section.querySelectorAll("button")).find((candidate) => candidate.textContent === label);
    if (button === undefined) throw new Error("button " + label + " is missing");
    button.click();
  };
  const startDeviceAuth = async (): Promise<void> => {
    await waitFor(() => document.querySelector<HTMLElement>("[data-device-auth-start]"), "start button");
    fill(0, "openai");
    fill(2, "openai-codex-subscription");
    fill(5, "gpt-6");
    clickButton("Add model");
    await waitFor(() => document.querySelector<HTMLElement>("[data-device-auth-start]"), "start button after draft");
    document.querySelector<HTMLElement>("[data-device-auth-start]")?.click();
  };

  it("renders the host user code and a keyboard-focusable safe verification link while pending", async () => {
    mountDeviceAuth([pendingReadback("https://auth.openai.com/device?user_code=ABCD-EFGH")]);
    await startDeviceAuth();
    const code = await waitFor(
      () => document.querySelector<HTMLElement>("[data-device-auth-user-code]"),
      "pending user code",
    );
    expect(code.textContent?.trim()).toBe("ABCD-EFGH");
    const link = await waitFor(
      () => document.querySelector<HTMLAnchorElement>("a[data-device-auth-verification-link]"),
      "verification link",
    );
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://auth.openai.com/device?user_code=ABCD-EFGH");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(String(link.getAttribute("rel"))).toContain("noreferrer");
    expect(link.tabIndex).toBe(0);
  });

  it("still renders the code and verification link after the first real pending poll", async () => {
    const pollCalls: string[] = [];
    mountDeviceAuth(
      [{ ...pendingReadback("https://auth.openai.com/device?user_code=ABCD-EFGH"), intervalSeconds: 1 }],
      {
        authRequestId: "auth-pending",
        providerAccountId: "openai.personal.openai-codex-subscription",
        retryAfterSeconds: 1,
        status: "pending",
      },
      pollCalls,
    );
    await startDeviceAuth();
    const code = await waitFor(
      () => document.querySelector<HTMLElement>("[data-device-auth-user-code]"),
      "pending user code before the poll",
    );
    expect(code.textContent?.trim()).toBe("ABCD-EFGH");
    await waitFor(() => (pollCalls.length > 0 ? document.body : undefined), "first device poll");
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(
      document.querySelector<HTMLElement>("[data-device-auth-user-code]")?.textContent?.trim(),
    ).toBe("ABCD-EFGH");
    expect(
      document.querySelector<HTMLAnchorElement>("a[data-device-auth-verification-link]")?.getAttribute("href"),
    ).toBe("https://auth.openai.com/device?user_code=ABCD-EFGH");
  });

  it("refuses an unsafe verification URL protocol instead of linking it", async () => {
    mountDeviceAuth([pendingReadback("javascript:alert('s425')")]);
    await startDeviceAuth();
    await waitFor(
      () => document.querySelector<HTMLElement>("[data-device-auth-verification-unavailable]"),
      "verification unavailable notice",
    );
    expect(document.querySelector('a[data-device-auth-verification-link]')).toBeNull();
    expect(document.querySelector('[href^="javascript:"]')).toBeNull();
  });
});
