import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";

import {
  PARITY_CAPTURE_DEFAULTS,
  ParityCaptureError,
  captureIssues,
  captureParityScreenshot,
} from "./runtime/parity-capture.mjs";

/**
 * S282 (R14 primitive): deterministic capture of an ALREADY-OWNED page through injected CDP calls.
 *
 * This is one low-level primitive, not the R14 runner: it never starts a server, browser or operator
 * process, and a mocked CDP client cannot prove a real React self-check (that gate stays NOT_RUN).
 * Contract per source-proposal §6.2: freeze the clock and seed Math.random BEFORE navigation, fix
 * viewport/DPR/timezone, stop animations, hide carets/scrollbars, wait for fonts and images, require a
 * bounded DOM-quiet window, then capture until N consecutive screenshots are byte-identical — all
 * within finite deadlines with diagnostic failures. Console errors and unexpected network must be
 * surfaced, never silently ignored.
 */

const VIEWPORT = { deviceScaleFactor: 1, height: 900, width: 1440 };
const TIMEZONE = "UTC";
const PNG_A = Buffer.from("png-A-0000000000");
const PNG_B = Buffer.from("png-B-1111111111");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const createFakeCdp = () => {
  const calls = [];
  const handlers = new Map();
  const listeners = new Map();
  const cdp = {
    calls,
    methods: () => calls.map((call) => call.method),
    on(event, listener) {
      const registered = listeners.get(event) ?? new Set();
      registered.add(listener);
      listeners.set(event, registered);
      return () => registered.delete(listener);
    },
    emit(event, params) {
      for (const listener of listeners.get(event) ?? []) listener(params);
    },
    handle(method, handler) {
      handlers.set(method, handler);
    },
    async send(method, params, sessionId) {
      calls.push({ method, params, sessionId });
      const handler = handlers.get(method);
      if (handler === undefined) throw new Error(`unexpected CDP method: ${method}`);
      return await handler(params, sessionId);
    },
  };
  return cdp;
};

/** The evaluate router: the primitive's expressions are identified by their real content. */
const routeEvaluate = (cdp, { recorder, readiness, readyState }) => {
  cdp.handle("Runtime.evaluate", (params) => {
    const expression = String(params?.expression ?? "");
    // Readiness is matched first: its expression deliberately includes both `fontsReady` and the
    // in-page `__parityCapture` mutation counter, while the recorder read only has the latter.
    if (expression.includes("fontsReady")) {
      return {
        result: {
          value: JSON.stringify(
            readiness?.() ?? {
              fontsReady: true,
              imagesReady: true,
              mutations: 0,
              pendingRequests: 0,
              readyState: "complete",
            },
          ),
        },
      };
    }
    if (expression.includes("__parityCapture")) {
      return {
        result: {
          value: JSON.stringify(
            recorder?.() ?? { consoleErrors: [], mutations: 0, networkErrors: [] },
          ),
        },
      };
    }
    if (expression === "document.readyState") {
      return { result: { value: readyState?.() ?? "complete" } };
    }
    if (expression.includes("caret-color")) {
      return { result: { value: true } };
    }
    throw new Error(`unexpected evaluate expression: ${expression}`);
  });
};

const baseHandlers = (cdp, { screenshots }) => {
  cdp.handle("Page.enable", () => ({}));
  cdp.handle("Runtime.enable", () => ({}));
  cdp.handle("Log.enable", () => ({}));
  cdp.handle("Network.enable", () => ({}));
  cdp.handle("Network.setCacheDisabled", () => ({}));
  cdp.handle("Emulation.setDeviceMetricsOverride", () => ({}));
  cdp.handle("Emulation.setTimezoneOverride", () => ({}));
  cdp.handle("Page.addScriptToEvaluateOnNewDocument", () => ({ identifier: "script-1" }));
  cdp.handle("Page.navigate", () => ({ frameId: "frame-1", loaderId: "loader-1" }));
  let index = 0;
  cdp.handle("Page.captureScreenshot", () => {
    const frame = Array.isArray(screenshots)
      ? screenshots[Math.min(index, screenshots.length - 1)]
      : screenshots(index);
    index += 1;
    return { data: Buffer.from(frame).toString("base64") };
  });
};

