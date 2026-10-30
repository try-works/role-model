import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CATALOGUE_PATH,
  STUDIO_CHAT_PATH,
  classifyStudioOutcome,
  createStudioCollector,
  formatStudioEvidence,
  summarizeStudioBody,
} from "./runtime/studio-audit-evidence.mjs";

/**
 * S286 (goal 235): bounded, redacted diagnostics for the failing packaged Studio gate.
 *
 * The instrument must prove WHICH request the gate made, when, and what came back — without ever
 * capturing prompt text, message contents, auth headers or tokens. These are collector-level unit
 * tests; they do not claim a browser result (the Lead runs the real gate).
 */

const post = (requestId, body, extra = {}) => ({
  requestId,
  request: {
    method: "POST",
    url: "http://127.0.0.1:1" + STUDIO_CHAT_PATH,
    postData: JSON.stringify(body),
    headers: { authorization: "Bearer super-secret-token" },
  },
  timestamp: 1,
  wallTime: 1,
  ...extra,
});

const collect = (events, options = {}) => {
  let clock = 0;
  const collector = createStudioCollector({ now: () => clock, ...options });
  for (const [method, params, advance] of events) {
    clock += advance ?? 0;
    collector.handle(method, params);
  }
  return { collector, at: () => clock };
};

test("S286 summarises only whitelisted body fields and never leaks prompt, messages, auth or tokens", () => {
  const summary = summarizeStudioBody(JSON.stringify({
    model: "moonshot/kimi-k2.5",
    stream: false,
    temperature: 0.2,
    messages: [{ role: "user", content: "A quiet harbour at dawn" }],
  }));
  assert.equal(summary.model, "moonshot/kimi-k2.5");
  assert.equal(summary.stream, false);
  assert.equal(summary.messageCount, 1);
  const text = JSON.stringify(summary);
  assert.ok(!text.includes("quiet harbour"), "prompt/message content must not be captured");
  assert.ok(!text.includes("temperature"), "non-whitelisted fields must not be captured");

  const unparsable = summarizeStudioBody("{not json");
  assert.equal(unparsable.unparsable, true);
  assert.ok(!JSON.stringify(unparsable).includes("not json"), "unparsable raw body must not be echoed");

  const withSecrets = summarizeStudioBody(JSON.stringify({
    model: "m",
    stream: true,
    prompt: "secret prompt",
    messages: [{ role: "user", content: "secret message" }],
    auth: "Bearer sk-123",
  }));
  const secrets = JSON.stringify(withSecrets).toLowerCase();
  assert.ok(!secrets.includes("bearer"), "auth must never be captured");
  assert.ok(!secrets.includes("secret prompt") && !secrets.includes("secret message"), "prompt/messages must never be captured");
});

test("S286 records a Studio POST start, phase, response status and finish with elapsed timings", () => {
  const { collector } = collect([
    ["Network.enable", {}, 0],
    ["StudioPhase", { phase: "seed" }, 5],
    ["Network.requestWillBeSent", post("1", { model: "seed-model", stream: false, messages: [] }), 0],
    ["Network.responseReceived", { requestId: "1", response: { status: 200, mimeType: "application/json" } }, 12],
    ["Network.loadingFinished", { requestId: "1" }, 20],
  ]);
  const requests = collector.studioRequests();
  assert.equal(requests.length, 1);
  const entry = requests[0];
  assert.equal(entry.phase, "seed");
  assert.equal(entry.method, "POST");
  assert.match(entry.path, /\/v1\/chat\/completions/);
  assert.equal(entry.status, 200);
  assert.equal(entry.startElapsedMs, 5);
  assert.equal(entry.finishedElapsedMs, 37);
  assert.equal(entry.durationMs, 32);
  assert.equal(entry.body.model, "seed-model");
  assert.equal(entry.body.stream, false);
  assert.equal(entry.body.messageCount, 0);
  assert.equal(collector.enabledAtMs(), 0);
});

