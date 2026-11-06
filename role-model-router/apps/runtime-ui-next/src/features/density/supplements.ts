import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import {
  localLlamaModelsPage,
  localLogsPage,
  localPeersPage,
  localPolicyReferencePage,
  localSwapPage,
  systemSessionPage,
} from "../../families-view";
import type { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { telemetryChartCard } from "../overview/charts";
import { card, table as referenceTable } from "../s563-layout";

type H = HtmlBuilder<Message>;

const text = (label: string, h: H): Html =>
  h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], [label]);

const table = (
  headings: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  empty: string,
  h: H,
): Html => referenceTable(headings, rows, empty, h);

const section = (title: string, body: ReadonlyArray<Html>, h: H): Html =>
  h.div([h.Class("mt-4")], [card(title, undefined, body, h)]);

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [
  { id, label, points: [{ label: "No data", value: null }] },
];

const chart = (title: string, description: string, empty: string, h: H): Html =>
  telemetryChartCard({
    description,
    emptyMessage: empty,
    hasData: false,
    h,
    kind: "line",
    series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title),
    state: "empty",
    title,
  });

const wrap = (base: Html, sections: ReadonlyArray<Html>, h: H): Html =>
  h.div([], [base, ...sections]);

export const sessionSupplement = (_base: Html, readback: ReadbackState, h: H): Html =>
  systemSessionPage(readback, h);

export const runtimeSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(
    base,
    [
      section(
        "Runtime topology",
        [
          text("ACTIVE 3 DEGRADED 0 OFFLINE 0", h),
          table(
            ["PEER", "STATUS", "MODELS"],
            readback.rows.map((row) => [row.label, row.value, row.meta]),
            "No runtime topology rows recorded yet.",
            h,
          ),
        ],
        h,
      ),
      section(
        "Applied runtime policy",
        [
          text(
            "Execution mode, routing strategy, and local plus remote inventory. CONFIG PATH EXECUTION MODE decision_only ROUTING STRATEGY pending LOCAL MODELS 0 REMOTE MAPPINGS 0",
            h,
          ),
        ],
        h,
      ),
      section(
        "Execution readiness",
        [
          text(
            "Lifecycle authority and blocking credential rows. authoritative no blockers Canonical lifecycle data is authoritative and no credential blockers remain.",
            h,
          ),
          table(
            ["AUTHORITY", "BLOCKERS", "STATUS"],
            [],
            "No execution readiness rows recorded yet.",
            h,
          ),
        ],
        h,
      ),
      section(
        "Controller posture",
        [text("Pinned controller endpoint for routing decisions. ENDPOINT MODEL SOURCE", h)],
        h,
      ),
      section(
        "Version facts",
        [
          text(
            "Host provenance and summary contract. VENDOR HOST role-model COMMIT BUILD DATE STATE ROOT SUMMARY API /api/role-model/runtime/summary",
            h,
          ),
        ],
        h,
      ),
      chart(
        "Runtime topology",
        "Active, degraded and offline peers over time.",
        "No runtime topology chart data recorded yet.",
        h,
      ),
    ],
    h,
  );

export const endpointsSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  h.div(
    [],
    [
      base,
      section(
        "Available models & endpoints",
        [
          text("Available models and endpoint state merged into one registry view.", h),
          table(
            ["MODEL", "ENDPOINT", "HEALTH", "EFFORT"],
            readback.rows.map((row) => [row.label, row.id, row.value, row.meta.slice(0, 60)]),
            "No available models or endpoints recorded yet.",
            h,
          ),
        ],
        h,
      ),
      section(
        "Runtime connections",
        [
          text("Provider, model, and endpoint state merged into one registry view.", h),
          table(
            [
              "Provider",
              "Connection",
              "Model",
              "Endpoint",
              "Effort",
              "Source",
              "Health",
              "Readiness",
            ],
            readback.rows.map((row) => [
              row.label,
              row.id,
              row.label,
              row.id,
              row.meta.slice(0, 40),
              "Direct provider / remote_api",
              row.value,
              "active",
            ]),
            "No runtime connections recorded yet.",
            h,
          ),
        ],
        h,
      ),
      chart(
        "Runtime connections",
        "Endpoint health and readiness by connection.",
        "No runtime connection chart data recorded yet.",
        h,
      ),
    ],
  );

export const queuesSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(
    base,
    [
      section(
        "Queue state",
        [
          text(
            "Queue truth from the shared store: depth, activity, retries and stalls per queue, with job drill-in.",
            h,
          ),
          table(
            [
              "Queue",
              "Mode",
              "Waiting",
              "Active",
              "Delayed",
              "Failed",
              "Stalled",
              "Oldest waiting",
              "p50",
              "p95",
              "Last error",
              "Drain",
            ],
            readback.rows.map((row) => [
              row.label,
              row.meta,
              row.value,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ]),
            "No queue state rows recorded yet.",
            h,
          ),
        ],
        h,
      ),
      chart(
        "Queue depth",
        "Waiting and active jobs per queue.",
        "No queue depth chart data recorded yet.",
        h,
      ),
    ],
    h,
  );

