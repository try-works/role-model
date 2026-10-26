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
 * S220: the runtime-config editor state machine, pinned at the message level.
 *
 * A DOM journey for this form could not reach the confirm state from a script (S219), so the
 * transitions that matter are pinned here: a text change moves the editor into "editing", invalid
 * JSON reports "invalid" with a message, and a save with no diff stays out of "confirming".
 */
const noop = undefined as never;
const reduce = createUpdate(noop, undefined, undefined, undefined, undefined, undefined, undefined, undefined) as unknown as (
  model: unknown,
  message: unknown,
) => { model: Record<string, unknown> };

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
  model.runtimeConfigEditor as { status?: string; text?: string; message?: string; diff?: readonly string[] } | undefined;

describe("S220 runtime config editor transitions", () => {
  it("a text change moves the editor into editing with the typed text", () => {
    const next = reduce(base(), Message.RuntimeConfigTextChanged({ text: '{"version":"1.0"}' }));
    assert.equal(editorOf(next.model)?.status, "editing");
    assert.equal(editorOf(next.model)?.text, '{"version":"1.0"}');
  });

  it("invalid JSON makes the editor invalid and names the problem", () => {
    const typed = reduce(base(), Message.RuntimeConfigTextChanged({ text: "{ not json" }));
    const saved = reduce(typed.model, Message.RuntimeConfigSaveRequested({}));
    const editor = editorOf(saved.model);
    assert.equal(editor?.status, "invalid");
    assert.ok((editor?.message ?? "").length > 0, "the invalid state explains itself");
  });

  it("a save with no top-level change does not enter confirming", () => {
    const saved = reduce(base(), Message.RuntimeConfigSaveRequested({}));
    assert.notEqual(editorOf(saved.model)?.status, "confirming");
  });
});
