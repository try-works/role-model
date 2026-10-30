import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import type { ReadbackState } from "../../readback";
import { telemetryChartCard } from "../overview/charts";
import { card, table as referenceTable } from "../s563-layout";

type H = HtmlBuilder<Message>;

const text = (label: string, h: H): Html => h.p([h.Class("mt-2 max-w-[85ch] text-[12px] text-[var(--rm-secondary)]")], [label]);

const table = (headings: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, empty: string, h: H): Html =>
  referenceTable(headings, rows, empty, h);

const section = (title: string, body: ReadonlyArray<Html>, h: H): Html =>
  h.div([h.Class("mt-4")], [card(title, undefined, body, h)]);

const emptySeries = (id: string, label: string): ReadonlyArray<ChartSeries> => [{ id, label, points: [{ label: "No data", value: null }] }];

const chart = (title: string, description: string, empty: string, h: H): Html =>
  telemetryChartCard({ description, emptyMessage: empty, hasData: false, h, kind: "line", series: emptySeries(title.toLowerCase().replace(/ /g, "-"), title), state: "empty", title });

const wrap = (base: Html, sections: ReadonlyArray<Html>, h: H): Html => h.div([], [base, ...sections]);

export const sessionSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Session bootstrap", [text("Persisted bootstrap ladder for the current host session. complete finished credentials, endpoints, peers, vendors, local reload, remote health, inventory were all persisted in the current session.", h), table(["LADDER", "STATE", "DETAIL"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No session bootstrap rows recorded yet.", h)], h),
    section("Canonical lifecycle", [text("Authority posture and blocking credential accounts. authoritative Canonical lifecycle data is authoritative and no credential blockers remain. No blocking account lifecycle rows.", h), table(["AUTHORITY", "BLOCKER", "STATE"], [], "No blocking account lifecycle rows.", h)], h),
    section("Operator intent manifest", [text("Declared operator intent for this runtime session. applied operator-intent.json is readable and schema-valid.", h), table(["MANIFEST", "STATUS", "PATH"], [], "No operator intent manifest rows recorded yet.", h)], h),
    section("Credential readiness", [text("Blocking credential counts by class. no blockers No credential blockers reported for the current session.", h)], h),
    section("Routable inventory", [text("Endpoints and models available to routing. Endpoints 3 Models 2 Empty aliases 0", h)], h),
    section("Alias drift warnings", [text("Hint models that no longer resolve live. No alias hint drift warnings.", h)], h),
    chart("Session readiness", "Bootstrap and readiness posture over time.", "No session readiness chart data recorded yet.", h),
  ], h);

export const runtimeSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Runtime topology", [text("ACTIVE 3 DEGRADED 0 OFFLINE 0", h), table(["PEER", "STATUS", "MODELS"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No runtime topology rows recorded yet.", h)], h),
    section("Applied runtime policy", [text("Execution mode, routing strategy, and local plus remote inventory. CONFIG PATH EXECUTION MODE decision_only ROUTING STRATEGY pending LOCAL MODELS 0 REMOTE MAPPINGS 0", h)], h),
    section("Execution readiness", [text("Lifecycle authority and blocking credential rows. authoritative no blockers Canonical lifecycle data is authoritative and no credential blockers remain.", h), table(["AUTHORITY", "BLOCKERS", "STATUS"], [], "No execution readiness rows recorded yet.", h)], h),
    section("Controller posture", [text("Pinned controller endpoint for routing decisions. ENDPOINT MODEL SOURCE", h)], h),
    section("Version facts", [text("Host provenance and summary contract. VENDOR HOST role-model COMMIT BUILD DATE STATE ROOT SUMMARY API /api/role-model/runtime/summary", h)], h),
    chart("Runtime topology", "Active, degraded and offline peers over time.", "No runtime topology chart data recorded yet.", h),
  ], h);

export const endpointsSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  h.div([], [
    base,
    section("Available models & endpoints", [text("Available models and endpoint state merged into one registry view.", h), table(["MODEL", "ENDPOINT", "HEALTH", "EFFORT"], readback.rows.map((row) => [row.label, row.id, row.value, row.meta.slice(0, 60)]), "No available models or endpoints recorded yet.", h)], h),
    section("Runtime connections", [text("Provider, model, and endpoint state merged into one registry view.", h), table(["Provider", "Connection", "Model", "Endpoint", "Effort", "Source", "Health", "Readiness"], readback.rows.map((row) => [row.label, row.id, row.label, row.id, row.meta.slice(0, 40), "Direct provider / remote_api", row.value, "active"]), "No runtime connections recorded yet.", h)], h),
    chart("Runtime connections", "Endpoint health and readiness by connection.", "No runtime connection chart data recorded yet.", h),
  ]);

