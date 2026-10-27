import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";
import { runtimeConfigDiff, parseRuntimeConfigText } from "../src/runtime-config";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => { const end = Date.now() + 3000; while (Date.now() < end) { const value = read(); if (value !== undefined) return value; await new Promise((r) => setTimeout(r, 10)); } throw new Error("Timed out waiting for " + label); };
const mount = (fetchImpl: typeof fetch) => { window.history.replaceState({}, "", "/runtime"); const container = document.createElement("div"); container.id = "s76a-" + String(Math.random()); document.body.append(container); const handle = mountShell(container, { readbackFetchImpl: fetchImpl, runtimeConfigFetchImpl: fetchImpl }); mounted.push({ container, handle }); };
const editor = () => document.querySelector("[data-runtime-config-editor]") as HTMLTextAreaElement;
const setText = (text: string) => { const node = editor(); node.value = text; node.dispatchEvent(new Event("input", { bubbles: true })); };
afterEach(() => { for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); } window.history.replaceState({}, "", "/"); });

/**
 * S76a: the runtime-config wiring that needs a real client.
 *
 * The "not loaded yet" panel, the invalid-JSON paint and the review/saved rendering that used to live here moved
 * to test/s256-runtime-config-rendering-scene.test.ts (scene, no click) and the invalid-save rule moved to
 * test/s257-runtime-config-invalid-save.test.ts (update, no click). What stays here is what needs the fetch path:
 * the stale-confirm guard, the exact PUT body and the 409 path. The PUT wire shape itself is s222.
 */
describe("S76a runtime config editor", () => {
  it("validates JSON and lists changed top-level keys without sending", () => {
    expect("error" in parseRuntimeConfigText("{bad")).toBe(true);
    expect("error" in parseRuntimeConfigText("[]")).toBe(true);
    expect(runtimeConfigDiff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })).toEqual(["changed: b", "added: c"]);
    expect(runtimeConfigDiff({ a: 1, b: 2 }, { a: 1 })).toEqual(["removed: b"]);
  });

  it("refuses to PUT when the server changed between Load and Confirm", async () => {
    let config = { a: 1, b: 2 };
    const puts: string[] = [];
    mount(async (_input, init) => { if (init?.method === "PUT") { puts.push("PUT"); return json(config); } return json({ applied: false, config }); });
    await waitFor(() => document.querySelector("[data-runtime-config-load]") ? true : undefined, "load");
    (document.querySelector("[data-runtime-config-load]") as HTMLButtonElement).click();
    await waitFor(() => editor()?.value.includes('"b": 2') ? true : undefined, "editor");
    setText(JSON.stringify({ a: 1, b: 3 }, null, 2));
    (document.querySelector("[data-runtime-config-save]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-runtime-config-confirm-save]") ? true : undefined, "confirm");
    config = { a: 1, b: 5 };
    (document.querySelector("[data-runtime-config-confirm-save]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-runtime-config-error]") ? true : undefined, "stale error");
    expect(puts).toHaveLength(0);
    expect(document.querySelector("[data-runtime-config-error]")?.textContent).toContain("changed since Load");
  });

  it("PUTs the exact edited body from the confirm step", async () => {
    const calls: Array<{ body: unknown; method: string }> = [];
    let saved = false;
    mount(async (input, init) => {
      const method = init?.method ?? "GET";
      if (method === "PUT") { calls.push({ body: JSON.parse(String(init?.body)), method }); saved = true; return json({ applied: true, config: { a: 1, b: 99 } }); }
      return json({ applied: saved, config: saved ? { a: 1, b: 99 } : { a: 1, b: 2 } });
    });
    await waitFor(() => document.querySelector("[data-runtime-config-load]") ? true : undefined, "load");
    (document.querySelector("[data-runtime-config-load]") as HTMLButtonElement).click();
    await waitFor(() => editor()?.value.includes('"b": 2') ? true : undefined, "editor");
    setText(JSON.stringify({ a: 1, b: 3 }, null, 2));
    (document.querySelector("[data-runtime-config-save]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-runtime-config-confirm]") ? true : undefined, "confirm");
    (document.querySelector("[data-runtime-config-confirm-save]") as HTMLButtonElement).click();
    // The notice is the completion signal for the PUT + the applied re-read; its text and the resulting
    // editor snapshot are rendering assertions and live in s256-runtime-config-rendering-scene.test.ts.
    await waitFor(() => document.querySelector("[data-runtime-config-notice]") ? true : undefined, "notice");
    expect(calls.at(-1)?.body).toEqual({ a: 1, b: 3 });
    expect(calls.at(-1)?.method).toBe("PUT");
  });

  it("keeps the previous snapshot and text on 4xx", async () => {
    mount(async (input, init) => (init?.method === "PUT" ? json({ message: "rejected by host" }, 409) : json({ applied: false, config: { a: 1, b: 2 } })));
    await waitFor(() => document.querySelector("[data-runtime-config-load]") ? true : undefined, "load");
    (document.querySelector("[data-runtime-config-load]") as HTMLButtonElement).click();
    await waitFor(() => editor()?.value.includes('"b": 2') ? true : undefined, "editor");
    const text = JSON.stringify({ a: 1, b: 3 }, null, 2); setText(text);
    (document.querySelector("[data-runtime-config-save]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-runtime-config-confirm-save]") ? true : undefined, "confirm");
    (document.querySelector("[data-runtime-config-confirm-save]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-runtime-config-error]") ? true : undefined, "alert");
    expect(document.querySelector("[data-runtime-config-error]")?.textContent).toContain("rejected by host");
    expect(editor().value).toBe(text);
  });
});
