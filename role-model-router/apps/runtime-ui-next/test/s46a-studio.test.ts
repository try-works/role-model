import assert from "node:assert/strict";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " | " + (document.body.textContent ?? "").slice(0, 400));
};
const mountStudio = (id: string, fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/studio");
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { studioFetchImpl: fetchImpl });
  mounted.push({ container, handle });
};
afterEach(() => {
  for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

/**
 * S46a: the Studio wiring that needs a real client.
 *
 * The tab/form/idle-response rendering that used to live here (and the four tab clicks plus the ArrowRight
 * keydown that drove it) moved to test/s255-studio-rendering-scene.test.ts: it is a rendering assertion over the
 * Studio state, so a scene covers it without a DOM click (S249). What stays here is the part that needs a real
 * fetch: typed field values reach the client, a 404 paints the raw body, and a chat response paints.
 */
describe("S46a Studio", () => {
  it("renders five tabs with per-tab idle raw text and fields", async () => {
    mountStudio("s46a-tabs", async () => new Response("{}", { status: 200 }));
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    expect(document.querySelectorAll("[data-studio-tab]")).toHaveLength(5);
    expect(document.querySelector("[role='tablist']")).not.toBeNull();
    expect(document.querySelector("[role='tab'][aria-selected='true']")?.getAttribute("data-studio-tab")).toBe("chat");
    const selected = document.querySelector("[role='tab'][aria-selected='true']") as HTMLButtonElement;
    selected.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    await waitFor(() => document.querySelector("[role='tab'][aria-selected='true']")?.getAttribute("data-studio-tab") === "images" ? true : undefined, "arrow tab");
    expect(document.body.textContent).toContain("RAW RESPONSE");
    expect(document.body.textContent).toContain("Run a Studio request to see the raw response.");
    for (const tab of ["images", "audio", "rerank", "advanced"]) {
      (document.querySelector("[data-studio-tab='" + tab + "']") as HTMLButtonElement).click();
      await waitFor(() => document.querySelector("[data-studio-form='" + tab + "']") ?? undefined, tab + " form");
    }
  });


  // Keep integration coverage: pure builder/client checks cannot detect a disconnected tab handler.
  it("dispatches each tab with the exact method, path and body", async () => {
    const calls: Array<{ readonly path: string; readonly init: RequestInit | undefined }> = [];
    const expected = [
      { tab: "chat", path: "/v1/chat/completions", body: { messages: [{ content: "A quiet harbour at dawn", role: "user" }], model: "moonshot/kimi-k2.5", stream: false } },
      { tab: "images", path: "/v1/images/generations", body: { mode: "generate", model: "moonshot/kimi-k2.5", prompt: "A quiet harbour at dawn", size: "1024x1024" } },
      { tab: "audio", path: "/v1/audio/speech", body: { input: "A quiet harbour at dawn", model: "moonshot/kimi-k2.5", response_format: "mp3", voice: "alloy" } },
      { tab: "rerank", path: "/v1/rerank", body: { documents: ["first document", "second document"], model: "moonshot/kimi-k2.5", query: "Which document is first?", top_n: 5 } },
      { tab: "advanced", path: "/v1/responses", body: { model: "moonshot/kimi-k2.5", max_tokens: 64, messages: [{ role: "user", content: "Hello" }] } },
    ];
    mountStudio("s258-dispatch", async (input, init) => {
      const pathname = new URL(String(input), "http://localhost").pathname;
      if (pathname.startsWith("/v1/")) calls.push({ path: pathname, init });
      return new Response('{"error":"fixture rejection"}', { status: 404, headers: { "content-type": "application/json" } });
    });
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    for (const [index, entry] of expected.entries()) {
      const tab = document.querySelector('[data-studio-tab="' + entry.tab + '"]');
      assert.ok(tab instanceof HTMLButtonElement);
      tab.click();
      await waitFor(() => document.querySelector('[data-studio-form="' + entry.tab + '"]') ?? undefined, entry.tab + " form");
      const run = document.querySelector("[data-studio-run]");
      assert.ok(run instanceof HTMLButtonElement);
      run.click();
      await waitFor(() => document.querySelector("[role='alert']") ?? undefined, entry.tab + " error");
      expect(calls).toHaveLength(index + 1);
      const call = calls[index];
      assert.ok(call);
      expect(call.path).toBe(entry.path);
      expect(call.init?.method).toBe("POST");
      // JSON formatting/property order is not part of the server contract.
      expect(JSON.parse(String(call.init?.body))).toEqual(entry.body);
    }
  });

  it("dispatches typed values, including a custom model and prompt", async () => {
    let body: Record<string, unknown> | undefined;
    mountStudio("s46a-typed", async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ error: "no_eligible_target", requestedModel: body.model }), { status: 400, headers: { "content-type": "application/json" } });
    });
    await waitFor(() => document.querySelector("[data-studio-field='model']") ?? undefined, "model field");
    const model = document.querySelector("[data-studio-field='model']") as HTMLInputElement;
    model.value = "custom-model-xyz";
    model.dispatchEvent(new Event("input", { bubbles: true }));
    const prompt = document.querySelector("[data-studio-field='prompt']") as HTMLInputElement;
    prompt.value = "typed prompt";
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
    const alert = await waitFor(() => document.querySelector("[role='alert']") ?? undefined, "typed 400");
    expect(body?.model).toBe("custom-model-xyz");
    expect((body?.messages as Array<{ content: string }>)[0]?.content).toBe("typed prompt");
    expect(alert.textContent).toContain("HTTP 400");
    expect(alert.textContent).toContain("custom-model-xyz");
  });

  it("shows 404 raw body with role=alert and no fabricated success", async () => {
    mountStudio("s46a-404", async () => new Response('{"error":"not found"}', { status: 404, headers: { "content-type": "application/json" } }));
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
    const alert = await waitFor(() => document.querySelector("[role='alert']") ?? undefined, "alert");
    expect(alert.textContent).toContain("HTTP 404");
    expect(alert.textContent).toContain('{"error":"not found"}');
    expect(document.querySelector("[data-studio-raw='success']")).toBeNull();
  });

  it("renders a real chat response", async () => {
    mountStudio("s46a-chat", async () => new Response('{"choices":[{"message":{"content":"hello"}}]}', { status: 200, headers: { "content-type": "application/json" } }));
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
    await waitFor(() => document.querySelector("[data-studio-raw='success']") ?? undefined, "chat success");
    expect(document.body.textContent).toContain("hello");
  });

});
