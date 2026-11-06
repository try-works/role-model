import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import * as Dialog from "@role-model-router/foldkit-ui/dialog";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import {
  Command,
  Mount,
  type SceneSimulation,
  click,
  given,
  inside,
  label,
  role,
  scene,
  expect as sceneExpect,
  selector,
  tap,
  text,
  type,
} from "@role-model-router/foldkit/scene";

import { defineDeviceAuthCommands } from "../src/commands";
import {
  type DeviceAuthSession,
  createDeviceAuthClient,
  deviceAuthPollDelayMs,
  initialDeviceAuthState,
} from "../src/device-auth";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { view } from "../src/view";
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
  lastError: "Codex Subscription device authorization is waiting on the network (socket reset).",
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
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

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

const authOf = (model: ReturnType<typeof shellModel>) =>
  model.deviceAuth ?? initialDeviceAuthState();
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
    const negative = await clientFor({ ...transientPoll, retryAfterSeconds: -30 }).poll(
      "auth-negative",
    );
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
    const state = {
      ...initialDeviceAuthState(),
      draft,
      session: session(),
      status: "pending" as const,
      token: 1,
    };
    const result = shellUpdate(
      modelWith(state),
      Message.DeviceAuthPolled({ session: parsed, token: 1 }),
    );
    expect(commandNames(result)).toEqual([]);
    const next = authOf(result.model);
    expect(next.status).toBe("error");
    expect(next.inflight).toBe(false);
    expect(next.error).toBe(failedPoll.lastError);
    expect(next.session).toMatchObject({ authRequestId: "auth-failed", status: "failed" });
  });

  it("surfaces the expired reason instead of a connected claim", async () => {
    const parsed = await clientFor(expiredPoll).poll("auth-expired");
    const state = {
      ...initialDeviceAuthState(),
      draft,
      session: session(),
      status: "pending" as const,
      token: 1,
    };
    const result = shellUpdate(
      modelWith(state),
      Message.DeviceAuthPolled({ session: parsed, token: 1 }),
    );
    expect(commandNames(result)).toEqual([]);
    expect(authOf(result.model).status).toBe("error");
    expect(authOf(result.model).error).toBe(expiredPoll.lastError);
  });

  it("uses the host retry interval for the next pending poll", async () => {
    const parsed = await clientFor(transientPoll).poll("auth-transient");
    const state = {
      ...initialDeviceAuthState(),
      draft,
      session: session(),
      status: "pending" as const,
      token: 1,
    };
    const result = shellUpdate(
      modelWith(state),
      Message.DeviceAuthPolled({ session: parsed, token: 1 }),
    );
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
    const polled = await clientFor({ ...failedPoll, authRequestId: "auth-merge" }).poll(
      "auth-merge",
    );
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
    const state = {
      ...initialDeviceAuthState(),
      draft,
      inflight: true,
      session: session(),
      status: "pending" as const,
      token: 2,
    };
    const cancelled = shellUpdate(modelWith(state), Message.DeviceAuthCancelled({}));
    expect(authOf(cancelled.model).inflight).toBe(false);
    expect(authOf(cancelled.model).status).toBe("draft");
    expect(authOf(cancelled.model).session).toBeUndefined();
    const restarted = shellUpdate(cancelled.model, Message.DeviceAuthStartRequested({}));
    expect(commandNames(restarted)).toEqual(["ReadDeviceAuthorizations"]);
    const late = shellUpdate(
      restarted.model,
      Message.DeviceAuthPolled({ session: session({ status: "connected" }), token: 2 }),
    );
    expect(commandNames(late)).toEqual([]);
    expect(authOf(late.model).session).toBeUndefined();
  });
});