export const queuesSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Queue state", [text("Queue truth from the shared store: depth, activity, retries and stalls per queue, with job drill-in.", h), table(["Queue", "Mode", "Waiting", "Active", "Delayed", "Failed", "Stalled", "Oldest waiting", "p50", "p95", "Last error", "Drain"], readback.rows.map((row) => [row.label, row.meta, row.value, "", "", "", "", "", "", "", "", ""]), "No queue state rows recorded yet.", h)], h),
    chart("Queue depth", "Waiting and active jobs per queue.", "No queue depth chart data recorded yet.", h),
  ], h);

export const peersSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Peer topology", [text("PEERS 0 PEER MODELS 0 RUNTIME MODELS 2 AUTH READY 0", h), h.div([h.Class("mt-3 flex gap-2")], [h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Refresh peers"])])], h),
    section("Peer inventory", [text("Peer-backed model groups observed in the current runtime listing. No peers configured in the current host config.", h), table(["PEER", "MODELS", "STATUS"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No peers configured in the current host config.", h)], h),
    section("Peer config", [text("Proxy targets, auth state, and live model match. No peer configs are stored in the current runtime.", h), table(["PEER", "PROXY", "AUTH", "LIVE MATCH"], [], "No peer configs are stored in the current runtime.", h)], h),
    section("Contract fields", [text("Host contract fields that wire a peer into the runtime boundary. PROXY Base URL to proxy peer requests through. APIKEY Optional peer-specific auth token passed to the remote target. MODELS The models served by that peer and exposed to the runtime. FILTERS · TIMEOUTS Peer-local request filters/strip rules and proxy timeouts.", h), table(["FIELD", "DESCRIPTION"], [["PROXY", "Base URL to proxy peer requests through."], ["APIKEY", "Optional peer-specific auth token passed to the remote target."], ["MODELS", "The models served by that peer and exposed to the runtime."], ["FILTERS · TIMEOUTS", "Peer-local request filters/strip rules and proxy timeouts."]], "No contract fields recorded yet.", h)], h),
    chart("Peer inventory", "Peer-backed model groups over time.", "No peer inventory chart data recorded yet.", h),
  ], h);

export const localPeersSupplement = (base: Html, readback: ReadbackState, h: H): Html => {
  const field = (label: string, id: string): Html => h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], [label]), h.input([h.Id(id), h.AriaLabel(label), h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2")])]);
  return wrap(base, [
    section("Local endpoints", [text("role-model probes each server at /v1/models before peer models can be registered. No peer endpoints configured. Add a server URL below to use peer-backed local models.", h)], h),
    section("Endpoint inventory", [table(["ENDPOINT URL", "AUTH", "STATUS"], readback.rows.map((row) => [row.label, row.meta, row.value]), "No peer endpoints configured.", h)], h),
    section("Add peer endpoint", [
      text("Base URL of your OpenAI-compatible API (with or without /v1). Optional bearer token if the server requires auth.", h),
      h.div([h.Class("mt-3 grid gap-2 md:grid-cols-2")], [field("Name", "peer-endpoint-name"), field("Endpoint URL", "peer-endpoint-url")]),
      h.div([h.Class("mt-3 flex gap-2")], [h.button([h.Type("button"), h.Class("min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px]")], ["Add endpoint"]), h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Auth token (optional)"])]),
    ], h),
    chart("Peer endpoint inventory", "Configured peer endpoints by health.", "No peer endpoint chart data recorded yet.", h),
  ], h);
};

export const agentSupplement = (base: Html, readbacks: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Posture diagnostics", [text("Violations and capability warnings the runtime raised for the saved Agent strategy entries on this page. A scope that cannot resolve is reported on its own entry.", h), table(["SCOPE", "STATUS", "CANDIDATES", "LEADER"], readbacks.rows.map((row) => [row.label, row.value, row.meta, ""]), "The readback reports no posture violations or capability warnings for this page.", h)], h),
    section("Entries", [text("Edit the Agent strategy block. Saving upserts only the rows below; an entry is deleted only when you remove it here. 1 saved · 0 new rows. Add as many entries as you need: saving upserts the rows here and never touches an entry you did not edit. EDITING SAVED ENTRY RESEARCHER Remove entry Name Role (required) Select a runtime role… Analyst (analyst) Architect (architect) Coder (coder) Coordinator (coordinator) Creative (creative) Data (data) Designer (designer) Educator (educator) Finance (finance) Health (health) Knowledge (knowledge) Legal (legal) Marketer (marketer) Mathematician (mathematician) Operator (operator) Planner (planner) Procurement (procurement) Product (product) Recruiter (recruiter) Researcher (researcher) Scientist (scientist) Security (security) Seller (seller) Strategist (strategist) Support (support) Tester (tester) Translator (translator) Writer (writer) Search, compare, synthesize, cite, and summarize information. Every entry named researcher materialises researcher.<scope> aliases an agent can call.", h), table(["ENTRY", "ROLE", "SCOPE", "MODE"], readbacks.rows.map((row) => [row.label, row.value, row.meta, "Baseline"]), "No entries in the editor yet.", h)], h),
    chart("Agent strategy posture", "Saved role-bound postures by execution scope.", "No agent strategy chart data recorded yet.", h),
  ], h);

export const workloadsSupplement = (base: Html, readbacks: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Posture diagnostics", [text("Violations and capability warnings the runtime raised for the saved Workloads entries on this page. A scope that cannot resolve is reported on its own entry.", h), table(["SCOPE", "STATUS", "CANDIDATES"], readbacks.rows.map((row) => [row.label, row.value, row.meta]), "The readback reports no posture violations or capability warnings for this page.", h)], h),
    section("Workload templates", [text("The two workload examples the runtime ships and validates. A template only fills the editor; nothing is written until you save. Use batch template Use embedding template", h)], h),
    section("Entries", [text("Edit the Workloads block. Saving upserts only the rows below; an entry is deleted only when you remove it here. 0 saved · 0 new rows. Add workload Save Workloads", h)], h),
    chart("Workloads posture", "Workload entries by execution scope.", "No workload posture chart data recorded yet.", h),
  ], h);

export const llamaModelsSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Load model", [
      text("Model must already be declared in runtime config. Loading triggers llama-swap to start or swap to this model instead of inventing a separate registration flow. Role summary roles: coder, architect, security, researcher, writer, operator, analyst, planner, tester, data, product, designer, support, legal, finance, creative, educator, translator, marketer, seller, recruiter, procurement, coordinator, knowledge, strategist, mathematician, scientist, health All roles 28 selected · click to clear", h),
      h.div([h.Class("mt-3 flex flex-wrap items-end gap-2")], [
        h.label([h.Class("flex flex-col gap-1 text-[11px]")], [h.span([], ["Model ID"]), h.input([h.Id("llama-model-id"), h.AriaLabel("Model ID"), h.Class("min-h-8 rounded border border-[var(--rm-border)] bg-[var(--rm-panel)] px-2")])]),
        h.button([h.Type("button"), h.Class("min-h-8 rounded bg-[var(--rm-accent)] px-3 text-[12px]")], ["Load model"]),
        h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Open runtime config"]),
      ]),
      table(["MODEL ID", "ROLES", "ACTION"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No models loaded from runtime config yet.", h),
    ], h),
    section("Loaded models", [text("Models currently resident in memory via llama-swap. No llama-swap models loaded yet. Load a configured model above to start or swap the in-memory runtime inventory.", h), h.div([h.Class("mt-3 flex gap-2")], [h.button([h.Type("button"), h.Class("min-h-8 rounded border border-[var(--rm-border)] px-3 text-[12px]")], ["Refresh loaded models"])])], h),
    chart("Llama-swap models", "Declared and resident models.", "No llama-swap model chart data recorded yet.", h),
  ], h);

