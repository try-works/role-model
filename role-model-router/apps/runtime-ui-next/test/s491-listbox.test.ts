import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> = [];

const waitFor = async <T,>(read: () => T | undefined, label: string): Promise<T> => {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timed out waiting for " + label);
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

describe("S491 Requests ranking metric listbox", () => {
  it("renders the real Foldkit listbox and supports keyboard open/close on the same message flow", async () => {
    window.history.replaceState({}, "", "/requests");
    const container = document.createElement("div");
    container.id = "s491-listbox";
    document.body.append(container);
    const rankingCalls: Array<{ readonly url: string; readonly body: unknown }> = [];
    mounted.push({
      container,
      handle: mountShell(container, {
        requestsRankingFetchImpl: async (input, init) => {
          rankingCalls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
          return new Response(JSON.stringify({ ranking: { rows: [] } }), {
            headers: { "content-type": "application/json" },
            status: 200,
          });
        },
      }),
    });

    const trigger = await waitFor(
      () => document.getElementById("requests-ranking-metric-button") ?? undefined,
      "metric listbox trigger",
    );
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(document.querySelector("select[data-ranking-metric]")).toBeNull();

    trigger.focus();
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    const listbox = await waitFor(
      () => document.querySelector<HTMLElement>("[role='listbox']") ?? undefined,
      "open listbox",
    );
    const options = [...listbox.querySelectorAll("[role='option']")];
    expect(options.length).toBeGreaterThan(1);
    expect(options.filter((option) => option.getAttribute("aria-selected") === "true")).toHaveLength(1);

    listbox.focus();
    listbox.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    const activeAfterArrow = await waitFor(() => {
      const active = listbox.getAttribute("aria-activedescendant");
      return active === null ? undefined : active;
    }, "aria-activedescendant after ArrowDown");
    expect(activeAfterArrow.length).toBeGreaterThan(0);

    listbox.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "t" }));
    const typeaheadOption = await waitFor(() => {
      const active = listbox.getAttribute("aria-activedescendant");
      if (active === null) return undefined;
      const element = document.getElementById(active);
      return element?.textContent?.trim() === "Total tokens" ? element : undefined;
    }, "typeahead active option Total tokens");
    expect(typeaheadOption.textContent?.trim()).toBe("Total tokens");

    listbox.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    await waitFor(() => (document.querySelector<HTMLElement>("[role='listbox']") === null ? true : undefined), "listbox close");
    expect(document.activeElement).toBe(trigger);

    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    const reopened = await waitFor(
      () => document.querySelector<HTMLElement>("[role='listbox']") ?? undefined,
      "reopened listbox for selection",
    );
    const requestsOption = [...reopened.querySelectorAll("[role='option']")].find(
      (option) => option.textContent?.trim() === "Requests",
    );
    expect(requestsOption).toBeDefined();
    requestsOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(
      () => (rankingCalls.length > 0 ? true : undefined),
      "ranking query after option selection",
    );
    expect(rankingCalls[0]?.url).toContain("/api/role-model/telemetry/query");
    expect(rankingCalls[0]?.body).toMatchObject({
      metrics: ["requestCount"],
      ranking: { dimension: "endpointId", metric: "requestCount" },
    });
  });
});