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

describe("S46a Studio", () => {
  it("renders five tabs with per-tab idle raw text and fields", async () => {
    mountStudio("s46a-tabs", async () => new Response("{}", { status: 200 }));
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    expect(document.querySelectorAll("[data-studio-tab]")).toHaveLength(5);
    expect(document.body.textContent).toContain("RAW RESPONSE");
    expect(document.body.textContent).toContain("Run a Studio request to see the raw response.");
    for (const tab of ["images", "audio", "rerank", "advanced"]) {
      (document.querySelector("[data-studio-tab='" + tab + "']") as HTMLButtonElement).click();
      await waitFor(() => document.querySelector("[data-studio-form='" + tab + "']") ?? undefined, tab + " form");
    }
  });

  it("dispatches each tab with the exact method, path and body", async () => {
    const calls: Array<{ path: string; init: RequestInit }> = [];
    mountStudio("s46a-dispatch", async (input, init) => {
      calls.push({ path: new URL(String(input), "http://localhost").pathname, init: init ?? {} });
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "content-type": "application/json" } });
    });
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    for (const tab of ["chat", "images", "audio", "rerank", "advanced"]) {
      (document.querySelector("[data-studio-tab='" + tab + "']") as HTMLButtonElement).click();
      await waitFor(() => document.querySelector("[data-studio-form='" + tab + "']") ?? undefined, tab + " form");
      await waitFor(() => document.querySelector("[data-studio-raw='idle']") ?? undefined, tab + " idle");
      (document.querySelector("[data-studio-run]") as HTMLButtonElement).click();
      await waitFor(() => document.querySelector("[role='alert']") ?? undefined, tab + " error");
      const call = calls.filter((entry) => entry.path.startsWith("/v1/")).at(-1);
      expect(call, tab).toBeDefined();
      expect(call?.init.method).toBe("POST");
      const body = JSON.parse(String(call?.init.body)) as Record<string, unknown>;
      expect(Object.keys(body).length).toBeGreaterThan(0);
    }
    const bodies = calls.filter((entry) => entry.path.startsWith("/v1/")).map((entry) => JSON.parse(String(entry.init.body)) as Record<string, unknown>);
    expect(bodies[0]).toEqual({ messages: [{ content: "A quiet harbour at dawn", role: "user" }], model: "moonshot/kimi-k2.5", stream: false });
    expect(bodies[1]).toEqual({ mode: "generate", model: "moonshot/kimi-k2.5", prompt: "A quiet harbour at dawn", size: "1024x1024" });
    expect(bodies[2]).toEqual({ input: "A quiet harbour at dawn", model: "moonshot/kimi-k2.5", response_format: "mp3", voice: "alloy" });
    expect(bodies[3]).toEqual({ documents: ["first document", "second document"], model: "moonshot/kimi-k2.5", query: "Which document is first?", top_n: 5 });
    expect(bodies[4]).toMatchObject({ max_tokens: 64, model: "moonshot/kimi-k2.5" });
    const paths = calls.filter((entry) => entry.path.startsWith("/v1/")).map((entry) => entry.path);
    expect(paths).toEqual(["/v1/chat/completions", "/v1/images/generations", "/v1/audio/speech", "/v1/rerank", "/v1/responses"]);
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

  it("renders a real chat response and guards double dispatch", async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    mountStudio("s46a-chat", async () => {
      calls += 1;
      await new Promise<void>((resolve) => { release = resolve; });
      return new Response('{"choices":[{"message":{"content":"hello"}}]}', { status: 200, headers: { "content-type": "application/json" } });
    });
    await waitFor(() => document.querySelector("[data-route='studio']") ?? undefined, "studio");
    const run = document.querySelector("[data-studio-run]") as HTMLButtonElement;
    run.click();
    await waitFor(() => (calls === 1 ? true : undefined), "first dispatch");
    run.click();
    expect(calls).toBe(1);
    release?.();
    await waitFor(() => document.querySelector("[data-studio-raw='success']") ?? undefined, "chat success");
    expect(document.body.textContent).toContain("hello");
  });
});
