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
 * S257: invalid JSON on save is an update rule, so it is asserted at the update.
 *
 * The s76a version clicked Load and Review changes, then asserted the editor kept the text and the client saw no
 * PUT. The client cannot see a request the update never commands, so the fact is stronger here: the save emits
 * NO command, a confirm from the invalid state emits NOTHING, and the text is untouched. The second case is the
 * control that proves the counter is wired to a command at all.
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

interface Editor {
  readonly diff: readonly string[];
  readonly originalText: string;
  readonly status: "editing" | "confirming";
  readonly text: string;
  readonly token: number;
}

const model = (editor: Editor) =>
  Schema.decodeUnknownSync(Model)({
    clicks: 0,
    controls: emptyControls(),
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    refresh: initialRuntimeRefreshState(),
    route: { _tag: "Runtime" },
    runtimeConfigEditor: editor,
    theme: "dark",
  }) as unknown as Record<string, unknown>;

const editorOf = (m: Record<string, unknown>) =>
  m.runtimeConfigEditor as { status?: string; text?: string; message?: string } | undefined;

describe("S257 runtime config invalid save", () => {
  it("invalid JSON leaves the text in place and emits no save command", () => {
    saved.length = 0;
    const next = reduce(model({ diff: [], originalText: '{"a": 1}', status: "editing", text: "{bad", token: 0 }), Message.RuntimeConfigSaveRequested({}));
    const editor = editorOf(next.model);
    assert.equal(editor?.status, "invalid", "invalid text must not reach the review state");
    assert.equal(editor?.text, "{bad", "the typed text is kept so it can be fixed");
    assert.ok((editor?.message ?? "").length > 0, "the invalid state explains itself");
    assert.equal(saved.length, 0, "no save command is emitted");

    const confirmed = reduce(next.model, Message.RuntimeConfigConfirmRequested({ token: 1 }));
    assert.equal(saved.length, 0, "a confirm from the invalid state sends nothing");
    assert.equal(editorOf(confirmed.model)?.status, "invalid");
  });

  it("a real change reaches confirming and confirm emits exactly one command (control)", () => {
    saved.length = 0;
    const next = reduce(model({ diff: [], originalText: '{"a": 1}', status: "editing", text: '{"a": 2}', token: 0 }), Message.RuntimeConfigSaveRequested({}));
    assert.equal(editorOf(next.model)?.status, "confirming", "a changed config reaches review");
    const confirmed = reduce(next.model, Message.RuntimeConfigConfirmRequested({ token: 1 }));
    assert.equal(saved.length, 1, "the same counter sees the real save command");
    assert.notEqual(editorOf(confirmed.model)?.status, "confirming");
  });
});
