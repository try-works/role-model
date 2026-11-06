import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";
import type { Model } from "../../model";
import { READBACK_SPECS, type ReadbacksState, renderReadbackPage } from "../../readback";
import { referenceCard, referenceDescription, referenceSection } from "../layout/reference";

export interface RuntimeRouteContext {
  readonly h: HtmlBuilder<Message>;
  readonly readbacks: ReadbacksState;
  readonly runtimeConfigEditor: Model["runtimeConfigEditor"];
  readonly runtimeConfigPage: (
    state: Model["runtimeConfigEditor"],
    configReadback: ReadbacksState["runtimeConfig"],
    runtimeReadback: ReadbacksState["runtime"],
    h: HtmlBuilder<Message>,
  ) => Html;
}

export const runtimeConfigRoute = (ctx: RuntimeRouteContext): Html => {
  const { h, readbacks } = ctx;
  return h.section(
    [
      h.Class("rm3-next-route space-y-6"),
      h.DataAttribute("route", "runtime-config"),
      h.DataAttribute("page-layout", "reference"),
    ],
    [
      referenceDescription(
        "Load, edit, review and confirm the runtime configuration against the applied snapshot.",
        h,
      ),
      ctx.runtimeConfigPage(ctx.runtimeConfigEditor, readbacks.runtimeConfig, readbacks.runtime, h),
    ],
  );
};

export const runtimeRoute = (ctx: RuntimeRouteContext): Html => {
  const { h, readbacks } = ctx;
  const summaryValue = (label: string): string | undefined =>
    readbacks.runtimeSummary.rows.find((row) => row.label.toLowerCase() === label)?.value;
  const runtimeFacts = readbacks.runtime.rows.map((row) => [row.label, row.value] as const);
  const healthFacts = readbacks.health.rows.map((row) => [row.label, row.value] as const);
  const routerFacts = readbacks.router.rows.map((row) => [row.label, row.value] as const);
  const factFromHealth = (labels: ReadonlyArray<string>): string | undefined => {
    for (const label of labels) {
      const row = readbacks.health.rows.find((entry) => entry.label.toLowerCase() === label);
      if (row !== undefined && row.value.length > 0 && row.value !== "—") return row.value;
    }
    return undefined;
  };
  const runtimeFact = (labels: ReadonlyArray<string>): string | undefined => {
    for (const label of labels) {
      const row = readbacks.runtime.rows.find((entry) => entry.label.toLowerCase() === label);
      if (row !== undefined && row.value.length > 0 && row.value !== "—") return row.value;
    }
    return undefined;
  };
  const versionFacts: ReadonlyArray<readonly [string, string]> = [
    [
      "Version",
      factFromHealth(["version"]) ?? runtimeFact(["version"]) ?? summaryValue("version") ?? "—",
    ],
    [
      "Release",
      factFromHealth(["release", "release_version"]) ??
        summaryValue("release_version") ??
        summaryValue("releaseVersion") ??
        "—",
    ],
    ["Commit", factFromHealth(["commit"]) ?? summaryValue("commit") ?? "—"],
    [
      "Build date",
      factFromHealth(["build date", "build_date"]) ?? summaryValue("build_date") ?? "—",
    ],
    [
      "State root",
      summaryValue("runtime_state_root") ??
        summaryValue("runtimeStateRoot") ??
        runtimeFact(["state root"]) ??
        "—",
    ],
    ["Summary API", "/api/role-model/runtime/summary"],
  ];
  const summaryLabel = (candidates: ReadonlyArray<string>): string | undefined => {
    for (const candidate of candidates) {
      const value = summaryValue(candidate);
      if (value !== undefined && value.length > 0) return value;
    }
    return undefined;
  };
  const lifecycle = {
    active: summaryLabel(["active", "active_count", "activecount"]) ?? "0",
    degraded: summaryLabel(["degraded", "degraded_count"]) ?? "0",
    offline: summaryLabel(["offline", "offline_count"]) ?? "0",
  };
  const eyebrow =
    "font-sans text-[11px] font-semibold uppercase leading-[14px] tracking-[0.04em] text-[var(--rm-muted)]";
  const factLabel = "font-sans text-[13px] leading-[18px] text-[var(--rm-muted)]";
  const factValue =
    "text-right font-sans text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";
  const factRows = (facts: ReadonlyArray<readonly [string, string]>, emptyLabel: string) =>
    facts.length === 0
      ? h.p([h.Class("text-sm leading-5 text-muted-foreground")], [emptyLabel])
      : h.dl(
          [h.Class("space-y-2")],
          facts.map(([label, value]) =>
            h.div(
              [h.Class("flex items-baseline justify-between gap-3")],
              [h.dt([h.Class(factLabel)], [label]), h.dd([h.Class(factValue)], [value])],
            ),
          ),
        );
  const statTile = (label: string, value: string) =>
    h.div(
      [h.Class("flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3")],
      [
        h.span(
          [
            h.Class(
              "font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
            ),
          ],
          [label],
        ),
        h.span([h.Class("font-mono text-[20px] font-semibold leading-7 text-foreground")], [value]),
      ],
    );
  const linkButton = (href: string, label: string) =>
    h.a(
      [
        h.Href(href),
        h.Class(
          "inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground",
        ),
      ],
      [label],
    );
  return referenceSection(
    "runtime",
    "ok",
    [
      h.div(
        [h.Class("flex flex-wrap gap-4")],
        [
          statTile("Active", lifecycle.active),
          statTile("Degraded", lifecycle.degraded),
          statTile("Offline", lifecycle.offline),
        ],
      ),
      h.div(
        [h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]")],
        [
          h.div(
            [h.Class("space-y-4")],
            [
              referenceCard(
                "Applied runtime policy",
                "Execution mode, routing strategy, and local plus remote inventory.",
                [
                  factRows(runtimeFacts, "No applied runtime policy rows recorded yet."),
                  h.div(
                    [h.Class("mt-4 flex flex-wrap gap-3")],
                    [
                      linkButton("/runtime/config", "Runtime config"),
                      linkButton("/session-readiness", "Session readiness"),
                    ],
                  ),
                ],
                h,
              ),
              referenceCard(
                "Execution readiness",
                "Lifecycle authority and blocking credential rows.",
                [factRows(healthFacts, "No health rows recorded yet.")],
                h,
              ),
              referenceCard(
                "Controller posture",
                "Pinned controller endpoint for routing decisions.",
                [factRows(routerFacts, "No controller assignment recorded yet.")],
                h,
              ),
            ],
          ),
          referenceCard(
            "Version facts",
            "Host provenance and summary contract.",
            [factRows(versionFacts, "No version facts recorded yet.")],
            h,
          ),
        ],
      ),
    ],
    h,
  );
};