test("S286 records the catalogue GET status and timing separately from the Studio POST", () => {
  const { collector } = collect([
    ["Network.enable", {}, 0],
    ["Network.requestWillBeSent", { requestId: "cat-1", request: { method: "GET", url: "http://127.0.0.1:1" + CATALOGUE_PATH }, timestamp: 0.1 }, 3],
    ["Network.responseReceived", { requestId: "cat-1", response: { status: 200, mimeType: "application/json" } }, 9],
    ["Network.loadingFinished", { requestId: "cat-1" }, 11],
    ["Network.requestWillBeSent", post("1", { model: "m", stream: false, messages: [] }), 4],
    ["Network.responseReceived", { requestId: "1", response: { status: 200 } }, 30],
    ["Network.loadingFinished", { requestId: "1" }, 31],
  ]);
  const catalogue = collector.catalogueRequest();
  assert.ok(catalogue, "the catalogue GET must be recorded");
  assert.equal(catalogue.status, 200);
  assert.equal(catalogue.startElapsedMs, 3);
  assert.equal(catalogue.durationMs, 20);
  assert.equal(collector.studioRequests().length, 1, "the catalogue GET is not a Studio POST");
});

test("S286 tracks the LATEST catalogue GET (phase-labelled), so a final-click readiness is readable", () => {
  const { collector } = collect([
    ["Network.enable", {}, 0],
    ["StudioPhase", { phase: "sweep" }, 1],
    ["Network.requestWillBeSent", { requestId: "cat-old", request: { method: "GET", url: "http://h" + CATALOGUE_PATH }, timestamp: 0.1 }, 1],
    ["Network.responseReceived", { requestId: "cat-old", response: { status: 200 } }, 2],
    ["Network.loadingFinished", { requestId: "cat-old" }, 2],
    ["StudioPhase", { phase: "final" }, 3],
    ["Network.requestWillBeSent", { requestId: "cat-new", request: { method: "GET", url: "http://h" + CATALOGUE_PATH }, timestamp: 0.2 }, 4],
    ["Network.responseReceived", { requestId: "cat-new", response: { status: 200 } }, 5],
    ["Network.loadingFinished", { requestId: "cat-new" }, 5],
  ]);
  const catalogues = collector.catalogues();
  assert.equal(catalogues.length, 2, "each catalogue GET is kept (bounded)");
  assert.deepEqual(catalogues.map((entry) => entry.phase), ["sweep", "final"]);
  const latest = collector.catalogueRequest();
  assert.equal(latest.requestId, "cat-new", "the latest GET must win, not the first route's");
  assert.equal(latest.phase, "final");
  assert.equal(latest.status, 200);
});

test("S286 bounds collected entries and counts dropped ones instead of growing without limit", () => {
  const collector = createStudioCollector({ now: () => 0, requestCap: 1 });
  collector.handle("Network.enable", {});
  collector.handle("Network.requestWillBeSent", post("1", { model: "a", stream: false, messages: [] }));
  collector.handle("Network.requestWillBeSent", post("2", { model: "b", stream: false, messages: [] }));
  assert.equal(collector.studioRequests().length, 1);
  assert.equal(collector.dropped(), 1);
});

test("S286 classifies no POST, in-flight, http error, responded-unapplied and applied", () => {
  assert.equal(classifyStudioOutcome({ buttonDisabledAtClick: true }), "no-post-disabled");
  assert.equal(classifyStudioOutcome({ buttonDisabledAtClick: false }), "no-post");
  assert.equal(
    classifyStudioOutcome({ buttonDisabledAtClick: false, entry: { startElapsedMs: 1, status: undefined }, rawStateAtEnd: "loading" }),
    "in-flight",
  );
  assert.equal(
    classifyStudioOutcome({ buttonDisabledAtClick: false, entry: { status: 500 }, rawStateAtEnd: "loading" }),
    "http-error",
  );
  assert.equal(
    classifyStudioOutcome({ buttonDisabledAtClick: false, entry: { status: 200 }, rawStateAtEnd: "loading" }),
    "responded-unapplied",
  );
  assert.equal(
    classifyStudioOutcome({ buttonDisabledAtClick: false, entry: { status: 200 }, rawStateAtEnd: "success" }),
    "applied",
  );
});

