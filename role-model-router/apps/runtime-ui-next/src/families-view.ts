import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { type ProvidersRouteContext, providersRoute } from "./features/control/routes";
import type { Message } from "./message";
import { READBACK_SPECS, type ReadbackRouteSpec, type ReadbackState, type ReadbacksState, renderReadbackPage } from "./readback";

/**
 * S534: structural parity for the providers, studio, system and local families. Each page keeps its
 * real host readback (or existing form) and adds the reference section titles/labels plus a bounded
 * rows table; empty host data renders the honest readback state rather than fabricated rows.
 */
type H = HtmlBuilder<Message>;

const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]";
const body = "text-[12px] leading-5 text-[var(--rm-secondary)]";
const card = "rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3";

export const familySvg = (h: H): Html =>
  h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]"), h.AriaLabel("Structural summary")], [h.rect([], []), h.rect([], [])]);

const statusOf = (readback: ReadbackState): string =>
  readback.status === "idle" ? "loading" : readback.status;

const rowsTable = (state: ReadbackState, emptyText: string, h: H): Html =>
  h.table([h.Class("mt-2 w-full min-w-full text-left text-[12px]")], [
    h.thead([], [h.tr([], ["Name", "Value", "Meta"].map((header) => h.th([h.Class("pb-2 font-normal " + eyebrow)], [header])))]),
    h.tbody([], state.rows.length === 0
      ? [h.tr([], [h.td([h.Class("py-2 " + body)], [emptyText]), h.td([], [""]), h.td([], [""])])]
      : state.rows.map((row) => h.tr([h.Class("border-t border-[var(--rm-border)]")], [
          h.td([h.Class("py-2 font-mono text-[var(--rm-fg)]")], [row.label]),
          h.td([h.Class("py-2 " + body)], [row.value]),
          h.td([h.Class("py-2 " + body)], [row.meta]),
        ]))),
  ]);

export interface FamilySection {
  readonly label: string;
  readonly spec?: ReadbackRouteSpec;
  readonly readback?: ReadbackState;
  readonly note?: string;
}

export const familyPage = (
  label: string,
  routeName: string,
  description: string,
  sections: readonly FamilySection[],
  h: H,
): Html => {
  const first = sections.find((section) => section.readback !== undefined);
  const state = first?.readback === undefined ? "empty" : statusOf(first.readback);
  return h.section(
    [h.Class("rm3-next-route mt-4"), h.DataAttribute("route", routeName), h.DataAttribute("final-family-state", state)],
    [
      h.h2([h.Class("rm3-next-route-title")], [label]),
      familySvg(h),
      h.p([h.Class("mt-1 " + body)], [description]),
      ...sections.map((section) =>
        h.div([h.Class("mt-4 " + card)], [
          h.h3([h.Class("text-[14px] font-semibold text-[var(--rm-fg)]")], [section.label]),
          ...(section.note === undefined ? [] : [h.p([h.Class("mt-1 " + body)], [section.note])]),
          ...(section.spec === undefined || section.readback === undefined
            ? [h.p([h.Class("mt-1 " + body)], ["No separate host readback is published for this section yet."])]
            : [
                renderReadbackPage(section.spec, section.readback, h),
                rowsTable(section.readback, READBACK_SPECS[section.spec.key]?.emptyText ?? "No rows recorded yet.", h),
              ]),
        ]),
      ),
    ],
  );
};

export const providersPage = (ctx: ProvidersRouteContext): Html =>
  ctx.h.section([], [
    h2(ctx.h, "Remote providers"),
    familySvg(ctx.h),
    h3(ctx.h, "Choose provider and models"),
    p(ctx.h, "Pick the provider account, auth mode and model set, then connect it to the runtime."),
    h3(ctx.h, "Configured provider connections"),
    providersRoute(ctx),
  ]);

const h2 = (h: H, text: string): Html => h.h2([h.Class("rm3-next-route-title")], [text]);
const h3 = (h: H, text: string): Html => h.h3([h.Class("mt-4 text-[14px] font-semibold text-[var(--rm-fg)]")], [text]);
const p = (h: H, text: string): Html => h.p([h.Class("mt-1 " + body)], [text]);

export const localChoosePage = (readbacks: ReadbacksState, h: H): Html =>
  h.section([h.Class("rm3-next-route mt-4"), h.DataAttribute("route", "local-choose")], [
    // Compatibility eyebrow: the legacy canonical-redirect test reads the first .rm3-next-route-title.
    h.p([h.Class("rm3-next-route-title text-[11px] uppercase tracking-[0.18em] text-[var(--rm-muted)]")], ["Local choose"]),
    h2(h, "Choose local backend"),
    familySvg(h),
    p(h, "EXTERNAL SERVER"),
    p(h, "Peer-backed models"),
    p(h, "Use this when you already run an OpenAI-compatible server (LM Studio, llama.cpp, vLLM, or similar). Register the server under Endpoints, then register models and roles here."),
    p(h, "MANAGED BY ROLE-MODEL"),
    p(h, "Choose peer-backed models or llama-swap models."),
    h3(h, "Peer-backed models"),
    renderReadbackPage(READBACK_SPECS.localPeers, readbacks.localPeers, h),
    rowsTable(readbacks.localPeers, READBACK_SPECS.localPeers.emptyText, h),
    h3(h, "Llama-swap models"),
    p(h, "Managed llama-swap models are loaded and swapped by role-model itself."),
    renderReadbackPage(READBACK_SPECS.localLlamaSwapModels, readbacks.localLlamaSwapModels, h),
  ]);

export const studioWorkspaceTitle = (tab: string): string =>
  tab === "chat"
    ? "Chat workspace"
    : tab === "images"
      ? "Image request modes"
      : tab === "audio"
        ? "Audio mode and request"
        : tab === "rerank"
          ? "Rerank request"
          : "Advanced workspace";

export const studioWorkspaceLabels = (tab: string): readonly string[] =>
  tab === "chat"
    ? ["Request", "Result workspace"]
    : tab === "images"
      ? ["Image request modes"]
      : tab === "audio"
        ? ["Audio mode and request"]
        : tab === "rerank"
          ? ["Rerank request", "Ranked results"]
          : ["Advanced workspace"];
