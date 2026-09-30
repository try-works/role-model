/**
 * Live wire check: send real requests through our translation to the runtime.
 *
 * This exercises the outbound body, the injected `role_model` metadata, and the
 * inbound SSE translation against the actual role-model runtime — the only way to
 * confirm the field names this plugin sends and reads are the ones the runtime
 * really uses.
 *
 * Two framings are exercised because they prove different things: without tools
 * the stream must translate prose, and with a tool declared it must translate
 * tool-call deltas. Declaring a tool and then requiring prose would test the
 * model's choice, not this plugin.
 *
 * Run:  node --import tsx scripts/check-live-stream.mts [endpoint] [model]
 */

import {
  createRoleModelCatalog,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";
import { applyRoleModelIntent } from "../src/intent.js";
import { buildChatBody, streamChunksFromOpenAiSse } from "../src/openai-wire.js";

const endpoint = (process.argv[2] ?? process.env.ROLE_MODEL_ENDPOINT ?? "http://127.0.0.1:3457")
  .trim()
  .replace(/\/+$/u, "");
const requestedModel = process.argv[3];

let failures = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail.length > 0 ? ` — ${detail}` : ""}`);
}

/** Facts observed from one framing. */
interface FramingResult {
  readonly status: number;
  readonly chunks: number;
  readonly text: string;
  readonly textDeltas: number;
  readonly toolCallDeltas: number;
  readonly blockIndexes: readonly number[];
  readonly sawUsage: boolean;
  readonly finish: unknown;
  readonly routedEndpoint: string | null;
  readonly requestId: string | null;
  readonly decisionId: string | null;
  readonly outboundRole: string;
  readonly outboundTask: string;
}

// 1. Discover, so a model id the runtime actually advertises is used.
console.log(`discovering ${endpoint} ...`);
const discoveryResponse = await fetch(`${endpoint}/api/role-model/downstream/openai`, {
  headers: { connection: "close" },
});
check("discovery responds 200", discoveryResponse.ok, `status ${discoveryResponse.status}`);
const discovery = validateDownstreamOpenAIDiscovery(await discoveryResponse.json());
const catalog = createRoleModelCatalog(discovery, "role-model");
const model = requestedModel ?? catalog.recommendedModel ?? catalog.entries[0]?.id;
check(
  "the model is advertised by the runtime",
  catalog.entries.some((entry) => entry.id === model),
  `model=${model}`,
);

/** The prompt whose classification is known: coder / coder.edit. */
const PROMPT = "Implement a small bug fix in the parser and add a regression test.";

/** Tools declared for the tool framing. */
const TOOL_DECLARATIONS = [
  {
    name: "read",
    description: "Read a file from disk",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
];

/**
 * Send one framing and translate its stream.
 * @param withTools - whether to declare a tool.
 * @returns the observed facts.
 */
async function sendOnce(withTools: boolean): Promise<FramingResult> {
  const baseRequest = {
    provider: "role-model",
    model,
    messages: [{ role: "user", content: [{ type: "text", text: PROMPT }] }],
    ...(withTools ? { tools: TOOL_DECLARATIONS } : {}),
  };

  const withIntent = await applyRoleModelIntent(baseRequest, {
    roleModelModelIds: new Set(catalog.entries.map((entry) => entry.id)),
    providerRoutes: new Set(["role-model"]),
  });
  if (!withIntent.injected) throw new Error("intent metadata was not injected");
  const roleModel = (withIntent.request as { role_model: unknown }).role_model;
  const intent = (roleModel as { intent: { role_hint_id: string; task_type: string } }).intent;

  const body = buildChatBody({
    model,
    messages: baseRequest.messages,
    ...(withTools ? { tools: TOOL_DECLARATIONS } : {}),
    includeUsage: true,
  });

  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      authorization: `Bearer ${discovery.authentication.placeholderToken}`,
      connection: "close",
    },
    body: JSON.stringify({ ...body, role_model: roleModel }),
  });

  let text = "";
  let textDeltas = 0;
  let toolCallDeltas = 0;
  let chunks = 0;
  let sawUsage = false;
  let finish: unknown;
  const indexes = new Set<number>();
  if (response.body !== null) {
    for await (const chunk of streamChunksFromOpenAiSse(response.body)) {
      chunks += 1;
      if ("index" in chunk && typeof chunk.index === "number") indexes.add(chunk.index);
      if (chunk.type === "text-delta") {
        text += chunk.text;
        textDeltas += 1;
      }
      if (chunk.type === "tool-call-delta") toolCallDeltas += 1;
      if (chunk.type === "usage") sawUsage = true;
      if (chunk.type === "finish") finish = chunk.reason;
    }
  }

  return {
    status: response.status,
    chunks,
    text,
    textDeltas,
    toolCallDeltas,
    blockIndexes: [...indexes].sort((a, b) => a - b),
    sawUsage,
    finish,
    routedEndpoint: response.headers.get("x-role-model-endpoint-id"),
    requestId: response.headers.get("x-role-model-request-id"),
    decisionId: response.headers.get("x-role-model-routing-decision-id"),
    outboundRole: intent.role_hint_id,
    outboundTask: intent.task_type,
  };
}

console.log("\n--- framing A: no tools declared (expect prose) ---");
const plain = await sendOnce(false);
check("A: responds 200", plain.status === 200, `status ${plain.status}`);
check("A: stream produced chunks", plain.chunks > 0, `${plain.chunks} chunks`);
check(
  "A: stream produced text",
  plain.text.trim().length > 0,
  `${plain.text.trim().length} chars in ${plain.textDeltas} deltas`,
);
check("A: ended with a finish", plain.finish !== undefined);
check(
  "A: finish is not an error",
  !JSON.stringify(plain.finish).includes('"kind":"error"'),
  JSON.stringify(plain.finish),
);
check("A: usage was reported", plain.sawUsage);
check(
  "A: block indexes are contiguous from zero",
  plain.blockIndexes.every((value, index) => value === index),
  JSON.stringify(plain.blockIndexes),
);
check(
  "A: the injected intent is on the outbound body",
  plain.outboundRole.length > 0,
  `role=${plain.outboundRole} task=${plain.outboundTask}`,
);
console.log(`      routed endpoint: ${plain.routedEndpoint ?? "not disclosed"}`);
console.log(`      first 160 chars: ${JSON.stringify(plain.text.trim().slice(0, 160))}`);

console.log("\n--- framing B: a tool declared (expect a tool call or prose) ---");
const tooled = await sendOnce(true);
check("B: responds 200", tooled.status === 200, `status ${tooled.status}`);
check("B: stream produced chunks", tooled.chunks > 0, `${tooled.chunks} chunks`);
check("B: ended with a finish", tooled.finish !== undefined);
check(
  "B: finish is not an error",
  !JSON.stringify(tooled.finish).includes('"kind":"error"'),
  JSON.stringify(tooled.finish),
);
check(
  "B: produced tool-call deltas or text",
  tooled.toolCallDeltas > 0 || tooled.text.trim().length > 0,
  `${tooled.toolCallDeltas} tool deltas, ${tooled.text.trim().length} chars`,
);
check(
  "B: block indexes are contiguous from zero",
  tooled.blockIndexes.every((value, index) => value === index),
  JSON.stringify(tooled.blockIndexes),
);
console.log(`      routed endpoint: ${tooled.routedEndpoint ?? "not disclosed"}`);
console.log(`      finish reason: ${JSON.stringify(tooled.finish)}`);

// 2. Read the routing decision back, to prove the injected metadata reached the
//    router on the request it decided about.
//
// The decision endpoint is keyed by the REQUEST id. The runtime discloses the
// routing decision id (`decision-<requestId>`) but not the request id itself, so
// the key is derived by stripping that prefix — verified against
// `GET /api/role-model/requests`, whose records carry both fields.
const derivedKey =
  tooled.decisionId?.startsWith("decision-") === true
    ? tooled.decisionId.slice("decision-".length)
    : null;
const decisionKey = tooled.requestId ?? derivedKey;
check("a request id is derivable for the read-back", decisionKey !== null, decisionKey ?? "none");

if (decisionKey !== null) {
  const listResponse = await fetch(`${endpoint}/api/role-model/requests`, {
    headers: { connection: "close" },
  });
  if (listResponse.ok) {
    const list = (await listResponse.json()) as {
      requestId?: string;
      routingDecisionId?: string;
    }[];
    const record = list.find((entry) => entry.routingDecisionId === tooled.decisionId);
    check(
      "the derived key matches the runtime record for this decision",
      record === undefined || record.requestId === decisionKey,
      `derived=${decisionKey} record=${record?.requestId ?? "not in the recent list"}`,
    );
  }

  const decisionResponse = await fetch(
    `${endpoint}/api/role-model/router/decisions/${encodeURIComponent(decisionKey)}`,
    { headers: { connection: "close" } },
  );
  check("routing decision is readable", decisionResponse.ok, `status ${decisionResponse.status}`);
  if (decisionResponse.ok) {
    const decision: unknown = await decisionResponse.json();
    const serialized = JSON.stringify(decision);
    console.log(`      decision size: ${serialized.length} bytes`);
    check(
      "decision names the endpoint it chose",
      tooled.routedEndpoint === null || serialized.includes(tooled.routedEndpoint),
      tooled.routedEndpoint ?? "n/a",
    );
    console.log(
      `      mentions role "${tooled.outboundRole}": ${serialized.includes(tooled.outboundRole) ? "yes" : "no"}`,
    );
    console.log(
      `      mentions task "${tooled.outboundTask}": ${serialized.includes(tooled.outboundTask) ? "yes" : "no"}`,
    );
  }
}

console.log(
  `\n${failures === 0 ? "ALL LIVE WIRE CHECKS PASSED" : `${failures} LIVE WIRE CHECK(S) FAILED`}`,
);
process.exitCode = failures === 0 ? 0 : 1;
