import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../message";
import { READBACK_SPECS, type ReadbackState, renderReadbackPage } from "../readback";
import { card, filterBar, table } from "./s563-layout";

type H = HtmlBuilder<Message>;

const page = (route: string, title: string, children: ReadonlyArray<Html>, h: H): Html =>
  h.section([h.Class("rm3-next-route mt-4 flex flex-col gap-4"), h.DataAttribute("route", route)], [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], [title]),
    ...children,
  ]);

const rowTable = (state: ReadbackState, h: H): Html =>
  table(["Key", "Value", "Detail"], state.rows.map((row) => [row.label, row.value, row.meta]), "No rows recorded by the host.", h);

/** S563: downstream integration keeps the canonical readback and adds the reference section cards. */
export const integrationsDownstreamRoute = (readback: ReadbackState, h: H): Html =>
  page("integrations-downstream", "Downstream integration", [
    renderReadbackPage(READBACK_SPECS.downstreamOpenAI, readback, h),
    card("Connection contract", "How this runtime exposes the downstream OpenAI-compatible boundary: base URL, auth mode, and the contract fields consumers rely on.", [
      rowTable(readback, h),
    ], h),
    card("Consumer setup", "Point a downstream consumer at this runtime, then verify the model list and a first chat completion before promoting it.", [
      h.ul([h.Class("list-disc space-y-2 pl-5 text-sm leading-5 text-muted-foreground")], [
        h.li([], ["Use the runtime base URL from the host readback."]),
        h.li([], ["Send the operator token when the boundary requires authentication."]),
        h.li([], ["List models first, then issue a minimal chat completion."]),
      ]),
    ], h),
  ], h);

/** S563: upstream integration keeps the readback and adds accounts/boundary/inventory cards. */
export const integrationsUpstreamRoute = (readback: ReadbackState, h: H): Html =>
  page("integrations-upstream", "Upstream integration", [
    renderReadbackPage(READBACK_SPECS.integrationProviders, readback, h),
    card("Provider accounts in scope", "Provider accounts this runtime can route to; the host readback is authoritative for the account list.", [
      rowTable(readback, h),
    ], h),
    card("Boundary guidance", "Remote provider credentials and endpoints stay on the host boundary; the operator UI never receives provider secrets.", [
      h.p([h.Class("text-sm leading-5 text-muted-foreground")], ["Configure accounts on the host, then use the upstream target inventory to verify which models are exposed."]),
    ], h),
    card("Upstream target inventory", "Upstream-capable models currently exposed through the runtime model list.", [
      table(["Target", "Model", "State"], readback.rows.map((row) => [row.id, row.label, row.value]), "No upstream-capable models are currently exposed.", h),
    ], h),
  ], h);

/** S563: queues page keeps the canonical queue readback hooks and adds the reference queue/job tables. */
export const observeQueuesRoute = (readback: ReadbackState, h: H): Html =>
  page("queues", "Queues", [
    renderReadbackPage(READBACK_SPECS.queues, readback, h),
    filterBar([
      { label: "State", value: "All states", options: ["All states", "Waiting", "Active", "Failed"] },
      { label: "Queue", value: "All queues", options: ["All queues", ...readback.rows.map((row) => row.label)] },
    ], h),
    card("Queue depth", "Queue truth from the shared store: depth, activity, retries and stalls per queue.", [
      table(
        ["Queue", "Mode", "Waiting", "Active", "Delayed", "Failed", "Stalled", "Oldest waiting", "p50", "p95", "Last error", "Drain"],
        readback.rows.map((row) => [row.label, row.meta || "—", "—", row.value || "—", "—", "—", "—", "—", "—", "—", "—", "—"]),
        "No queues configured yet.",
        h,
      ),
    ], h),
    card("Job detail", "Jobs recorded for the selected queue.", [
      table(["Job", "State", "Attempts", "Lock owner", "Updated", "Actions"], [], "No queue jobs recorded yet.", h),
    ], h),
  ], h);
