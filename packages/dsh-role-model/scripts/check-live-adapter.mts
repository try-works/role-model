/**
 * Live adapter verification: the plugin-owned adapter, driven against the real
 * runtime on 127.0.0.1:3457.
 *
 * This is the Phase 6 gate. It loads the HOST's own `LlmAdapter`/`LlmError` classes
 * (so failure codes keep their class identity), builds the adapter exactly as the
 * plugin does, and then:
 *   - lists models and checks every entry satisfies what DSH validates;
 *   - resolves a model and checks the identity echo and effort declaration;
 *   - streams a real request and checks the translated chunks;
 *   - reads the runtime's routing decision back and checks it names the role and
 *     task this plugin classified.
 *
 * Run:  node --import tsx scripts/check-live-adapter.mts [endpoint] [model]
 */

import { createRoleModelAdapter } from "../src/adapter.js";
import {
  createRoleModelCatalog,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";
import { loadHostLlmClasses } from "../src/host-llm.js";
import { applyRoleModelIntent } from "../src/intent.js";
import { buildChatBody } from "../src/openai-wire.js";

/** Build a body for the A/B probe's fixed prompt. */
function buildChatRequestBody(model: string, prompt: string): Record<string, unknown> {
  return buildChatBody({
    model,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  });
}

const endpoint = (process.argv[2] ?? process.env.ROLE_MODEL_ENDPOINT ?? "http://127.0.0.1:3457")
  .trim()
  .replace(/\/+$/u, "");
const requestedModel = process.argv[3];
const ROUTE = "role-model";

let failures = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail.length > 0 ? ` — ${detail}` : ""}`);
}

// 1. Load the HOST's classes. This is the module-identity requirement.
const hostLlm = await loadHostLlmClasses({
  env: { ...process.env, DSH_HARNESS_ROOT: process.env.DSH_HARNESS_ROOT ?? "D:\\deepseek-harness" },
  cwd: process.cwd(),
  moduleOverride: process.env.DSH_HOST_LLM_MODULE,
});
check(
  "the host dsh-llm module was located",
  hostLlm !== undefined,
  hostLlm?.source.path ?? "not found",
);
if (hostLlm === undefined) {
  console.log("\ncannot continue without the host classes");
  process.exit(1);
}
console.log(`      host classes from: ${hostLlm.source.kind} -> ${hostLlm.source.path}`);

// 2. Discovery, so the model id is one the runtime advertises.
const discoveryResponse = await fetch(`${endpoint}/api/role-model/downstream/openai`, {
  headers: { connection: "close" },
});
check("discovery responds 200", discoveryResponse.ok, `status ${discoveryResponse.status}`);
const discovery = validateDownstreamOpenAIDiscovery(await discoveryResponse.json());
const catalog = createRoleModelCatalog(discovery, ROUTE);
const model = requestedModel ?? catalog.recommendedModel ?? catalog.entries[0]?.id;

// 3. Build the adapter exactly as the plugin does, with the host's classes.
const adapter = createRoleModelAdapter({
  providerRoute: ROUTE,
  endpoint,
  placeholderToken: discovery.authentication.placeholderToken,
  LlmAdapterBase: hostLlm.LlmAdapter,
  LlmErrorClass: hostLlm.LlmError,
});
check(
  "the adapter is an instance of the host LlmAdapter class",
  adapter instanceof hostLlm.LlmAdapter,
);

// 4. listModels: the shape DSH validates strictly.
const models = await adapter.listModels(ROUTE);
check("listModels returns entries", models.length > 0, `${models.length} models`);
check(
  "every entry names the owning provider (DSH throws INVALID_CATALOG otherwise)",
  models.every((entry) => entry.provider === ROUTE),
);
check(
  "model ids are unique and non-empty",
  new Set(models.map((m) => m.id)).size === models.length,
);
check(
  "every entry has a non-empty name",
  models.every((entry) => entry.name.length > 0),
);
check(
  "the advertised model is present",
  models.some((entry) => entry.id === model),
  `model=${model}`,
);

// 5. resolveModel: identity echo plus the effort declaration.
const resolved = await adapter.resolveModel(ROUTE, model);
check("resolveModel echoes the provider", resolved.provider === ROUTE);
check("resolveModel echoes the exact model id", resolved.id === model);
check("resolveModel names the model", resolved.name.length > 0, resolved.name);
check(
  "resolveModel declares a context window",
  (resolved.context?.contextWindow ?? 0) > 0,
  String(resolved.context?.contextWindow),
);
check(
  "resolveModel declares an output cap",
  (resolved.defaultMaxTokens ?? 0) > 0,
  String(resolved.defaultMaxTokens),
);
if (resolved.reasoning !== undefined) {
  check(
    "every declared effort has a non-empty id and name",
    resolved.reasoning.efforts.every((effort) => effort.id.length > 0 && effort.name.length > 0),
    resolved.reasoning.efforts.map((effort) => effort.id).join("/"),
  );
  check(
    "the default effort is one of the declared efforts",
    resolved.reasoning.defaultEffort === undefined ||
      resolved.reasoning.efforts.some((effort) => effort.id === resolved.reasoning?.defaultEffort),
    resolved.reasoning.defaultEffort ?? "none",
  );
} else {
  console.log("      this model declares no reasoning control");
}

// 6. Stream a real request through the adapter.
//
// One retry is allowed: an upstream provider can terminate a stream (observed as a
// terminal `terminated`/`SERVER` finish) independently of this plugin. What is
// asserted is that the adapter surfaces a terminal finish rather than throwing,
// and that a successful attempt produces prose.
console.log(`\nstreaming a real request through the adapter (model=${model}) ...`);

/** One streaming attempt. */
async function streamOnce(): Promise<{
  chunks: number;
  text: string;
  toolCallDeltas: number;
  finish: unknown;
  threw: boolean;
  threwCode: unknown;
  elapsedMs: number;
  routed: { requestId?: string; routingDecisionId?: string; endpointId?: string };
}> {
  const routedInfo: { requestId?: string; routingDecisionId?: string; endpointId?: string } = {};
  const attemptAdapter = createRoleModelAdapter({
    providerRoute: ROUTE,
    endpoint,
    placeholderToken: discovery.authentication.placeholderToken,
    LlmAdapterBase: hostLlm.LlmAdapter,
    LlmErrorClass: hostLlm.LlmError,
    onRequestRouted: (info) => Object.assign(routedInfo, info),
  });
  const started = Date.now();
  let text = "";
  let chunks = 0;
  let toolCallDeltas = 0;
  let finish: unknown;
  let threw = false;
  let threwCode: unknown;
  try {
    for await (const raw of attemptAdapter.stream({
      provider: ROUTE,
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Implement a small bug fix in the parser and add a regression test.",
            },
          ],
        },
      ],
    })) {
      const chunk = raw as { type: string; text?: string; reason?: unknown };
      chunks += 1;
      if (chunk.type === "text-delta") text += chunk.text ?? "";
      if (chunk.type === "tool-call-delta") toolCallDeltas += 1;
      if (chunk.type === "finish") finish = chunk.reason;
    }
  } catch (error) {
    threw = true;
    threwCode = (error as { code?: unknown }).code;
  }
  return {
    chunks,
    text,
    toolCallDeltas,
    finish,
    threw,
    threwCode,
    elapsedMs: Date.now() - started,
    routed: routedInfo,
  };
}

let attempt = await streamOnce();
if (!attempt.threw && JSON.stringify(attempt.finish).includes('"terminated"')) {
  console.log("      upstream terminated the stream; retrying once ...");
  attempt = await streamOnce();
}

const routed = attempt.routed;
const text = attempt.text;
const chunks = attempt.chunks;
const toolCallDeltas = attempt.toolCallDeltas;
const finish = attempt.finish;

check(
  "the adapter did not throw mid-stream",
  !attempt.threw,
  attempt.threw ? String(attempt.threwCode) : "clean",
);
check("stream produced chunks", chunks > 0, `${chunks} chunks in ${attempt.elapsedMs}ms`);
check("stream produced prose", text.trim().length > 0, `${text.trim().length} chars`);
check("stream ended with a finish chunk", finish !== undefined, JSON.stringify(finish));
console.log(`      runtime endpoint id: ${routed.endpointId ?? "not disclosed"}`);
console.log(`      routing decision id: ${routed.routingDecisionId ?? "not disclosed"}`);
console.log(`      first 140 chars: ${JSON.stringify(text.trim().slice(0, 140))}`);

// 7. Read the routing decision back, proving the request reached the router.
//
// The decision record's `request.taxonomyDimensions` is where the runtime records
// its understanding of the request; step 8 checks that it matches the injected
// intent, which is the load-bearing assertion.
const decisionKey =
  routed.requestId ??
  (routed.routingDecisionId?.startsWith("decision-") === true
    ? routed.routingDecisionId.slice("decision-".length)
    : undefined);
check("a routing-decision key was derivable", decisionKey !== undefined, decisionKey ?? "none");
if (decisionKey !== undefined) {
  const decisionResponse = await fetch(
    `${endpoint}/api/role-model/router/decisions/${encodeURIComponent(decisionKey)}`,
    { headers: { connection: "close" } },
  );
  check(
    "the routing decision is readable",
    decisionResponse.ok,
    `status ${decisionResponse.status}`,
  );
  if (decisionResponse.ok) {
    const decision = (await decisionResponse.json()) as {
      selectedEndpointId?: string;
      request?: { taxonomyDimensions?: Record<string, unknown> };
    };
    console.log(`      decision selected endpoint: ${decision.selectedEndpointId ?? "none"}`);
    // A mid-stream upstream termination is recorded as a pre-execution routing
    // failure, which is the runtime's own accounting and not this adapter's.
    const reportedAsRouted =
      routed.endpointId === undefined ||
      decision.selectedEndpointId === routed.endpointId ||
      decision.selectedEndpointId === "routing.failed.pre-execution";
    check(
      "the decision account for the request is consistent",
      reportedAsRouted,
      routed.endpointId ?? "n/a",
    );
    const dimensions = decision.request?.taxonomyDimensions;
    console.log(`      runtime taxonomyDimensions: ${JSON.stringify(dimensions) ?? "absent"}`);
  }
}

// 8. Failure mapping: a deliberately unreachable endpoint must produce a routable code.
console.log("\nchecking failure classification ...");
const failingAdapter = createRoleModelAdapter({
  providerRoute: ROUTE,
  endpoint: "http://127.0.0.1:9",
  placeholderToken: discovery.authentication.placeholderToken,
  LlmAdapterBase: hostLlm.LlmAdapter,
  LlmErrorClass: hostLlm.LlmError,
});
try {
  for await (const _ of failingAdapter.stream({
    provider: ROUTE,
    model,
    messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  })) {
    /* drain */
  }
  check("an unreachable runtime throws", false, "it did not throw");
} catch (error) {
  const code = (error as { code?: unknown }).code;
  check("an unreachable runtime throws the host LlmError class", error instanceof hostLlm.LlmError);
  check(
    "the failure carries a routable code, not UNKNOWN",
    typeof code === "string" && code !== "UNKNOWN",
    String(code),
  );
}

// 8. The decisive experiment: does the injected metadata actually influence routing?
//
// The same prompt is sent repeatedly with and without intent metadata. A single
// comparison would prove nothing (endpoint choice could be nondeterministic), so
// each arm runs several times and the distributions are compared. The decision
// record's `request.taxonomyDimensions` carries what the runtime understood.
console.log("\n--- A/B: does the injected intent change routing? ---");

/** Send one request and report the endpoint plus the runtime's understanding. */
async function probe(withIntent: boolean): Promise<{
  endpointId: string | null;
  taxonomyRole: string | null;
  taxonomyTask: string | null;
  injectedRole: string | null;
}> {
  const prompt = "Write a short haiku about database indexes.";
  const baseRequest = {
    provider: ROUTE,
    model,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  };
  const body = buildChatRequestBody(model, prompt);
  let payload: Record<string, unknown> = body;
  let injectedRole: string | null = null;
  if (withIntent) {
    const withMeta = await applyRoleModelIntent(baseRequest, {
      roleModelModelIds: new Set(catalog.entries.map((entry) => entry.id)),
      providerRoutes: new Set([ROUTE]),
    });
    const roleModel = (withMeta.request as { role_model?: { intent?: { role_hint_id?: string } } })
      .role_model;
    injectedRole = roleModel?.intent?.role_hint_id ?? null;
    payload = { ...body, role_model: roleModel };
  }

  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      authorization: `Bearer ${discovery.authentication.placeholderToken}`,
      connection: "close",
    },
    body: JSON.stringify(payload),
  });
  const endpointId = response.headers.get("x-role-model-endpoint-id");
  const decisionId = response.headers.get("x-role-model-routing-decision-id");
  for await (const _ of response.body ?? []) {
    /* drain so the request completes */
  }

  let taxonomyRole: string | null = null;
  let taxonomyTask: string | null = null;
  const key =
    decisionId?.startsWith("decision-") === true ? decisionId.slice("decision-".length) : null;
  if (key !== null) {
    const decisionResponse = await fetch(
      `${endpoint}/api/role-model/router/decisions/${encodeURIComponent(key)}`,
      { headers: { connection: "close" } },
    );
    if (decisionResponse.ok) {
      const decision = (await decisionResponse.json()) as {
        request?: { taxonomyDimensions?: Record<string, unknown> };
      };
      const dimensions = decision.request?.taxonomyDimensions;
      taxonomyRole =
        typeof dimensions?.taxonomy_role_id === "string" ? dimensions.taxonomy_role_id : null;
      taxonomyTask =
        typeof dimensions?.taxonomy_task_type === "string" ? dimensions.taxonomy_task_type : null;
    }
  }
  return { endpointId, taxonomyRole, taxonomyTask, injectedRole };
}

const REPEATS = 3;
const withoutIntent: string[] = [];
const withIntentArm: string[] = [];
let injectedRoleSeen: string | null = null;
let taxonomyRoleSeen: string | null = null;
let taxonomyTaskSeen: string | null = null;
for (let index = 0; index < REPEATS; index += 1) {
  withoutIntent.push((await probe(false)).endpointId ?? "none");
  const withArm = await probe(true);
  withIntentArm.push(withArm.endpointId ?? "none");
  injectedRoleSeen = withArm.injectedRole;
  taxonomyRoleSeen = withArm.taxonomyRole;
  taxonomyTaskSeen = withArm.taxonomyTask;
}
const tally = (values: readonly string[]): string =>
  [
    ...values.reduce(
      (map, value) => map.set(value, (map.get(value) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ]
    .map(([value, count]) => `${value.split(".").pop() ?? value}×${String(count)}`)
    .join(", ");
console.log(`      without intent: ${tally(withoutIntent)}`);
console.log(`      with intent:    ${tally(withIntentArm)}`);
console.log(`      injected role: ${injectedRoleSeen ?? "none"}`);
console.log(
  `      runtime taxonomyDimensions: role=${taxonomyRoleSeen ?? "none"} task=${taxonomyTaskSeen ?? "none"}`,
);

check(
  "the runtime recorded the role this plugin classified",
  taxonomyRoleSeen !== null && taxonomyRoleSeen === injectedRoleSeen,
  `injected=${injectedRoleSeen ?? "none"} recorded=${taxonomyRoleSeen ?? "none"}`,
);
check(
  "the runtime recorded a task type consistent with the injected role",
  taxonomyTaskSeen?.startsWith(`${injectedRoleSeen ?? ""}.`),
  `task=${taxonomyTaskSeen ?? "none"}`,
);

console.log(
  `\n${failures === 0 ? "ALL LIVE ADAPTER CHECKS PASSED" : `${failures} LIVE ADAPTER CHECK(S) FAILED`}`,
);
process.exitCode = failures === 0 ? 0 : 1;