describe("S442 pending view (scene + real client bridge)", () => {
  /**
   * S442 (repairs the S440 hold): each rendered click goes through the real view and update. For every
   * command the test needs to replay, ONE exact args object is used twice: it builds and executes the
   * production command effect with the real client (real Effect.sleep of the generated 1s/5s), and the
   * same object is asserted in the scene with Command.expectHas plus a tap deep-equality check of the
   * actual pending command args. The scene does not execute the client; the actual client result is fed
   * back with Command.resolve. Honest split: scene = view -> update -> command args; the effect run in
   * this test = those same args -> real client result.
   */
  type ShellMessage = Parameters<typeof shellUpdate>[1];
  type ShellScene = SceneSimulation<Model, ShellMessage>;
  type DeviceAuthReadArgs = Readonly<{ token: number }>;
  type DeviceAuthPollArgs = Readonly<{
    authRequestId: string;
    delayMs: number;
    intervalMs: number;
    token: number;
  }>;
  type DeviceAuthCommandArgs = DeviceAuthReadArgs | DeviceAuthPollArgs;
  const SAFE_URL = "https://auth.openai.com/device?user_code=ABCD-EFGH";
  const ACCOUNT = "openai.personal.openai-codex-subscription";
  const readArgs: DeviceAuthReadArgs = { token: 1 };
  const expiredPollBody = {
    authRequestId: "auth-pending",
    lastError: "Device code expired.",
    providerAccountId: ACCOUNT,
    status: "expired",
  };
  const captureCommand = (name: string, expectedArgs: DeviceAuthCommandArgs) =>
    tap((simulation: ShellScene) => {
      const pending = [...simulation.commands].reverse().find((command) => command.name === name);
      expect(pending?.args).toEqual(expectedArgs);
    });
  /**
   * The providers route renders BOTH the device-auth form and the provider-account form, and both use
   * the labels Provider / Provider kind / Variant / Model. Scope the typing and Add model click to the
   * device-authorization section so no locator can resolve into the provider-account form.
   */
  const acknowledgeAcquireResources = Mount.resolve(
    Dialog.AcquireResources,
    Dialog.Message.SucceededAcquireResources(),
  );

  const draftSteps = () => [
    inside(
      selector('[data-route="device-authorization"]'),
      type(label("Provider"), "openai"),
      type(label("Variant"), "openai-codex-subscription"),
      type(label("Model"), "gpt-6"),
      click(role("button", { name: "Add model" })),
    ),
  ];

  it("start click restores the host pending session and renders the code + safe link", async () => {
    const calls: Array<{ body?: string; method: string; url: string }> = [];
    // SAFETY: this test stub serves the host readback/poll bodies; the production client owns the requests.
    const fetchImpl = (async (url: string, init?: { body?: string; method?: string }) => {
      const href = String(url);
      calls.push({ body: init?.body, method: init?.method ?? "GET", url: href });
      return href.endsWith("/accounts/device")
        ? json([pendingReadback(SAFE_URL)])
        : json(expiredPollBody);
    }) as typeof fetch;
    const commands = defineDeviceAuthCommands(createDeviceAuthClient({ fetchImpl }));
    const pollArgs = { authRequestId: "auth-pending", delayMs: 5_000, intervalMs: 5_000, token: 2 };
    const readMessage = await Effect.runPromise(commands.read(readArgs).effect);
    const terminalPollMessage = await Effect.runPromise(commands.poll(pollArgs).effect);
    expect(
      calls.map((call) => [call.method, new URL(call.url, "http://localhost").pathname]),
    ).toEqual([
      ["GET", "/api/role-model/accounts/device"],
      ["POST", "/api/role-model/accounts/device/poll"],
    ]);
    expect(JSON.parse(calls[1]?.body ?? "{}")).toEqual({ authRequestId: "auth-pending" });
    scene(
      { update: shellUpdate, view },
      given(shellModel({ deviceAuth: initialDeviceAuthState(), route: { _tag: "Providers" } })),
      ...draftSteps(),
      click(role("button", { name: "Start device authorization" })),
      captureCommand("ReadDeviceAuthorizations", readArgs),
      Command.expectHas({ name: "ReadDeviceAuthorizations", args: readArgs }),
      Command.resolve(commands.read, readMessage),
      acknowledgeAcquireResources,
      sceneExpect(selector("[data-device-auth-user-code]")).toContainText("ABCD-EFGH"),
      sceneExpect(role("link", { name: "Open verification page" })).toHaveAttr("href", SAFE_URL),
      sceneExpect(role("link", { name: "Open verification page" })).toHaveAttr("target", "_blank"),
      sceneExpect(role("link", { name: "Open verification page" })).toHaveAttr(
        "rel",
        "noreferrer noopener",
      ),
      captureCommand("PollDeviceAuthorization", pollArgs),
      Command.expectHas({ name: "PollDeviceAuthorization", args: pollArgs }),
      Command.resolve(commands.poll, terminalPollMessage),
      sceneExpect(text("Device code expired.")).toExist(),
    );
  }, 20_000);

  it("a real minimal pending poll keeps the code and link after the first poll", async () => {
    let pollCount = 0;
    // SAFETY: this test stub serves the host readback/poll bodies; the production client owns the requests.
    const fetchImpl = (async (url: string) => {
      const href = String(url);
      if (href.endsWith("/accounts/device")) {
        return json([{ ...pendingReadback(SAFE_URL), intervalSeconds: 1 }]);
      }
      pollCount += 1;
      return pollCount === 1
        ? json({
            authRequestId: "auth-pending",
            providerAccountId: ACCOUNT,
            retryAfterSeconds: 1,
            status: "pending",
          })
        : json(expiredPollBody);
    }) as typeof fetch;
    const commands = defineDeviceAuthCommands(createDeviceAuthClient({ fetchImpl }));
    const restorePollArgs = {
      authRequestId: "auth-pending",
      delayMs: 1_000,
      intervalMs: 1_000,
      token: 2,
    };
    const nextPollArgs = {
      authRequestId: "auth-pending",
      delayMs: 1_000,
      intervalMs: 1_000,
      token: 3,
    };
    const readMessage = await Effect.runPromise(commands.read(readArgs).effect);
    const pendingPollMessage = await Effect.runPromise(commands.poll(restorePollArgs).effect);
    const terminalPollMessage = await Effect.runPromise(commands.poll(nextPollArgs).effect);
    scene(
      { update: shellUpdate, view },
      given(shellModel({ deviceAuth: initialDeviceAuthState(), route: { _tag: "Providers" } })),
      ...draftSteps(),
      click(role("button", { name: "Start device authorization" })),
      captureCommand("ReadDeviceAuthorizations", readArgs),
      Command.expectHas({ name: "ReadDeviceAuthorizations", args: readArgs }),
      Command.resolve(commands.read, readMessage),
      acknowledgeAcquireResources,
      sceneExpect(selector("[data-device-auth-user-code]")).toContainText("ABCD-EFGH"),
      captureCommand("PollDeviceAuthorization", restorePollArgs),
      Command.expectHas({ name: "PollDeviceAuthorization", args: restorePollArgs }),
      Command.resolve(commands.poll, pendingPollMessage),
      sceneExpect(selector("[data-device-auth-user-code]")).toContainText("ABCD-EFGH"),
      sceneExpect(role("link", { name: "Open verification page" })).toHaveAttr("href", SAFE_URL),
      captureCommand("PollDeviceAuthorization", nextPollArgs),
      Command.expectHas({ name: "PollDeviceAuthorization", args: nextPollArgs }),
      Command.resolve(commands.poll, terminalPollMessage),
    );
  }, 20_000);

  it("refuses an unsafe verification URL protocol instead of linking it", async () => {
    // SAFETY: this test stub serves the host readback/poll bodies; the production client owns the requests.
    const fetchImpl = (async (url: string) =>
      String(url).endsWith("/accounts/device")
        ? json([pendingReadback("javascript:alert('s442')")])
        : json(expiredPollBody)) as typeof fetch;
    const commands = defineDeviceAuthCommands(createDeviceAuthClient({ fetchImpl }));
    const pollArgs = { authRequestId: "auth-pending", delayMs: 5_000, intervalMs: 5_000, token: 2 };
    const readMessage = await Effect.runPromise(commands.read(readArgs).effect);
    const terminalPollMessage = await Effect.runPromise(commands.poll(pollArgs).effect);
    scene(
      { update: shellUpdate, view },
      given(shellModel({ deviceAuth: initialDeviceAuthState(), route: { _tag: "Providers" } })),
      ...draftSteps(),
      click(role("button", { name: "Start device authorization" })),
      captureCommand("ReadDeviceAuthorizations", readArgs),
      Command.resolve(commands.read, readMessage),
      acknowledgeAcquireResources,
      sceneExpect(text("Verification link unavailable.")).toExist(),
      sceneExpect(role("link", { name: "Open verification page" })).toBeAbsent(),
      sceneExpect(selector('a[href^="javascript:"]')).toBeAbsent(),
      captureCommand("PollDeviceAuthorization", pollArgs),
      Command.expectHas({ name: "PollDeviceAuthorization", args: pollArgs }),
      Command.resolve(commands.poll, terminalPollMessage),
    );
  }, 20_000);

  it("cancel clears the pending session and a rendered start click re-dispatches the read", async () => {
    // SAFETY: this test stub answers the device read with the host error body; the production client owns the request.
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: "device read failed" }), {
        headers: { "content-type": "application/json" },
        status: 500,
      })) as typeof fetch;
    const commands = defineDeviceAuthCommands(createDeviceAuthClient({ fetchImpl }));
    const restartReadArgs = { token: 4 };
    const failedReadMessage = await Effect.runPromise(commands.read(restartReadArgs).effect);
    scene(
      { update: shellUpdate, view },
      given(
        shellModel({
          deviceAuth: {
            ...initialDeviceAuthState(),
            draft,
            inflight: true,
            session: {
              ...pendingReadback(SAFE_URL),
              intervalSeconds: 5,
              status: "pending" as const,
            },
            status: "pending" as const,
            token: 2,
          },
          route: { _tag: "Providers" },
        }),
      ),
      acknowledgeAcquireResources,
      sceneExpect(role("button", { name: "Cancel" })).toExist(),
      click(role("button", { name: "Cancel" })),
      Command.expectHas({
        name: "PollDeviceAuthorization.Interrupt",
        args: { authRequestId: "auth-pending" },
      }),
      Command.resolve(
        commands.poll.Interrupt({ authRequestId: "auth-pending" }, () =>
          Message.DeviceAuthPollCancelCompleted({}),
        ),
        Message.DeviceAuthPollCancelCompleted({}),
      ),
      Mount.expectEnded(Dialog.AcquireResources),
      sceneExpect(role("button", { name: "Cancel" })).toBeAbsent(),
      sceneExpect(role("button", { name: "Start device authorization" })).toBeEnabled(),
      click(role("button", { name: "Start device authorization" })),
      captureCommand("ReadDeviceAuthorizations", restartReadArgs),
      Command.expectHas({ name: "ReadDeviceAuthorizations", args: restartReadArgs }),
      Command.resolve(commands.read, failedReadMessage),
      sceneExpect(text("device read failed")).toExist(),
    );
  });

  it("renders the pending verification link as a keyboard-focusable anchor (tabindex 0)", async () => {
    const pendingModel = shellModel({
      deviceAuth: {
        ...initialDeviceAuthState(),
        draft,
        inflight: true,
        session: { ...pendingReadback(SAFE_URL), status: "pending" as const },
        status: "pending" as const,
        token: 1,
      },
      route: { _tag: "Providers" },
    });
    const rendered = await Effect.runPromise(
      renderToString(
        {
          init: () => ({ model: pendingModel, commands: [] }),
          view,
        },
        { isHydratable: false },
      ),
    );
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    const link = container.querySelector<HTMLAnchorElement>(
      "a[data-device-auth-verification-link]",
    );
    expect(link?.tagName).toBe("A");
    expect(link?.tabIndex).toBe(0);
    expect(link?.getAttribute("href")).toBe(SAFE_URL);
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noreferrer noopener");
  });
});
