import { Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";

import { defineDeviceAuthCommands, defineReadDiagnostics } from "../src/commands";
import { type DeviceAuthClient, type DeviceAuthSession, initialDeviceAuthState } from "../src/device-auth";
import { Message } from "../src/message";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

/**
 * S459: device-auth poll cancellation lifetime.
 *
 * The poll Command owns an Effect.sleep(delayMs) and then the device poll request. Cancelling the
 * authorization must interrupt that scheduled Command so no further request is issued and no timer
 * dangles; an in-flight request may complete but its Message must never dispatch. The token fence
 * stays as defence in depth. These tests drive the production reducer, the production Command
 * definitions and the real interrupt registry (no scene, no click budget change).
 */
const ACCOUNT = "openai.personal.openai-codex-subscription";
const readDiagnostics = defineReadDiagnostics(async () => ({
  body: { records: [], state: "empty" },
  status: 200,
}));

const pending = (authRequestId: string): DeviceAuthSession => ({
  authRequestId,
  intervalSeconds: 1,
  providerAccountId: ACCOUNT,
  status: "pending",
  userCode: "ABCD-EFGH",
  verificationUri: "https://auth.openai.com/device",
  verificationUriComplete: "https://auth.openai.com/device?user_code=ABCD-EFGH",
});

const makeHarness = () => {
  const counter = { polls: 0 };
  const client: DeviceAuthClient = {
    activate: async () => ({}),
    list: async () => [],
    poll: async (authRequestId) => {
      counter.polls += 1;
      return pending(authRequestId);
    },
    start: async () => pending("auth-new"),
  };
  const commands = defineDeviceAuthCommands(client);
  const update = createUpdate(
    readDiagnostics,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    commands,
  );
  return { commands, counter, update };
};

const settle = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const scheduledPoll = (result: { commands?: readonly unknown[] }) => {
  // SAFETY: the test only reads the update's command identity/effect; the production definitions own the payload.
  const commands = (result.commands ?? []) as readonly {
    name: string;
    effect: Effect.Effect<unknown>;
    args?: unknown;
  }[];
  const poll = commands.find((command) => command.name === "PollDeviceAuthorization");
  if (!poll) throw new Error("expected a scheduled PollDeviceAuthorization command");
  return poll;
};

const interruptOf = (result: { commands?: readonly unknown[] }) => {
  // SAFETY: the test only reads the update's command identity/effect; the production definitions own the payload.
  const commands = (result.commands ?? []) as readonly {
    name: string;
    effect: Effect.Effect<unknown>;
  }[];
  return commands.find((command) => command.name === "PollDeviceAuthorization.Interrupt");
};

const runInterrupt = async (result: { commands?: readonly unknown[] }) => {
  const interrupt = interruptOf(result);
  if (interrupt) await Effect.runPromise(interrupt.effect);
};

const awaitFiber = async (fiber: Parameters<typeof Fiber.await>[0]) => {
  await Effect.runPromise(Fiber.await(fiber));
};

describe("S459 device-auth poll cancellation lifetime", () => {
  it("R1 cancel immediately after the poll is scheduled issues no poll request", async () => {
    const { counter, update } = makeHarness();
    const started = update(
      shellModel({ deviceAuth: { ...initialDeviceAuthState(), inflight: true, status: "pending" } }),
      Message.DeviceAuthStarted({ session: pending("auth-1"), token: 0 }),
    );
    const poll = scheduledPoll(started);
    const fiber = Effect.runFork(poll.effect);

    const cancelled = update(started.model, Message.DeviceAuthCancelled({}));
    await runInterrupt(cancelled);
    await settle(1_300);
    await awaitFiber(fiber);

    expect(counter.polls).toBe(0);
  });

  it("R2 cancel during the poll delay issues no poll request", async () => {
    const { counter, update } = makeHarness();
    const started = update(
      shellModel({ deviceAuth: { ...initialDeviceAuthState(), inflight: true, status: "pending" } }),
      Message.DeviceAuthStarted({ session: pending("auth-2"), token: 0 }),
    );
    const fiber = Effect.runFork(scheduledPoll(started).effect);

    await settle(200);
    const cancelled = update(started.model, Message.DeviceAuthCancelled({}));
    await runInterrupt(cancelled);
    await settle(1_200);
    await awaitFiber(fiber);

    expect(counter.polls).toBe(0);
  });

  it("R3 cancel after a response with the next poll scheduled keeps exactly one request", async () => {
    const { counter, update } = makeHarness();
    const state = {
      ...initialDeviceAuthState(),
      inflight: false,
      session: pending("auth-3"),
      status: "pending" as const,
      token: 2,
    };
    const retried = update(shellModel({ deviceAuth: state }), Message.DeviceAuthRetryRequested({}));
    const first = await Effect.runPromise(scheduledPoll(retried).effect.pipe(Effect.map((message) => message)));
    counter.polls = 1;
    // SAFETY: executing the production poll command yields its declared Message result (DeviceAuthPolled/Failed).
    const polled = update(retried.model, first as Message);
    const secondFiber = Effect.runFork(scheduledPoll(polled).effect);

    const cancelled = update(polled.model, Message.DeviceAuthCancelled({}));
    await runInterrupt(cancelled);
    await settle(1_300);
    await awaitFiber(secondFiber);

    expect(counter.polls).toBe(1);
  });

  it("R4 a restart after cancel schedules a new authorization whose poll still runs", async () => {
    const { counter, update } = makeHarness();
    const started = update(
      shellModel({ deviceAuth: { ...initialDeviceAuthState(), inflight: true, status: "pending" } }),
      Message.DeviceAuthStarted({ session: pending("auth-4"), token: 0 }),
    );
    const firstFiber = Effect.runFork(scheduledPoll(started).effect);
    const cancelled = update(started.model, Message.DeviceAuthCancelled({}));
    await runInterrupt(cancelled);
    await settle(60);

    const restarted = update(cancelled.model, Message.DeviceAuthStartRequested({}));
    expect((restarted.commands ?? []).map((command) => command.name)).toEqual(["ReadDeviceAuthorizations"]);

    // DeviceAuthStartRequested advances the token, so the restarted session answers that token.
    const nextToken = restarted.model.deviceAuth?.token ?? 0;
    const startedAgain = update(
      restarted.model,
      Message.DeviceAuthStarted({ session: pending("auth-restarted"), token: nextToken }),
    );
    const restartedFiber = Effect.runFork(scheduledPoll(startedAgain).effect);
    await awaitFiber(firstFiber);
    await settle(1_300);
    await awaitFiber(restartedFiber);
    expect(counter.polls).toBe(1);
  });

  it("R5 cancel with no scheduled poll stays state-only", () => {
    const { update } = makeHarness();
    const cancelled = update(
      shellModel({ deviceAuth: { ...initialDeviceAuthState(), inflight: false, status: "starting" } }),
      Message.DeviceAuthCancelled({}),
    );
    expect(cancelled.commands ?? []).toHaveLength(0);
  });
});