const captureOptions = (cdp, overrides = {}) => ({
  cdp,
  deadlineMs: 2_000,
  pollMs: 1,
  quietMs: 10,
  stableCount: 2,
  timezone: TIMEZONE,
  url: "http://127.0.0.1:9/route",
  viewport: VIEWPORT,
  ...overrides,
});

test("S282 installs deterministic clock/random, fixed viewport/timezone and hide styles before navigating", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  routeEvaluate(cdp, {});
  const result = await captureParityScreenshot(captureOptions(cdp));

  assert.deepEqual(result.viewport, VIEWPORT);
  assert.equal(result.timezone, TIMEZONE);
  const metricsCall = cdp.calls.find(
    (call) => call.method === "Emulation.setDeviceMetricsOverride",
  );
  assert.ok(metricsCall, "viewport must be fixed through Emulation.setDeviceMetricsOverride");
  assert.deepEqual(metricsCall.params, { ...VIEWPORT, mobile: false });
  const timezoneCall = cdp.calls.find((call) => call.method === "Emulation.setTimezoneOverride");
  assert.ok(timezoneCall, "timezone must be fixed");
  assert.equal(timezoneCall.params?.timezoneId, TIMEZONE);

  const bootstrapCalls = cdp.calls.filter(
    (call) => call.method === "Page.addScriptToEvaluateOnNewDocument",
  );
  assert.ok(
    bootstrapCalls.length >= 1,
    "determinism must be installed with addScriptToEvaluateOnNewDocument",
  );
  const script = String(bootstrapCalls[0].params?.source ?? "");
  assert.match(script, /Math\.random/, "Math.random must be seeded");
  assert.match(script, /Date/, "the clock must be frozen");
  assert.match(script, /__parityCapture/, "the in-page recorder must be installed");

  const navigateIndex = cdp.methods().indexOf("Page.navigate");
  assert.ok(navigateIndex > 0, "navigation must happen");
  for (const required of [
    "Emulation.setDeviceMetricsOverride",
    "Emulation.setTimezoneOverride",
    "Page.addScriptToEvaluateOnNewDocument",
  ]) {
    assert.ok(
      cdp.methods().indexOf(required) >= 0 && cdp.methods().indexOf(required) < navigateIndex,
      `${required} must run BEFORE navigation`,
    );
  }
  const styleIndex = cdp.calls.findIndex(
    (call) =>
      call.method === "Runtime.evaluate" &&
      String(call.params?.expression ?? "").includes("caret-color"),
  );
  assert.ok(styleIndex >= 0, "animations/carets must be hidden with an injected style");
  const firstShot = cdp.methods().indexOf("Page.captureScreenshot");
  assert.ok(styleIndex < firstShot, "hide styles must be applied before the first screenshot");
});

/** Executes the REAL bootstrap the module sends, in node:vm — semantics, not a regex match. */
const runBootstrap = (source, overrides = {}) => {
  const observed = [];
  const xhrListeners = [];
  class MutationObserverStub {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      observed.push(target);
    }
  }
  function XMLHttpRequestStub() {
    this.listeners = new Map();
  }
  XMLHttpRequestStub.prototype.open = function open() {};
  XMLHttpRequestStub.prototype.send = function send() {};
  XMLHttpRequestStub.prototype.addEventListener = function addEventListener(type, listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
    xhrListeners.push({ instance: this, listener, type });
  };
  const documentElement = {};
  const sandbox = {
    MutationObserver: MutationObserverStub,
    XMLHttpRequest: XMLHttpRequestStub,
    addEventListener: () => {},
    console: { error: () => {} },
    document: {
      createElement: () => ({ setAttribute() {}, textContent: "" }),
      documentElement,
      head: { appendChild() {} },
    },
    fetch: async () => ({ headers: { get: () => "application/json" }, ok: true, status: 200 }),
    setTimeout,
    ...overrides,
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context);
  return { context, documentElement, observed, sandbox, xhrListeners };
};