test("S286 tags each request with the phase current when it started (seed vs final)", () => {
  const { collector } = collect([
    ["Network.enable", {}, 0],
    ["StudioPhase", { phase: "seed" }, 1],
    ["Network.requestWillBeSent", post("seed-1", { model: "seed", stream: false, messages: [] }), 1],
    ["Network.responseReceived", { requestId: "seed-1", response: { status: 200 } }, 2],
    ["Network.loadingFinished", { requestId: "seed-1" }, 2],
    ["StudioPhase", { phase: "final" }, 3],
    ["Network.requestWillBeSent", post("final-1", { model: "final", stream: false, messages: [] }), 3],
    ["Network.responseReceived", { requestId: "final-1", response: { status: 200 } }, 4],
    ["Network.loadingFinished", { requestId: "final-1" }, 4],
  ]);
  const byId = new Map(collector.studioRequests().map((entry) => [entry.requestId, entry]));
  assert.equal(byId.get("seed-1").phase, "seed");
  assert.equal(byId.get("final-1").phase, "final");
});

test("S286 formats bounded evidence lines without body content or secrets", () => {
  const { collector } = collect([
    ["Network.enable", {}, 0],
    ["Network.requestWillBeSent", { requestId: "cat-1", request: { method: "GET", url: "http://h" + CATALOGUE_PATH }, timestamp: 0.1 }, 2],
    ["Network.responseReceived", { requestId: "cat-1", response: { status: 200 } }, 4],
    ["Network.loadingFinished", { requestId: "cat-1" }, 5],
    ["Network.requestWillBeSent", post("1", { model: "moonshot/kimi-k2.5", stream: false, messages: [{ content: "A quiet harbour at dawn" }] }), 6],
    ["Network.responseReceived", { requestId: "1", response: { status: 200 } }, 7],
  ]);
  const lines = formatStudioEvidence({
    click: { buttonDisabled: false, rawAtClick: "idle", selectedModel: "moonshot/kimi-k2.5" },
    evidence: collector.evidence(),
    maxLines: 25,
    outcome: classifyStudioOutcome({ buttonDisabledAtClick: false, entry: collector.studioRequests()[0], rawStateAtEnd: "loading" }),
  });
  assert.ok(Array.isArray(lines));
  assert.ok(lines.length <= 25, "evidence must be bounded to " + lines.length + " lines");
  const text = lines.join("\n");
  assert.match(text, /studio POST/);
  assert.match(text, /model=moonshot\/kimi-k2\.5/);
  assert.match(text, /stream=false/);
  assert.match(text, /outcome: responded-unapplied/);
  assert.match(text, /catalogue GET/);
  assert.ok(!text.includes("quiet harbour"), "no body content in the report");
  assert.ok(!text.toLowerCase().includes("bearer"), "no auth in the report");
});

test("S288/S286 reports samePathname as raw evidence but makes no no-POST causal claim", () => {
  const outcome = classifyStudioOutcome({
    buttonDisabledAtClick: true,
    navigatedSameUrl: true,
    rawAtClick: "loading",
    rawStateAtEnd: "loading",
  });
  assert.equal(outcome, "no-post-disabled");
  const lines = formatStudioEvidence({
    click: {
      buttonDisabled: true,
      navigatedSameUrl: true,
      rawAtClick: "loading",
      selectedModelDom: "moonshot/kimi-k2.5",
    },
    evidence: { catalogue: undefined, dropped: 0, enabledAtMs: 0, pageEvents: [], phases: [], studioRequests: [] },
    outcome,
  });
  const text = lines.join("\n");
  assert.match(text, /rawAtClick=loading/);
  assert.match(text, /samePathname=true/);
  assert.match(text, /outcome: no-post-disabled/);
  assert.ok(!/no POST was observed|cannot dispatch|preserved the existing page state/i.test(text), "same pathname is not the same document, so no causal no-POST claim");
});

