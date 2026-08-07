import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  outputHasNonWebSearchClientTools,
  shouldAutoFulfillWebSearch,
  startForwarder,
} from "../dist/forwarder.js";

const reverseMap = new Map();
const mixed = {
  output: [
    { type: "function_call", name: "update_plan", call_id: "c0", arguments: "{}" },
    {
      type: "function_call",
      name: "web_search",
      call_id: "c1",
      arguments: JSON.stringify({ query: "SNDK" }),
    },
  ],
};
const searchOnly = {
  output: [
    {
      type: "function_call",
      name: "web_search",
      call_id: "c1",
      arguments: JSON.stringify({ query: "SNDK" }),
    },
  ],
};

const unit = {
  mixedDetected: outputHasNonWebSearchClientTools(mixed, reverseMap),
  shouldFulfillMixed: shouldAutoFulfillWebSearch(mixed, reverseMap, true),
  shouldFulfillSearchOnly: shouldAutoFulfillWebSearch(searchOnly, reverseMap, true),
};

let alpha = 0;
let hops = 0;
const stateDir = await mkdtemp(join(tmpdir(), "mixed-gate-live-"));
const server = await startForwarder({
  listenPort: 0,
  upstreamEndpoint: "http://upstream.test",
  aliasIds: new Set(["baseline.remote-only"]),
  stateFilePath: join(stateDir, "forwarder.json"),
  nativeBaseUrl: "https://chatgpt.com/backend-api/codex",
  fetchImpl: async (url) => {
    if (String(url).includes("/alpha/search")) {
      alpha += 1;
      return new Response("{}", { status: 500 });
    }
    hops += 1;
    return new Response(
      JSON.stringify({
        id: "resp_mixed_live",
        status: "incomplete",
        output: mixed.output,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
});

try {
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/v1/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer t",
      "chatgpt-account-id": "a",
    },
    body: JSON.stringify({
      model: "baseline.remote-only",
      stream: true,
      input: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "go" }],
        },
      ],
      tools: [
        { type: "web_search" },
        { type: "function", name: "update_plan", parameters: { type: "object" } },
      ],
    }),
  });
  const text = await res.text();
  const proof = {
    unit,
    httpStatus: res.status,
    upstreamHops: hops,
    alphaSearches: alpha,
    hasUpdatePlan: text.includes("update_plan"),
    hasWebSearchCall: text.includes("web_search_call"),
    hasCompleted: text.includes("response.completed"),
    ok:
      res.status === 200 &&
      hops === 1 &&
      alpha === 0 &&
      text.includes("update_plan") &&
      text.includes("web_search_call"),
  };
  console.log(JSON.stringify(proof, null, 2));
  const out = process.env.EVIDENCE_PATH;
  if (out) await writeFile(out, JSON.stringify(proof, null, 2));
  process.exit(proof.ok ? 0 : 1);
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
}