const bootstrapOf = async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  routeEvaluate(cdp, {});
  await captureParityScreenshot(captureOptions(cdp));
  const call = cdp.calls.find((entry) => entry.method === "Page.addScriptToEvaluateOnNewDocument");
  assert.ok(call, "the determinism bootstrap must be installed before navigation");
  return String(call.params?.source ?? "");
};

test("S282 waits for fonts/images and a bounded DOM-quiet window before the first screenshot", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  let ready = 0;
  let mutations = 0;
  let quietStartedAt = null;
  routeEvaluate(cdp, {
    readiness: () => {
      ready += 1;
      if (ready === 1) mutations = 5;
      if (ready === 2) mutations = 9;
      if (ready >= 3 && quietStartedAt === null) quietStartedAt = Date.now();
      return {
        fontsReady: ready >= 2,
        imagesReady: ready >= 3,
        mutations,
        pendingRequests: 0,
        readyState: "complete",
      };
    },
  });
  const started = Date.now();
  const result = await captureParityScreenshot(captureOptions(cdp, { quietMs: 20, pollMs: 5 }));
  assert.equal(result.stable, true);
  assert.ok(quietStartedAt !== null, "readiness must be polled until fonts/images settle");
  assert.ok(Date.now() - started >= 20, "the DOM-quiet window must actually elapse");
  const firstShot = cdp.methods().indexOf("Page.captureScreenshot");
  const lastReady = cdp.calls.map((call) => call.method).lastIndexOf("Runtime.evaluate");
  assert.ok(firstShot > 0, "a screenshot must be taken");
  assert.ok(lastReady >= 0, "readiness polls must happen");
});

test("S282 requires consecutive byte-identical screenshots and returns exact PNG bytes plus deterministic metadata", async () => {
  const cdp = createFakeCdp();
  const sequence = [PNG_A, PNG_B, PNG_B];
  baseHandlers(cdp, { screenshots: (index) => sequence[index] });
  routeEvaluate(cdp, {});
  const result = await captureParityScreenshot(captureOptions(cdp, { stableCount: 2 }));

  assert.equal(result.stable, true);
  assert.equal(result.stableCount, 2);
  assert.ok(result.screenshots >= 3, "stability needs the preceding unstable frame(s) too");
  assert.deepEqual(result.png, PNG_B, "the returned PNG must be the exact stable bytes");
  assert.equal(result.sha256, sha256(PNG_B));
  assert.equal(result.bytes, PNG_B.length);
  assert.equal(result.clock.fixedEpochMs, PARITY_CAPTURE_DEFAULTS.fixedEpochMs);
  assert.equal(result.clock.randomSeed, PARITY_CAPTURE_DEFAULTS.randomSeed);
  assert.equal(result.clean, true);
});

test("S282 fails with a bounded diagnostic error when screenshots never stabilise, and rejects non-finite deadlines", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: (index) => Buffer.from(`frame-${index}`) });
  routeEvaluate(cdp, {});
  const started = Date.now();
  await assert.rejects(
    captureParityScreenshot(captureOptions(cdp, { deadlineMs: 120, pollMs: 5, stableCount: 2 })),
    (error) => {
      assert.ok(error instanceof ParityCaptureError, "a typed capture error is required");
      assert.equal(error.code, "capture_unstable");
      assert.match(error.message, /stable|identical/i);
      assert.ok(
        error.diagnostics && error.diagnostics.screenshots >= 2,
        "diagnostics must be attached",
      );
      return true;
    },
  );
  assert.ok(Date.now() - started < 2_000, "the unstable capture must respect its finite deadline");

  const badCdp = createFakeCdp();
  await assert.rejects(
    captureParityScreenshot(captureOptions(badCdp, { deadlineMs: Number.POSITIVE_INFINITY })),
    (error) => {
      assert.equal(error.code, "invalid_option");
      return true;
    },
  );
});