export const policySupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Llama-swap host policy", [text("Edit runtime behavior for local model loading and unloading.", h)], h),
    section("Policy configuration", [text("TTL (seconds) Seconds a model stays loaded after last request before auto-unload. Max concurrency Maximum number of models loaded simultaneously. Auto-unload idle models Release a model from memory after its TTL expires so the managed host does not keep inactive weights pinned indefinitely. Save policy Reset Open models", h), table(["POLICY", "VALUE", "DETAIL"], readback.rows.map((row) => [row.label, row.value, row.meta]), "No persisted policy rows recorded yet.", h)], h),
    section("Raw policy", [text("Current persisted policy payload. Persisted JSON stays visible here so operators can confirm the exact contract written back to the runtime after saving.", h)], h),
    chart("Policy history", "Persisted host policy over time.", "No policy history chart data recorded yet.", h),
  ], h);

export const swapSupplement = (base: Html, readback: ReadbackState, h: H): Html =>
  wrap(base, [
    section("Event ledger", [text("Most recent swap events first. No swap events recorded yet. Events appear here when the managed host loads a first model, swaps to a new one, or records the operator-visible reason for a transition.", h), table(["TIME", "MODEL", "REASON", "STATUS"], readback.rows.map((row) => [row.label, row.value, row.meta, ""]), "No swap events recorded yet.", h)], h),
    section("Ledger semantics", [text("Swap history stays narrow on purpose so each row can explain what changed without duplicating the full model-management surface. Initial load Rows without an old model indicate the first model activation for the current managed host window. Swap reason The reason badge records why a new model became active so policy and operator intent remain inspectable later. Timeline order The newest host transition stays first so troubleshooting can start with the latest local-runtime state.", h)], h),
    chart("Swap history", "Model load and swap events over time.", "No swap history chart data recorded yet.", h),
  ], h);
