import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S257: invalid JSON on save is an update rule, so it is asserted at the update.
 *
 * The s76a version clicked Load and Review changes, then asserted the editor kept the text and the client saw no
 * PUT. The client cannot see a request the update never commands, so the fact is stronger here: the save commands
 * NOTHING, a confirm from the invalid state commands NOTHING, and the text is untouched. The second case is the
 * control that proves the same reducer does emit the real save command when the config is valid.
 *
 * S260: the command assertions read the `SaveRuntimeConfig` Command the reducer returned, including its exact
 * args, and the invalid cases assert the returned batch is empty for ANY command, not just that a fake factory
 * was not called.
 */
type Editor = NonNullable<Model["runtimeConfigEditor"]>;

const model = (editor: Editor) =>
  shellModel({ route: { _tag: "Runtime" }, runtimeConfigEditor: editor });

const noCommands = (commands: ReturnType<typeof shellUpdate>["commands"]): boolean =>
  (commands?.length ?? 0) === 0;

describe("S257 runtime config invalid save", () => {
  it("invalid JSON leaves the text in place and returns no command", () => {
    const next = shellUpdate(
      model({ diff: [], originalText: '{"a": 1}', status: "editing", text: "{bad", token: 0 }),
      Message.RuntimeConfigSaveRequested({}),
    );
    const editor = next.model.runtimeConfigEditor;
    assert.equal(editor?.status, "invalid", "invalid text must not reach the review state");
    assert.equal(editor?.text, "{bad", "the typed text is kept so it can be fixed");
    assert.ok((editor?.message ?? "").length > 0, "the invalid state explains itself");
    assert.equal(noCommands(next.commands), true, "the invalid save emits no command of any kind");

    const confirmed = shellUpdate(next.model, Message.RuntimeConfigConfirmRequested({ token: 1 }));
    assert.equal(noCommands(confirmed.commands), true, "a confirm from the invalid state emits no command of any kind");
    assert.equal(confirmed.model.runtimeConfigEditor?.status, "invalid");
  });

  it("a real change reaches confirming and confirm returns exactly one SaveRuntimeConfig command (control)", () => {
    const reviewed = shellUpdate(
      model({ diff: [], originalText: '{"a": 1}', status: "editing", text: '{"a": 2}', token: 0 }),
      Message.RuntimeConfigSaveRequested({}),
    );
    const editor = reviewed.model.runtimeConfigEditor;
    assert.equal(editor?.status, "confirming", "a changed config reaches review");
    assert.equal(noCommands(reviewed.commands), true, "reviewing does not save");
    assert.ok(editor !== undefined, "the confirming state carries the token");

    const confirmed = shellUpdate(reviewed.model, Message.RuntimeConfigConfirmRequested({ token: editor.token }));
    const commands = confirmed.commands ?? [];
    assert.equal(commands.length, 1, "the valid control emits exactly one save command");
    assert.equal(commands[0]?.name, "SaveRuntimeConfig", "the reducer returned the production command");
    assert.equal(commands[0]?.args?.configText, '{"a": 2}', "the command carries the edited text");
    assert.equal(commands[0]?.args?.originalText, '{"a": 1}', "the command carries the loaded snapshot");
    assert.equal(commands[0]?.args?.token, editor.token, "the command carries the confirm token");
    assert.equal(confirmed.model.runtimeConfigEditor?.status, "pending");
    assert.notEqual(confirmed.model.runtimeConfigEditor?.status, "confirming");
  });
});