test("S282 fails with a bounded diagnostic error when navigation never completes", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  routeEvaluate(cdp, { readyState: () => "loading" });
  await assert.rejects(
    captureParityScreenshot(captureOptions(cdp, { deadlineMs: 120, pollMs: 5 })),
    (error) => {
      assert.equal(error.code, "capture_timeout");
      assert.equal(
        cdp.methods().includes("Page.captureScreenshot"),
        false,
        "no screenshot may be taken before load",
      );
      return true;
    },
  );
});

test("S282 surfaces in-page console errors and unexpected network instead of ignoring them", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  routeEvaluate(cdp, {
    recorder: () => ({
      consoleErrors: ["TypeError: boom"],
      mutations: 0,
      networkErrors: ["GET /api/role-model/x -> 500"],
    }),
  });
  const result = await captureParityScreenshot(captureOptions(cdp));
  assert.deepEqual(result.consoleErrors, ["TypeError: boom"]);
  assert.deepEqual(result.networkErrors, ["GET /api/role-model/x -> 500"]);
  assert.equal(result.clean, false);
  assert.ok(captureIssues(result).length >= 2, "captureIssues must surface both classes");
});

test("S282 surfaces CDP event-channel failures and records an unavailable channel instead of claiming clean", async () => {
  const withEvents = createFakeCdp();
  baseHandlers(withEvents, { screenshots: () => PNG_A });
  routeEvaluate(withEvents, {});
  withEvents.handle("Page.navigate", () => {
    withEvents.emit("Runtime.exceptionThrown", { exceptionDetails: { text: "boom-event" } });
    withEvents.emit("Network.loadingFailed", {
      errorText: "net::ERR_FAILED",
      requestId: "1",
      type: "Fetch",
    });
    return {};
  });
  const withEventsResult = await captureParityScreenshot(
    captureOptions(withEvents, { cdp: withEvents }),
  );
  assert.equal(withEventsResult.events.channel, "subscribed");
  assert.ok(
    withEventsResult.consoleErrors.some((line) => line.includes("boom-event")),
    "CDP exceptions must be surfaced",
  );
  assert.ok(withEventsResult.networkErrors.length >= 1, "CDP network failures must be surfaced");
  assert.equal(withEventsResult.clean, false);

  const noEvents = createFakeCdp();
  delete noEvents.on;
  baseHandlers(noEvents, { screenshots: () => PNG_A });
  routeEvaluate(noEvents, {});
  const noEventsResult = await captureParityScreenshot(captureOptions(noEvents, { cdp: noEvents }));
  assert.equal(noEventsResult.events.channel, "unavailable");
  assert.equal(
    noEventsResult.events.complete,
    false,
    "an unavailable event channel cannot be reported as clean",
  );
});

test("S282 is deterministic: two identical runs produce identical PNG, sha256 and metadata", async () => {
  const run = async () => {
    const cdp = createFakeCdp();
    baseHandlers(cdp, { screenshots: (index) => (index < 1 ? PNG_A : PNG_B) });
    routeEvaluate(cdp, {});
    const result = await captureParityScreenshot(captureOptions(cdp));
    return {
      bytes: result.bytes,
      clock: result.clock,
      png: result.png,
      sha256: result.sha256,
      stable: result.stable,
      timezone: result.timezone,
      viewport: result.viewport,
    };
  };
  const first = await run();
  const second = await run();
  assert.deepEqual(first, second);
  assert.ok(first.png.equals(PNG_B), "both runs must return the exact stable frame");
  assert.equal(first.sha256, sha256(PNG_B));
  assert.equal(first.stable, true);
});

// --- S285 HOLD repairs -------------------------------------------------------------------------

