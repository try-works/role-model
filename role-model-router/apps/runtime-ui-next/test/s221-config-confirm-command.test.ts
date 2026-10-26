import assert from "node:assert/strict";
import { Schema } from "effect";
import { describe, it } from "vitest";

import { emptyControls } from "../src/control";
import { idleDiagnostics } from "../src/diagnostics";
import { Model } from "../src/model";
import { Message } from "../src/message";
import { idleObservability } from "../src/observability";
import { emptyReadbacks } from "../src/readback";
import { initialRuntimeRefreshState } from "../src/refresh";
import { createUpdate } from "../src/update";

/**
 * S221: the confirm-to-save leg, pinned without a browser.
 *
 * S219 proved this leg by hand and S220 pinned the editor transitions; this pins that confirming
 * emits exactly one save command carrying the edited text, and that a second confirm cannot send a
 * second write.
 */
const noop = undefined as never;
const saved: unknown[] = [];
const saveRuntimeConfig = ((args: unknown) => {
  saved.push(args);
  return { _tag: "SaveRuntimeConfig", args } as never;
}) as never;
const reduce = createUpdate(noop, undefined, undefined, undefined, undefined, undefined, undefined, saveRuntimeConfig) as unknown as (
  model: unknown,
  message: unknown,
) => { commands?: readonly unknown[]; model: Record<string, unknown> };

const base = () =>
  Schema.decodeUnknownSync(Model)({
    clicks: 0,
    controls: emptyControls(),
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    refresh: initialRuntimeRefreshState(),
    route: { _tag: "Runtime" },
    theme: "dark",
  }) as unknown as Record<string, unknown>;

const editorOf = (model: Record<string, unknown>) =>
  model.runtimeConfigEditor as { status?: string; text?: string; token?: number; diff?: readonly string[] } | undefined;

const reviewed = () => {
  const typed = reduce(base(), Message.RuntimeConfigTextChanged({ text: '{"version":"1.0"}' }));
  return reduce(typed.model, Message.RuntimeConfigSaveRequested({}));
};

describe("S221 runtime config confirm emits the save command", () => {
  it("a changed config reaches confirming with a diff", () => {
    const editor = editorOf(reviewed().model);
    assert.equal(editor?.status, "confirming");
    assert.ok((editor?.diff ?? []).length > 0, "the review panel lists the change");
  });

  it("confirming emits ONE save command carrying the edited text", () => {
    saved.length = 0;
    const state = reviewed();
    const token = editorOf(state.model)?.token ?? 0;
    const confirmed = reduce(state.model, Message.RuntimeConfigConfirmRequested({ token }));
    assert.equal(saved.length, 1, "exactly one save command");
    assert.match(JSON.stringify(saved[0]), /version/, "the command carries the edited text");
    assert.notEqual(editorOf(confirmed.model)?.status, "confirming", "the editor leaves the review state");
  });

  it("a second confirm while saving is a no-op (no double submit)", () => {
    saved.length = 0;
    const state = reviewed();
    const token = editorOf(state.model)?.token ?? 0;
    const first = reduce(state.model, Message.RuntimeConfigConfirmRequested({ token }));
    const second = reduce(first.model, Message.RuntimeConfigConfirmRequested({ token }));
    assert.equal(saved.length, 1, "two confirms must not send two writes");
    // Whatever the first confirm set, the second must not change it: the point is that no second
    // write happened.
    assert.equal(editorOf(second.model)?.status, editorOf(first.model)?.status, "the second confirm changes nothing");
  });
});