test("S288 catalogue ring always keeps the latest GET with total/dropped counters past the cap", () => {
  let clock = 0;
  const collector = createStudioCollector({ now: () => clock });
  collector.handle("Network.enable", {});
  for (let index = 0; index < 22; index += 1) {
    clock += 1;
    collector.handle("Network.requestWillBeSent", { requestId: "cat-" + index, request: { method: "GET", url: "http://h" + CATALOGUE_PATH } });
    collector.handle("Network.responseReceived", { requestId: "cat-" + index, response: { status: 200 } });
    collector.handle("Network.loadingFinished", { requestId: "cat-" + index });
  }
  const evidence = collector.evidence();
  assert.equal(evidence.catalogues.length, 20, "the ring stays bounded");
  assert.equal(evidence.catalogue.requestId, "cat-21", "the latest GET must always win, even after the ring wraps");
  assert.equal(evidence.catalogueTotal, 22);
  assert.equal(evidence.catalogueDropped, 2);
});

test("S288 reserves click and outcome report lines even when more than 30 requests were collected", () => {
  let clock = 0;
  const collector = createStudioCollector({ now: () => clock });
  collector.handle("Network.enable", {});
  for (let index = 0; index < 35; index += 1) {
    clock += 1;
    collector.handle("Network.requestWillBeSent", { requestId: "r-" + index, request: { method: "POST", url: "http://h" + STUDIO_CHAT_PATH, postData: JSON.stringify({ messages: [], model: "m" + index, stream: false }) } });
    collector.handle("Network.responseReceived", { requestId: "r-" + index, response: { status: 200 } });
    collector.handle("Network.loadingFinished", { requestId: "r-" + index });
  }
  const lines = formatStudioEvidence({
    click: { buttonDisabled: false, rawAtClick: "loading", selectedModelDom: null },
    evidence: collector.evidence(),
    maxLines: 30,
    outcome: "responded-unapplied",
  });
  const text = lines.join("\n");
  assert.ok(lines.length <= 30, "the report stays bounded");
  assert.match(text, /click:/, "the click line is reserved");
  assert.match(text, /outcome: responded-unapplied/, "the outcome line is reserved");
  assert.match(text, /requests=35/);
});

test("S288 prints model=unavailable when postData is missing, instead of null or an inferred model", () => {
  let clock = 0;
  const collector = createStudioCollector({ now: () => clock });
  collector.handle("Network.enable", {});
  collector.handle("Network.requestWillBeSent", { requestId: "no-body", request: { method: "POST", url: "http://h" + STUDIO_CHAT_PATH } });
  collector.handle("Network.responseReceived", { requestId: "no-body", response: { status: 200 } });
  collector.handle("Network.loadingFinished", { requestId: "no-body" });
  const lines = formatStudioEvidence({
    click: { buttonDisabled: false, rawAtClick: "success", selectedModelDom: "moonshot/kimi-k2.5" },
    evidence: collector.evidence(),
    outcome: "applied",
  });
  const text = lines.join("\n");
  assert.match(text, /model=unavailable/);
  assert.ok(!/model=null/.test(text), "null must not be printed as if it were a model");
});

test("S286 never presents the DOM field value as the actual model state", () => {
  const lines = formatStudioEvidence({
    click: { buttonDisabled: false, rawAtClick: "idle", selectedModelDom: "moonshot/kimi-k2.5" },
    evidence: { catalogue: undefined, dropped: 0, enabledAtMs: 0, pageEvents: [], phases: [], studioRequests: [] },
    outcome: "no-post",
  });
  const text = lines.join("\n");
  assert.match(text, /selectedModelDom=moonshot\/kimi-k2\.5/);
  assert.match(text, /modelStateInferred=false/);
  assert.ok(!/selectedModel=(?!Dom)/.test(text), "no unqualified model claim");
});