test("S285 enables the Runtime/Log/Network domains and disables the cache before capture", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  routeEvaluate(cdp, {});
  await captureParityScreenshot(captureOptions(cdp));
  const methods = cdp.methods();
  for (const required of ["Runtime.enable", "Log.enable", "Network.enable"]) {
    assert.ok(
      methods.includes(required),
      `${required} must be enabled or the event channel stays silent`,
    );
  }
  const cache = cdp.calls.find((call) => call.method === "Network.setCacheDisabled");
  assert.deepEqual(
    cache?.params,
    { cacheDisabled: true },
    "caching must be disabled for deterministic bytes",
  );
  const navigateIndex = methods.indexOf("Page.navigate");
  for (const required of [
    "Runtime.enable",
    "Log.enable",
    "Network.enable",
    "Network.setCacheDisabled",
  ]) {
    assert.ok(methods.indexOf(required) < navigateIndex, `${required} must run BEFORE navigation`);
  }
});

test("S285 preserves callable/constructible Date semantics (bootstrap executed in node:vm)", async () => {
  const source = await bootstrapOf();
  const { context } = runBootstrap(source);
  const fixed = PARITY_CAPTURE_DEFAULTS.fixedEpochMs;
  assert.equal(vm.runInContext("Date.now()", context), fixed);
  assert.equal(vm.runInContext("new Date().getTime()", context), fixed);
  assert.equal(vm.runInContext("typeof Date()", context), "string", "Date() must stay callable");
  assert.equal(
    vm.runInContext("new Date(0).getTime()", context),
    0,
    "explicit arguments must be preserved",
  );
  assert.equal(
    vm.runInContext("Date.parse('1970-01-01T00:00:00.000Z')", context),
    0,
    "Date.parse must survive",
  );
  assert.ok(
    Number.isFinite(vm.runInContext("Date.UTC(2020, 0, 1)", context)),
    "Date.UTC must survive",
  );
  assert.equal(
    vm.runInContext("new Date() instanceof Date", context),
    true,
    "Date.prototype identity must hold",
  );
  assert.equal(vm.runInContext("typeof Date.prototype.getTime", context), "function");
  const first = [...vm.runInContext("[Math.random(), Math.random(), Math.random()]", context)];
  const { context: second } = runBootstrap(source);
  const secondValues = [
    ...vm.runInContext("[Math.random(), Math.random(), Math.random()]", second),
  ];
  assert.deepEqual(secondValues, first, "the seeded PRNG must be deterministic across runs");
});

test("S285 attaches the mutation observer even while documentElement is null (executed bootstrap)", async () => {
  const source = await bootstrapOf();
  const withElement = runBootstrap(source);
  assert.equal(
    withElement.observed.length,
    1,
    "the observer must attach to documentElement when present",
  );
  assert.equal(withElement.observed[0], withElement.documentElement);
  const withoutElement = runBootstrap(source, { document: { documentElement: null } });
  assert.equal(
    withoutElement.observed.length,
    1,
    "the observer must still attach when documentElement is null",
  );
  assert.equal(withoutElement.observed[0], withoutElement.sandbox.document);
});

