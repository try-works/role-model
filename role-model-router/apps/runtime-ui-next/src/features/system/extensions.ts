import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../../message";
import type { ReadbackRow, ReadbackState, ReadbacksState } from "../../readback";
import { card } from "../s563-layout";

const primaryButton =
  "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-primary px-3 font-sans text-sm font-medium text-primary-foreground";
const secondaryButton =
  "inline-flex h-[34px] items-center justify-center rounded-md border border-border bg-background px-3 font-sans text-sm font-medium text-foreground";
const supporting = "text-sm leading-5 text-muted-foreground";
const tableHead =
  "pb-2 pr-3 font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-muted-foreground";
const tableCell =
  "border-t border-[var(--rm-border)] py-2 pr-3 align-top text-xs text-[var(--rm-fg)]";

export interface SystemExtensionsState {
  readonly systemExtensionsMessage?: string;
}

type ExtensionReadbacks = {
  readonly extensions?: ReadbackState;
  readonly contribution?: ReadbackState;
  readonly recommendations?: ReadbackState;
  readonly replayAutomation?: ReadbackState;
};

const readbacksOf = (input: ReadbacksState | ReadbackState | undefined): ExtensionReadbacks => {
  if (input === undefined) return {};
  if ("extensions" in input) return input;
  return { extensions: input };
};

const statusText = (
  readback: ReadbackState | undefined,
  empty: string,
  h: HtmlBuilder<Message>,
): Html => {
  if (readback === undefined || readback.status === "idle" || readback.status === "loading")
    return h.p([h.Class(supporting)], [`Loading ${empty.toLowerCase()}…`]);
  if (readback.status === "error")
    return h.p([h.Role("alert"), h.Class(supporting)], [readback.message ?? "Readback failed."]);
  if (readback.rows.length === 0) return h.p([h.Class(supporting)], [empty]);
  return h.p([h.Class(supporting)], [`${String(readback.rows.length)} recorded.`]);
};

