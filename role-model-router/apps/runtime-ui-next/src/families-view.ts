import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { type ProvidersRouteContext, providersRoute } from "./features/control/routes";
import { card, filterBar, table } from "./features/s563-layout";
import type { Message } from "./message";
import { READBACK_SPECS, type ReadbackRouteSpec, type ReadbackState, type ReadbacksState, renderReadbackPage } from "./readback";

/**
 * S534: structural parity for the providers, studio, system and local families. Each page keeps its
 * real host readback (or existing form) and adds the reference section titles/labels plus a bounded
 * rows table; empty host data renders the honest readback state rather than fabricated rows.
 */
type H = HtmlBuilder<Message>;

const eyebrow = "font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-muted-foreground";
const body = "text-sm leading-5 text-muted-foreground";

export const familySvg = (h: H): Html =>
  h.svg([h.Class("mt-3 h-10 w-full text-[var(--rm-accent)]"), h.AriaLabel("Structural summary")], [h.rect([], []), h.rect([], [])]);

const statusOf = (readback: ReadbackState): string =>
  readback.status === "idle" ? "loading" : readback.status;

const rowsTable = (state: ReadbackState, emptyText: string, h: H, columns: readonly string[] = ["Name", "Value", "Meta"], cells?: (row: ReadbackState["rows"][number]) => readonly string[]): Html =>
  table(columns, state.rows.map(cells ?? ((row) => [row.label, row.value, row.meta])), emptyText, h);

export interface FamilySection {
  readonly label: string;
  readonly spec?: ReadbackRouteSpec;
  readonly readback?: ReadbackState;
  readonly note?: string;
  readonly columns?: readonly string[];
  readonly rows?: (row: ReadbackState["rows"][number]) => readonly string[];
  readonly children?: readonly Html[];
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
    [h.Class("rm3-next-route mt-4 space-y-6"), h.DataAttribute("route", routeName), h.DataAttribute("final-family-state", state), h.DataAttribute("page-layout", "reference"), h.DataAttribute("page-state", state)],
    [h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], [label]), ...sections.map((section, index) =>
      card(section.label, section.note, [
        ...(index === 0 && description.length > 0 ? [h.p([h.Class("text-sm leading-5 text-muted-foreground")], [description])] : []),
        ...(section.children ?? []),
        ...(section.spec === undefined || section.readback === undefined
          ? []
          : [
              renderReadbackPage(section.spec, section.readback, h),
              rowsTable(section.readback, READBACK_SPECS[section.spec.key]?.emptyText ?? "No rows recorded yet.", h, section.columns, section.rows),
            ]),
      ], h),
    )],
  );
};

export const providersPage = (ctx: ProvidersRouteContext): Html =>
  ctx.h.section([ctx.h.Class("flex flex-col gap-4")], [
    h2(ctx.h, "Remote providers"),
    familySvg(ctx.h),
    card("Choose provider and models", "Pick the provider account, auth mode and model set, then connect it to the runtime.", [
      filterBar([
        { label: "Provider", value: "302.AI", options: ["302.AI"] },
        { label: "Connection method", value: "302.AI API Key", options: ["302.AI API Key"] },
        { label: "Model", value: "Select a model…", options: ["Select a model…"] },
      ], ctx.h),
      p(ctx.h, "The provider account form below creates the selected connection; the controls stay preview-only until a provider is chosen."),
    ], ctx.h),
    card("Configured provider connections", "Remote provider accounts and their endpoint connections reported by the host.", [providersRoute(ctx)], ctx.h),
  ]);

const h2 = (h: H, text: string): Html => h.h2([h.Class("rm3-next-route-title")], [text]);
const h3 = (h: H, text: string): Html => h.h3([h.Class("mt-4 text-[14px] font-semibold text-[var(--rm-fg)]")], [text]);
const p = (h: H, text: string): Html => h.p([h.Class("mt-1 " + body)], [text]);

export const localChoosePage = (readbacks: ReadbacksState, h: H): Html =>
  h.section([h.Class("rm3-next-route mt-4 space-y-6"), h.DataAttribute("route", "local-choose"), h.DataAttribute("page-layout", "reference")], [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Choose local backend"]),
    card("Peer-backed models", "Use this when you already run an OpenAI-compatible server (LM Studio, llama.cpp, vLLM, or similar). Register the server under Endpoints, then register models and roles here.", [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["External server: peer-backed models."]),
      h.a([h.Href("/local/peers"), h.Role("button"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Open endpoints"]),
      renderReadbackPage(READBACK_SPECS.localPeers, readbacks.localPeers, h),
      rowsTable(readbacks.localPeers, READBACK_SPECS.localPeers.emptyText, h, ["Endpoint", "Status", "Type", "Actions"], (row) => [row.label, row.value, "OpenAI-compatible peer", "—"]),
    ], h),
    card("Llama-swap models", "Managed llama-swap models are loaded and swapped by role-model itself.", [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Managed by role-model: load and swap local models."]),
      h.a([h.Href("/local/llama-swap/models"), h.Role("button"), h.Class("inline-flex h-[34px] items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground")], ["Open models"]),
      renderReadbackPage(READBACK_SPECS.localLlamaSwapModels, readbacks.localLlamaSwapModels, h),
    ], h),
  ]);
export const studioWorkspaceTitle = (tab: string): string =>
  tab === "chat"
    ? "Chat workspace"
    : tab === "images"
      ? "Images workspace"
      : tab === "audio"
        ? "Audio workspace"
        : tab === "rerank"
          ? "Rerank workspace"
          : "Advanced workspace";

export const studioWorkspaceLabels = (tab: string): readonly string[] =>
  tab === "chat"
    ? ["Request", "Result workspace"]
    : tab === "images"
      ? ["Image request modes", "Image result stage"]
      : tab === "audio"
        ? ["Audio mode and request", "Audio result stage"]
        : tab === "rerank"
          ? ["Rerank request", "Ranked results"]
          : ["Endpoint family", "Response workspace"];