test("S285 tracks pending fetch/XHR as readiness, not networkidle, and an SSE response cannot block it", async () => {
  const source = await bootstrapOf();
  let resolveFetch;
  const pending = new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const pendingRun = runBootstrap(source, { fetch: () => pending });
  const inFlight = pendingRun.sandbox.fetch("http://127.0.0.1/pending");
  assert.equal(
    pendingRun.sandbox.__parityCapture.pendingRequests,
    1,
    "an unsettled fetch must be counted as pending",
  );
  resolveFetch({ headers: { get: () => "application/json" }, ok: true, status: 200 });
  await inFlight;
  assert.equal(
    pendingRun.sandbox.__parityCapture.pendingRequests,
    0,
    "response headers settle readiness, not networkidle",
  );

  const sseRun = runBootstrap(source, {
    fetch: async () => ({ headers: { get: () => "text/event-stream" }, ok: true, status: 200 }),
  });
  await sseRun.sandbox.fetch("http://127.0.0.1/sse");
  assert.equal(
    sseRun.sandbox.__parityCapture.pendingRequests,
    0,
    "an SSE response must not hold readiness",
  );

  const xhrRun = runBootstrap(source);
  const xhr = new xhrRun.sandbox.XMLHttpRequest();
  xhr.open("GET", "/xhr");
  xhr.send();
  assert.equal(
    xhrRun.sandbox.__parityCapture.pendingRequests,
    1,
    "an in-flight XHR must be counted",
  );
  for (const entry of xhrRun.xhrListeners) {
    if (entry.instance === xhr && entry.type === "loadend") entry.listener();
  }
  assert.equal(
    xhrRun.sandbox.__parityCapture.pendingRequests,
    0,
    "XHR completion must clear the count",
  );
});

test("S285 does not capture while requests are pending and times out when they never settle", async () => {
  const cdp = createFakeCdp();
  baseHandlers(cdp, { screenshots: () => PNG_A });
  let polls = 0;
  routeEvaluate(cdp, {
    readiness: () => {
      polls += 1;
      return {
        fontsReady: true,
        imagesReady: true,
        mutations: 0,
        pendingRequests: polls <= 10 ? 1 : 0,
        readyState: "complete",
      };
    },
  });
  await captureParityScreenshot(captureOptions(cdp, { deadlineMs: 2_000, pollMs: 2, quietMs: 10 }));
  const firstShot = cdp.methods().indexOf("Page.captureScreenshot");
  const readinessBeforeShot = cdp.calls
    .slice(0, firstShot)
    .filter(
      (call) =>
        call.method === "Runtime.evaluate" &&
        String(call.params?.expression ?? "").includes("fontsReady"),
    ).length;
  assert.ok(
    readinessBeforeShot >= 11,
    `capture must wait until pendingRequests reaches 0 (saw ${readinessBeforeShot} readiness polls)`,
  );

  const stuck = createFakeCdp();
  baseHandlers(stuck, { screenshots: () => PNG_A });
  routeEvaluate(stuck, {
    readiness: () => ({
      fontsReady: true,
      imagesReady: true,
      mutations: 0,
      pendingRequests: 1,
      readyState: "complete",
    }),
  });
  await assert.rejects(
    captureParityScreenshot(captureOptions(stuck, { deadlineMs: 120, pollMs: 2 })),
    (error) => {
      assert.equal(error.code, "capture_timeout");
      return true;
    },
  );
});

test("S285 bounds EVERY cdp.send by the remaining deadline, including hung sends", async () => {
  const hungShot = createFakeCdp();
  baseHandlers(hungShot, { screenshots: () => PNG_A });
  routeEvaluate(hungShot, {});
  hungShot.handle("Page.captureScreenshot", () => new Promise(() => {}));
  const shotOutcome = await Promise.race([
    captureParityScreenshot(captureOptions(hungShot, { deadlineMs: 150, pollMs: 2 })).then(
      () => "resolved",
      (error) => error?.code ?? "rejected",
    ),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 1_200)),
  ]);
  assert.equal(
    shotOutcome,
    "capture_timeout",
    "a hung captureScreenshot must be bounded by the deadline",
  );

  const hungEnable = createFakeCdp();
  baseHandlers(hungEnable, { screenshots: () => PNG_A });
  routeEvaluate(hungEnable, {});
  hungEnable.handle("Page.enable", () => new Promise(() => {}));
  const enableOutcome = await Promise.race([
    captureParityScreenshot(captureOptions(hungEnable, { deadlineMs: 150, pollMs: 2 })).then(
      () => "resolved",
      (error) => error?.code ?? "rejected",
    ),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 1_200)),
  ]);
  assert.equal(enableOutcome, "capture_timeout", "a hung precondition send must be bounded too");
});
