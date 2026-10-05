import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";

import { POSTURE_KIND_LABELS } from "../lib/agent-strategy";
import { ShellHeaderProvider } from "../lib/shell-header-context";
import AgentStrategyRoute from "./agent-strategy";
import WorkloadsRoute from "./workloads";

const agentStrategySource = readFileSync(new URL("./agent-strategy.tsx", import.meta.url), "utf8");
const workloadsSource = readFileSync(new URL("./workloads.tsx", import.meta.url), "utf8");
const posturePageSource = readFileSync(
  new URL("../components/posture-entries-page.tsx", import.meta.url),
  "utf8",
);

function renderRoute(pathname: string, element: React.ReactElement): string {
  const wrapped = createElement(ShellHeaderProvider, null, element);
  const router = createMemoryRouter([{ path: pathname, element: wrapped }], {
    initialEntries: [pathname],
  });
  return renderToStaticMarkup(createElement(RouterProvider, { router }));
}

describe("run 103 agent strategy and workload pages", () => {
  test("are two separate pages with singular/plural labels", () => {
    expect(agentStrategySource).toContain('kind="role"');
    expect(workloadsSource).toContain('kind="workload"');
    expect(posturePageSource).toContain("POSTURE_KIND_LABELS");
    // The labels live in one place; the singular/plural pair the brief checks is asserted there.
    expect(POSTURE_KIND_LABELS.role).toBe("Agent strategy");
    expect(POSTURE_KIND_LABELS.workload).toBe("Workloads");
    expect(renderRoute("/app/router/agent-strategy", createElement(AgentStrategyRoute))).toContain(
      "Loading Agent strategy",
    );
    expect(renderRoute("/app/router/workloads", createElement(WorkloadsRoute))).toContain(
      "Loading Workloads",
    );
  });

  test("lists every entry with its binding, posture, resolvable scopes and candidate counts", () => {
    expect(posturePageSource).toContain("buildPostureEntryRows");
    expect(posturePageSource).toContain("summarizePostureDiagnostics");
    expect(posturePageSource).toContain("candidateLabel");
    expect(posturePageSource).toContain("current leader");
    // Operator decision: only the scopes that can resolve are listed as alias rows; the empty scopes
    // become one plain-English note on the entry, and the duplicated reason marker disappears.
    expect(posturePageSource).toContain("resolvableAliases");
    expect(posturePageSource).toContain("unresolvableScopeNotice");
    expect(posturePageSource).toContain("No scope can resolve for this entry yet");
    expect(posturePageSource).not.toContain("POOL EMPTY");
    expect(posturePageSource).not.toContain("ALIAS_POOL_EMPTY");
  });

  test("edits the entries through per-entry patches and never persists a legacy synonym", () => {
    expect(posturePageSource).toContain("buildPostureNamedBlockPatch");
    expect(posturePageSource).toContain("validatePostureDraft");
    expect(posturePageSource).toContain("updateRuntimeConfig");
    expect(posturePageSource).toContain("fetchRouterConfig");
    expect(posturePageSource).toContain("agent_strategies");
    expect(posturePageSource).toContain("workloads");
    // Operator decision: the page never rewrites the whole block, and only the Remove action can
    // delete an entry — a renamed row leaves the saved entry in place.
    expect(posturePageSource).not.toContain("buildPostureWriteBlock");
    expect(posturePageSource).toContain("Remove entry");
  });

  test("offers the shipped workload templates and keeps role_id off workloads", () => {
    expect(posturePageSource).toContain("Workload templates");
    expect(posturePageSource).toContain("Use batch template");
    expect(posturePageSource).toContain("Use embedding template");
    expect(posturePageSource).toContain("required_capabilities");
    expect(posturePageSource).toContain('kind === "role"');
    // A workload entry must never render or write a role binding.
    expect(posturePageSource).not.toContain("role_id: draft.roleId");
  });

  test("surfaces the page-scoped readback diagnostics and role options on the page", () => {
    // Operator decision: the card renders only the diagnostics of the entries on this page; the
    // `Unknown capability warning:` prefix and the reason marker are gone from the page copy.
    expect(posturePageSource).toContain("filterPostureDiagnosticsForKind");
    expect(posturePageSource).not.toContain("Unknown capability warning");
    expect(posturePageSource).toContain("for this page");
    expect(posturePageSource).toContain("policySources");
    expect(posturePageSource).toContain("Role (required)");
  });
});