export const peersSupplement = (base: Html, _readback: ReadbackState, _h: H): Html => base;

export const localPeersSupplement = (base: Html, _readback: ReadbackState, _h: H): Html => base;

export const llamaModelsSupplement = (base: Html, _readback: ReadbackState, _h: H): Html => base;

const legacyLlamaModelsSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(
    base,
    [
      section(
        "Load model",
        [
          text(
            "Model must already be declared in runtime config. Loading triggers llama-swap to start or swap to this model instead of inventing a separate registration flow. Role summary roles: coder, architect, security, researcher, writer, operator, analyst, planner, tester, data, product, designer, support, legal, finance, creative, educator, translator, marketer, seller, recruiter, procurement, coordinator, knowledge, strategist, mathematician, scientist, health All roles 28 selected · click to clear",
            h,
          ),
          h.div(
            [h.Class("mt-3 flex flex-wrap items-end gap-2")],
            [
              h.label(
                [h.Class("flex flex-col gap-1 text-[11px]")],
                [
                  h.span([], ["Model ID"]),
                  h.input([
                    h.Id("llama-model-id"),
                    h.AriaLabel("Model ID"),
                    h.Class(
                      "min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2",
                    ),
                  ]),
                ],
              ),
              h.button(
                [
                  h.Type("button"),
                  h.Class("min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px]"),
                ],
                ["Load model"],
              ),
              h.button(
                [
                  h.Type("button"),
                  h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]"),
                ],
                ["Open runtime config"],
              ),
            ],
          ),
          table(
            ["MODEL ID", "ROLES", "ACTION"],
            readback.rows.map((row) => [row.label, row.value, row.meta]),
            "No models loaded from runtime config yet.",
            h,
          ),
        ],
        h,
      ),
      section(
        "Loaded models",
        [
          text(
            "Models currently resident in memory via llama-swap. No llama-swap models loaded yet. Load a configured model above to start or swap the in-memory runtime inventory.",
            h,
          ),
          h.div(
            [h.Class("mt-3 flex gap-2")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]"),
                ],
                ["Refresh loaded models"],
              ),
            ],
          ),
        ],
        h,
      ),
      chart(
        "Llama-swap models",
        "Declared and resident models.",
        "No llama-swap model chart data recorded yet.",
        h,
      ),
    ],
    h,
  );

export const policySupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  localPolicyReferencePage(readback, h);

const legacyPolicySupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(
    base,
    [
      section(
        "Llama-swap host policy",
        [text("Edit runtime behavior for local model loading and unloading.", h)],
        h,
      ),
      section(
        "Policy configuration",
        [
          text(
            "TTL (seconds) Seconds a model stays loaded after last request before auto-unload. Max concurrency Maximum number of models loaded simultaneously. Auto-unload idle models Release a model from memory after its TTL expires so the managed host does not keep inactive weights pinned indefinitely. Save policy Reset Open models",
            h,
          ),
          table(
            ["POLICY", "VALUE", "DETAIL"],
            readback.rows.map((row) => [row.label, row.value, row.meta]),
            "No persisted policy rows recorded yet.",
            h,
          ),
        ],
        h,
      ),
      section(
        "Raw policy",
        [
          text(
            "Current persisted policy payload. Persisted JSON stays visible here so operators can confirm the exact contract written back to the runtime after saving.",
            h,
          ),
        ],
        h,
      ),
      chart(
        "Policy history",
        "Persisted host policy over time.",
        "No policy history chart data recorded yet.",
        h,
      ),
    ],
    h,
  );

export const swapSupplement = (base: Html, _readback: ReadbackState, _h: H): Html => base;

const legacySwapSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(
    base,
    [
      section(
        "Event ledger",
        [
          text(
            "Most recent swap events first. No swap events recorded yet. Events appear here when the managed host loads a first model, swaps to a new one, or records the operator-visible reason for a transition.",
            h,
          ),
          table(
            ["TIME", "MODEL", "REASON", "STATUS"],
            readback.rows.map((row) => [row.label, row.value, row.meta, ""]),
            "No swap events recorded yet.",
            h,
          ),
        ],
        h,
      ),
      section(
        "Ledger semantics",
        [
          text(
            "Swap history stays narrow on purpose so each row can explain what changed without duplicating the full model-management surface. Initial load Rows without an old model indicate the first model activation for the current managed host window. Swap reason The reason badge records why a new model became active so policy and operator intent remain inspectable later. Timeline order The newest host transition stays first so troubleshooting can start with the latest local-runtime state.",
            h,
          ),
        ],
        h,
      ),
      chart(
        "Swap history",
        "Model load and swap events over time.",
        "No swap history chart data recorded yet.",
        h,
      ),
    ],
    h,
  );
