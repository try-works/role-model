import { Effect } from "effect";

import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { describe, expect, it } from "vitest";

import type { Model } from "../src/model";
import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

const render = async (route: Model["route"]) => {
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ model: shellModel({ route }), commands: [] }),
        view,
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S560 reference shell layout", () => {
  it("renders the reference sidebar: wordmark, ten flat section links, footer stack", async () => {
    const container = await render({ _tag: "Index" });
    const aside = container.querySelector("aside[data-shell-sidebar]");
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain("w-56");
    expect(aside?.textContent).toContain("role-model");
    const links = [...container.querySelectorAll("aside nav[data-shell-nav] a[data-nav]")];
    expect(links.map((a) => a.textContent)).toEqual([
      "Overview",
      "Studio",
      "Local",
      "Remote",
      "Models",
      "Router",
      "Observe",
      "Connect",
      "System",
      "Learning",
    ]);
    expect(container.querySelector("[data-shell-rail]")).toBeNull();
    expect((container.textContent ?? "").includes("Runtime UI")).toBe(false);
    const footer = container.querySelector('[data-slot="role-model-sidebar-footer"]');
    expect(footer).not.toBeNull();
    const slots = [...(footer?.children ?? [])].map((child) => child.getAttribute("data-slot"));
    expect(slots).toEqual([
      "role-model-model-inventory",
      "role-model-cache",
      "role-model-router-endpoint",
    ]);
  });

  it("renders the reference page header: 48px title bar with theme toggle", async () => {
    const container = await render({ _tag: "Index" });
    const header = container.querySelector('header[data-slot="role-model-sub-page-header"]');
    expect(header).not.toBeNull();
    expect(header?.className).toContain("h-12");
    expect(header?.querySelector("h1")?.textContent).toBe("Runtime overview");
    const toggle = header?.querySelector('button[data-slot="role-model-theme-toggle"]');
    expect(toggle?.getAttribute("aria-label")).toBe("Switch to light mode");
    expect(container.querySelector('main[data-slot="role-model-page-content"]')).not.toBeNull();
  });

  it("marks the section containing the current route active", async () => {
    const container = await render({ _tag: "LearningConfiguration" });
    const active = [...container.querySelectorAll("aside nav[data-shell-nav] a[data-active]")].map(
      (a) => a.textContent,
    );
    expect(active).toEqual(["Learning"]);
    const header = container.querySelector('header[data-slot="role-model-sub-page-header"]');
    expect(header?.querySelector("h1")?.textContent).toBe("Learning configuration");
  });
});