const rowTable = (
  rows: ReadbackState | undefined,
  headings: ReadonlyArray<string>,
  actions: (row: ReadbackRow) => ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html => {
  if (rows === undefined || rows.status === "idle" || rows.status === "loading")
    return h.p([h.Class(supporting)], ["Loading…"]);
  if (rows.status === "error")
    return h.p([h.Role("alert"), h.Class(supporting)], [rows.message ?? "Readback failed."]);
  if (rows.rows.length === 0) return h.p([h.Class(supporting)], ["No rows recorded."]);
  return h.div(
    [h.Class("overflow-x-auto")],
    [
      h.table(
        [h.Class("min-w-full text-left")],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                headings.map((head) => h.th([h.Class(tableHead)], [head])),
              ),
            ],
          ),
          h.tbody(
            [],
            rows.rows.map((row) =>
              h.tr(
                [],
                [
                  h.td([h.Class(`${tableCell} font-mono`)], [row.label]),
                  h.td([h.Class(tableCell)], [row.value.length === 0 ? "—" : row.value]),
                  h.td(
                    [h.Class(`${tableCell} text-muted-foreground`)],
                    [row.meta.length === 0 ? "—" : row.meta],
                  ),
                  h.td([h.Class(tableCell)], actions(row)),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  );
};

const record = (meta: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(meta);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};
const textOf = (value: unknown): string =>
  typeof value === "string" && value.length > 0 ? value : "—";
const scalarText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const nested = value as Record<string, unknown>;
    return scalarText(nested.state ?? nested.status ?? nested.available ?? "—");
  }
  return "—";
};
const expandedRows = (rows: ReadonlyArray<ReadbackRow>): ReadonlyArray<ReadbackRow> =>
  rows.flatMap((row) => {
    const parsed = record(row.meta);
    const entries = Object.entries(parsed);
    if (entries.length === 0) return [row];
    return entries.map(([key, value]) => ({
      id: `${row.id}.${key}`,
      label: key,
      meta: row.label,
      value: scalarText(value),
    }));
  });

export const systemExtensionsPage = (
  input: ReadbacksState | ReadbackState | undefined,
  h: HtmlBuilder<Message>,
  state?: SystemExtensionsState,
): Html => {
  const readbacks = readbacksOf(input);
  const extensions = readbacks.extensions;
  const recommendations = readbacks.recommendations;
  const rows = extensions?.status === "ok" ? extensions.rows : [];
  return h.div(
    [
      h.Class("space-y-6"),
      h.DataAttribute("route", "system-extensions"),
      h.DataAttribute("page-layout", "reference"),
      h.DataAttribute("final-family-state", extensions?.status ?? "empty"),
      h.DataAttribute("readback-state", extensions?.status ?? "empty"),
    ],
    [
      state?.systemExtensionsMessage === undefined
        ? null
        : h.p(
            [h.Role("status"), h.Class("text-sm text-[var(--rm-success)]")],
            [state.systemExtensionsMessage],
          ),
      card(
        "Readiness",
        "Readiness and inventory counts derived from the extension inventory readback.",
        [
          extensions === undefined || extensions.status !== "ok"
            ? h.p([h.Class(supporting)], ["Extension inventory is not available yet."])
            : h.div(
                [
                  h.Class("grid gap-3 sm:grid-cols-4"),
                  h.DataAttribute("extension-boundary-stats", ""),
                ],
                [
                  { label: "Installed", value: String(rows.length) },
                  {
                    label: "Ready",
                    value: String(
                      rows.filter(
                        (row) =>
                          record(row.meta).lifecycle === "ready" ||
                          (record(row.meta).health as Record<string, unknown> | undefined)
                            ?.available === true,
                      ).length,
                    ),
                  },
                  {
                    label: "Degraded",
                    value: String(
                      rows.filter((row) =>
                        ["degraded", "error", "unavailable"].includes(
                          textOf(record(row.meta).lifecycle),
                        ),
                      ).length,
                    ),
                  },
                  {
                    label: "Open recs",
                    value: String(
                      recommendations?.status === "ok" ? recommendations.rows.length : 0,
                    ),
                  },
                ].map((stat) =>
                  h.div(
                    [h.Class("rounded-md border border-[var(--rm-border)] px-3 py-2")],
                    [
                      h.p(
                        [
                          h.Class(
                            "font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground",
                          ),
                        ],
                        [stat.label],
                      ),
                      h.p([h.Class("mt-1 text-lg font-semibold text-foreground")], [stat.value]),
                    ],
                  ),
                ),
              ),
        ],
        h,
      ),
      card(
        "Contribution posture",
        "Contribution policy records whether the runtime may contribute aggregate observations. It is independent from extension enablement.",
        [
          statusText(readbacks.contribution, "No contribution policy rows recorded.", h),
          rowTable(
            readbacks.contribution === undefined
              ? undefined
              : { ...readbacks.contribution, rows: expandedRows(readbacks.contribution.rows) },
            ["Field", "Value", "Detail", "Action"],
            () => [],
            h,
          ),
        ],
        h,
      ),
      card(
        "Recommendation ledger",
        "Signed bundles validated locally before apply or dismiss. Actions are only offered when the host returned a recommendation id.",
        [
          h.div(
            [h.Class("mb-4")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("system-extensions-download", ""),
                  h.OnClick(Message.SystemExtensionsDownloadRequested({})),
                  h.Class(primaryButton),
                ],
                ["Download & validate latest"],
              ),
            ],
          ),
          rowTable(
            recommendations,
            ["Recommendation", "Value", "Detail", "Action"],
            (row) =>
              row.id.length === 0
                ? []
                : [
                    h.div(
                      [h.Class("flex gap-2")],
                      [
                        h.button(
                          [
                            h.Type("button"),
                            h.DataAttribute("system-recommendation-apply", row.id),
                            h.OnClick(
                              Message.SystemExtensionsRecommendationApplyRequested({
                                recommendationId: row.id,
                              }),
                            ),
                            h.Class(secondaryButton),
                          ],
                          ["Apply"],
                        ),
                        h.button(
                          [
                            h.Type("button"),
                            h.DataAttribute("system-recommendation-dismiss", row.id),
                            h.OnClick(
                              Message.SystemExtensionsRecommendationDismissRequested({
                                recommendationId: row.id,
                              }),
                            ),
                            h.Class(secondaryButton),
                          ],
                          ["Dismiss"],
                        ),
                      ],
                    ),
                  ],
            h,
          ),
        ],
        h,
      ),
      card(
        "Replay automation",
        "Replay automation status is reported by the host. Pause or resume the bounded scheduler without changing extension mode.",
        [
          statusText(readbacks.replayAutomation, "No replay automation rows recorded.", h),
          h.div(
            [h.Class("mb-4 flex flex-wrap gap-2")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("system-replay-automation-pause", ""),
                  h.OnClick(Message.SystemReplayAutomationControlRequested({ action: "pause" })),
                  h.Class(secondaryButton),
                ],
                ["Pause automation"],
              ),
              h.button(
                [
                  h.Type("button"),
                  h.DataAttribute("system-replay-automation-resume", ""),
                  h.OnClick(Message.SystemReplayAutomationControlRequested({ action: "resume" })),
                  h.Class(secondaryButton),
                ],
                ["Resume automation"],
              ),
            ],
          ),
          rowTable(
            readbacks.replayAutomation === undefined
              ? undefined
              : {
                  ...readbacks.replayAutomation,
                  rows: expandedRows(readbacks.replayAutomation.rows),
                },
            ["Field", "Value", "Detail", "Action"],
            () => [],
            h,
          ),
        ],
        h,
      ),
      card(
        "Extension inventory",
        "Canonical packages on this host. Modes change the extension boundary without becoming contribution policy.",
        [
          extensions === undefined || extensions.status !== "ok" || extensions.rows.length === 0
            ? statusText(extensions, "No extension packages are installed.", h)
            : h.div(
                [h.Class("overflow-x-auto"), h.DataAttribute("extension-inventory-table", "")],
                [
                  h.table(
                    [h.Class("min-w-full text-left text-sm")],
                    [
                      h.thead(
                        [],
                        [
                          h.tr(
                            [],
                            ["Extension", "Lifecycle", "Mode", "Health", "Actions"].map((title) =>
                              h.th([h.Class(tableHead)], [title]),
                            ),
                          ),
                        ],
                      ),
                      h.tbody(
                        [],
                        rows.map((row) => {
                          const meta = record(row.meta);
                          return h.tr(
                            [],
                            [
                              h.td([h.Class(`${tableCell} font-mono`)], [row.label]),
                              h.td(
                                [h.Class(tableCell)],
                                [textOf(meta.lifecycle ?? meta.status ?? row.value)],
                              ),
                              h.td([h.Class(tableCell)], [textOf(meta.enabledMode ?? meta.mode)]),
                              h.td(
                                [h.Class(tableCell)],
                                [scalarText(meta.health ?? meta.readiness)],
                              ),
                              h.td(
                                [h.Class(tableCell)],
                                [
                                  h.button(
                                    [
                                      h.Type("button"),
                                      h.DataAttribute("system-extensions-pause", row.id),
                                      h.OnClick(
                                        Message.SystemExtensionsPauseRequested({
                                          extensionId: row.id,
                                        }),
                                      ),
                                      h.Class(secondaryButton),
                                    ],
                                    ["Pause"],
                                  ),
                                ],
                              ),
                            ],
                          );
                        }),
                      ),
                    ],
                  ),
                ],
              ),
        ],
        h,
      ),
    ],
  );
};
