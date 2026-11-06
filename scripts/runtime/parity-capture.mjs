import { createHash } from "node:crypto";

/**
 * S282 (R14 primitive): deterministic capture of an ALREADY-OWNED page through injected CDP calls.
 *
 * One low-level primitive, not the R14 runner. It never starts a server, browser or operator process;
 * the caller owns the session and passes the CDP transport. Per source-proposal §6.2: freeze the clock
 * and seed Math.random BEFORE navigation, fix viewport/DPR/timezone, stop animations, hide carets and
 * scrollbars, wait for fonts and images, require a bounded DOM-quiet window, then capture until
 * `stableCount` consecutive screenshots are byte-identical — all inside finite deadlines with
 * diagnostic failures. Console errors and unexpected network are surfaced (in-page recorder plus the
 * CDP event channel when the transport exposes `on`), never silently ignored.
 *
 * A mocked CDP transport can prove this primitive's protocol/ordering/error contract; it cannot prove a
 * real React self-check. The real-browser gate stays NOT_RUN until a real caller provides a session.
 */

const DEFAULT_VIEWPORT = Object.freeze({ deviceScaleFactor: 1, height: 900, width: 1440 });

export const PARITY_CAPTURE_DEFAULTS = Object.freeze({
  fixedEpochMs: 1_700_000_000_000,
  pollMs: 25,
  quietMs: 400,
  randomSeed: 0x9e3779b9,
  stableCount: 2,
  deadlineMs: 15_000,
  // R14 rendered wave: the React app rendered a loading shell as "ready" (5852-byte capture vs 84738 when
  // loaded). A page must also expose at least this much visible text before a capture is accepted.
  minLoadedTextChars: 200,
  timezone: "UTC",
  viewport: DEFAULT_VIEWPORT,
});

export class ParityCaptureError extends Error {
  constructor(code, message, diagnostics) {
    super(message);
    this.name = "ParityCaptureError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const READY_STATE_EXPRESSION = "document.readyState";

/** The readiness probe: fonts/images settled plus the in-page mutation counter for the quiet window. */
const READINESS_EXPRESSION = `(() => {
  const fontsReady = document.fonts ? document.fonts.status === "loaded" : true;
  const imagesReady = Array.from(document.images).every(
    (image) => image.complete && (image.naturalWidth > 0 || image.getAttribute("src") === ""),
  );
  const recorder = window.__parityCapture;
  return JSON.stringify({ fontsReady, imagesReady, mutations: recorder ? recorder.mutations : 0, pendingRequests: recorder ? recorder.pendingRequests : 0, readyState: document.readyState });
})()`;

/**
 * R14 rendered wave: the loaded gate. The readiness probe above only proves fonts/images settled and the DOM
 * is quiet; a loading shell satisfies that. This probe requires a real <main> with a minimum amount of
 * visible text, which a loading panel does not have.
 */
export const LOADED_EXPRESSION = `(() => {
  const main = document.querySelector("main");
  const text = ((document.body && document.body.innerText) || "").replace(/\\s+/g, " ").trim();
  return JSON.stringify({ hasMain: main !== null, textLength: text.length, title: document.title || "" });
})()`;

/** Pure judgement over the LOADED_EXPRESSION payload; exported so the gate itself is unit-pinned. */
export const isLoadedPayload = (
  payload,
  minLoadedTextChars = PARITY_CAPTURE_DEFAULTS.minLoadedTextChars,
) =>
  payload !== null &&
  typeof payload === "object" &&
  payload.hasMain === true &&
  typeof payload.textLength === "number" &&
  payload.textLength >= minLoadedTextChars;

/** Reads the in-page recorder installed by the determinism bootstrap before navigation. */
const RECORDER_EXPRESSION =
  "JSON.stringify(window.__parityCapture ?? { consoleErrors: [], mutations: 0, networkErrors: [] })";

/** Stops animations at their end state and hides carets/scrollbars for a stable pixel comparison. */
export const PARITY_CAPTURE_STYLE =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}" +
  "html{scrollbar-color:transparent transparent!important;}";

const STYLE_EXPRESSION = `(() => {
  if (!document.head) return false;
  const style = document.createElement("style");
  style.setAttribute("data-parity-capture", "hide");
  style.textContent = ${JSON.stringify(PARITY_CAPTURE_STYLE)};
  document.head.appendChild(style);
  return true;
})()`;

/**
 * Bootstrap installed with addScriptToEvaluateOnNewDocument, i.e. before the target document runs its
 * own scripts: frozen Date, seeded Math.random and an in-page recorder for console errors and failed
 * network calls. Timing primitives (performance.now/setTimeout/rAF) stay real on purpose: freezing them
 * would deadlock frame loops and animation end-states instead of removing nondeterminism.
 */
const buildDeterminismScript = ({ fixedEpochMs, randomSeed }) => `(() => {
  if (window.__parityCapture) return;
  const FIXED_NOW = ${Number(fixedEpochMs)};
  const RealDate = Date;
  // A class cannot be called without new, so Date() would throw and the page's own code/tests would
  // break. A Proxy preserves Date() (string), new Date()/new Date(...args), Date.now/parse/UTC,
  // Date.prototype and instanceof while only the no-argument form reads the frozen instant.
  const FrozenDate = new Proxy(RealDate, {
    apply(target, thisArg, args) {
      const values = args.length === 0 ? [FIXED_NOW] : args;
      return new target(...values).toString();
    },
    construct(target, args, newTarget) {
      const values = args.length === 0 ? [FIXED_NOW] : args;
      return Reflect.construct(target, values, newTarget);
    },
    get(target, property, receiver) {
      if (property === "now") return () => FIXED_NOW;
      return Reflect.get(target, property, receiver);
    },
  });
  Object.defineProperty(globalThis, "Date", { configurable: true, value: FrozenDate, writable: true });

  let seed = ${Number(randomSeed)} >>> 0;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const recorder = { consoleErrors: [], mutations: 0, networkErrors: [], pendingRequests: 0 };
  const push = (list, value) => {
    if (list.length < 50) list.push(String(value).slice(0, 500));
  };
  const originalError = console.error;
  console.error = (...args) => {
    push(recorder.consoleErrors, args.map((arg) => (arg && arg.stack) || arg).join(" "));
    return originalError.apply(console, args);
  };
  window.addEventListener("error", (event) => push(recorder.consoleErrors, event.message || String(event.error)));
  window.addEventListener("unhandledrejection", (event) => push(recorder.consoleErrors, "unhandledrejection: " + String(event.reason)));

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === "function") {
    // Readiness counts requests until their headers settle — deliberately NOT networkidle. A
    // long-lived SSE response resolves here, so a stream can never hold the capture open.
    globalThis.fetch = async (...args) => {
      const target = args[0] && args[0].url ? args[0].url : String(args[0]);
      recorder.pendingRequests += 1;
      try {
        const response = await originalFetch(...args);
        if (!response.ok) push(recorder.networkErrors, target + " -> " + response.status);
        return response;
      } catch (error) {
        push(recorder.networkErrors, target + " -> failed: " + String(error));
        throw error;
      } finally {
        recorder.pendingRequests = Math.max(0, recorder.pendingRequests - 1);
      }
    };
  }
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
    this.__parityUrl = String(url);
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function send(...args) {
    recorder.pendingRequests += 1;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      recorder.pendingRequests = Math.max(0, recorder.pendingRequests - 1);
    };
    this.addEventListener("loadend", () => {
      settle();
      if (this.status >= 400) push(recorder.networkErrors, this.__parityUrl + " -> " + this.status);
    });
    this.addEventListener("error", () => {
      settle();
      push(recorder.networkErrors, this.__parityUrl + " -> xhr error");
    });
    this.addEventListener("abort", settle);
    return originalSend.apply(this, args);
  };

  if (typeof MutationObserver === "function") {
    // documentElement can still be null when the bootstrap runs, so fall back to the document itself;
    // otherwise the quiet window would silently observe nothing.
    const target = document.documentElement ?? document;
    new MutationObserver(() => {
      recorder.mutations += 1;
    }).observe(target, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  }
  Object.defineProperty(window, "__parityCapture", { configurable: true, value: recorder });
})();`;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isFinitePositive = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const validateOptions = (options) => {
  const fail = (message) => {
    throw new ParityCaptureError("invalid_option", message);
  };
  if (!options || typeof options !== "object") fail("capture options are required");
  if (!options.cdp || typeof options.cdp.send !== "function") fail("cdp.send is required");
  if (typeof options.url !== "string" || options.url.length === 0) fail("url is required");
  const viewport = { ...DEFAULT_VIEWPORT, ...(options.viewport ?? {}) };
  for (const key of ["width", "height", "deviceScaleFactor"]) {
    if (!isPositiveInteger(viewport[key])) fail(`viewport.${key} must be a positive integer`);
  }
  if (typeof (options.timezone ?? PARITY_CAPTURE_DEFAULTS.timezone) !== "string")
    fail("timezone must be a string");
  for (const key of ["deadlineMs", "pollMs", "quietMs"]) {
    if (!isFinitePositive(options[key] ?? PARITY_CAPTURE_DEFAULTS[key]))
      fail(`${key} must be a finite positive number`);
  }
  const stableCount = options.stableCount ?? PARITY_CAPTURE_DEFAULTS.stableCount;
  if (!isPositiveInteger(stableCount) || stableCount < 2)
    fail("stableCount must be an integer >= 2");
  const minLoadedTextChars =
    options.minLoadedTextChars ?? PARITY_CAPTURE_DEFAULTS.minLoadedTextChars;
  if (!isPositiveInteger(minLoadedTextChars)) fail("minLoadedTextChars must be a positive integer");
  return {
    minLoadedTextChars,
    deadlineMs: options.deadlineMs ?? PARITY_CAPTURE_DEFAULTS.deadlineMs,
    fixedEpochMs: options.fixedEpochMs ?? PARITY_CAPTURE_DEFAULTS.fixedEpochMs,
    pollMs: options.pollMs ?? PARITY_CAPTURE_DEFAULTS.pollMs,
    quietMs: options.quietMs ?? PARITY_CAPTURE_DEFAULTS.quietMs,
    randomSeed: options.randomSeed ?? PARITY_CAPTURE_DEFAULTS.randomSeed,
    stableCount,
    timezone: options.timezone ?? PARITY_CAPTURE_DEFAULTS.timezone,
    viewport,
  };
};

const evaluateValue = async (send, expression) => {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true });
  return response?.result?.value;
};

const readJson = async (send, expression) => {
  const value = await evaluateValue(send, expression);
  if (typeof value !== "string")
    throw new ParityCaptureError("capture_protocol", "evaluate returned no string payload");
  try {
    return JSON.parse(value);
  } catch {
    throw new ParityCaptureError("capture_protocol", "evaluate returned invalid JSON");
  }
};

const subscribeEvents = (cdp) => {
  const consoleErrors = [];
  const networkErrors = [];
  if (typeof cdp.on !== "function") {
    return { channel: "unavailable", consoleErrors, networkErrors, dispose: () => undefined };
  }
  const unsubscribers = [
    cdp.on("Runtime.exceptionThrown", (params) => {
      const text =
        params?.exceptionDetails?.text ??
        params?.exceptionDetails?.exception?.description ??
        "exception";
      consoleErrors.push(String(text).slice(0, 500));
    }),
    cdp.on("Log.entryAdded", (params) => {
      if (params?.entry?.level === "error")
        consoleErrors.push(String(params.entry.text ?? "error").slice(0, 500));
    }),
    cdp.on("Network.loadingFailed", (params) => {
      networkErrors.push(String(params?.errorText ?? "network failure").slice(0, 500));
    }),
    cdp.on("Network.responseReceived", (params) => {
      const status = Number(params?.response?.status ?? 0);
      if (status >= 400)
        networkErrors.push(`${String(params.response.url ?? "response")} -> ${status}`);
    }),
  ];
  return {
    channel: "subscribed",
    consoleErrors,
    networkErrors,
    dispose: () => {
      for (const unsubscribe of unsubscribers) {
        try {
          if (typeof unsubscribe === "function") unsubscribe();
        } catch {
          // Unsubscribing is best effort; capture results must not depend on transport teardown.
        }
      }
    },
  };
};

/**
 * Captures the given page through the caller-owned CDP transport.
 * @returns {Promise<object>} exact PNG bytes, sha256/byte metadata, timings and surfaced issues.
 */
export const captureParityScreenshot = async (options) => {
  const config = validateOptions(options);
  const { cdp } = options;
  const sessionId = options.sessionId;
  const url = options.url;
  const startedAt = Date.now();
  const events = subscribeEvents(cdp);
  const deadlineAt = startedAt + config.deadlineMs;
  const remaining = () => deadlineAt - Date.now();
  // Every transport call is bounded by the remaining deadline: a hung CDP send (including a hung
  // precondition) must fail the capture instead of parking it forever. The timer is always cleared.
  const sendBounded = async (method, params = {}) => {
    const budget = remaining();
    if (budget <= 0) {
      throw new ParityCaptureError(
        "capture_timeout",
        `the capture deadline expired before ${method}`,
        { method, phase },
      );
    }
    let timer = null;
    try {
      return await Promise.race([
        cdp.send(method, params, sessionId),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            reject(
              new ParityCaptureError(
                "capture_timeout",
                `CDP send exceeded the remaining deadline: ${method}`,
                {
                  method,
                  phase,
                },
              ),
            );
          }, budget);
        }),
      ]);
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  };
  let phase = "preconditions";
  try {
    await sendBounded("Page.enable");
    // Without these domains the Runtime/Log/Network event channel never delivers, so console and
    // unexpected-network failures would look clean; cache is disabled for deterministic bytes.
    await sendBounded("Runtime.enable");
    await sendBounded("Log.enable");
    await sendBounded("Network.enable");
    await sendBounded("Network.setCacheDisabled", { cacheDisabled: true });
    await sendBounded("Emulation.setDeviceMetricsOverride", { ...config.viewport, mobile: false });
    await sendBounded("Emulation.setTimezoneOverride", { timezoneId: config.timezone });
    await sendBounded("Page.addScriptToEvaluateOnNewDocument", {
      source: buildDeterminismScript(config),
    });

    phase = "navigation";
    const navigationStarted = Date.now();
    await sendBounded("Page.navigate", { url });
    for (;;) {
      if ((await evaluateValue(sendBounded, READY_STATE_EXPRESSION)) === "complete") break;
      if (remaining() <= 0) {
        throw new ParityCaptureError(
          "capture_timeout",
          "navigation did not complete before the deadline",
          {
            phase,
            url,
          },
        );
      }
      await sleep(config.pollMs);
    }
    const navigationMs = Date.now() - navigationStarted;

    phase = "hide";
    await evaluateValue(sendBounded, STYLE_EXPRESSION);

    phase = "loaded";
    const loadedStarted = Date.now();
    let loadedPayload;
    for (;;) {
      loadedPayload = await readJson(sendBounded, LOADED_EXPRESSION);
      if (isLoadedPayload(loadedPayload, config.minLoadedTextChars)) break;
      if (remaining() <= 0) {
        throw new ParityCaptureError(
          "capture_not_loaded",
          `page content did not reach the loaded gate (${String(config.minLoadedTextChars)} visible characters) before the deadline`,
          { phase, loaded: loadedPayload, minLoadedTextChars: config.minLoadedTextChars },
        );
      }
      await sleep(config.pollMs);
    }
    const loadedMs = Date.now() - loadedStarted;

    phase = "readiness";
    const readinessStarted = Date.now();
    let quietSince = null;
    let lastMutations = null;
    for (;;) {
      const ready = await readJson(sendBounded, READINESS_EXPRESSION);
      if (
        ready.readyState === "complete" &&
        ready.fontsReady === true &&
        ready.imagesReady === true &&
        ready.pendingRequests === 0
      ) {
        if (lastMutations === null || ready.mutations !== lastMutations) {
          lastMutations = ready.mutations;
          quietSince = Date.now();
        } else if (Date.now() - quietSince >= config.quietMs) {
          break;
        }
      } else {
        quietSince = null;
        lastMutations = null;
      }
      if (remaining() <= 0) {
        throw new ParityCaptureError(
          "capture_timeout",
          "page did not reach font/image readiness and DOM quiet before the deadline",
          {
            phase,
            readiness: {
              fontsReady: ready.fontsReady === true,
              imagesReady: ready.imagesReady === true,
              mutations: ready.mutations,
              pendingRequests: ready.pendingRequests,
            },
          },
        );
      }
      await sleep(config.pollMs);
    }
    const readinessMs = Date.now() - readinessStarted;

    phase = "stability";
    const stabilityStarted = Date.now();
    let previous = null;
    let consecutive = 0;
    let screenshots = 0;
    let lastBytes = Buffer.alloc(0);
    for (;;) {
      // Report the stability phase's own diagnostic when the deadline has been consumed, instead of
      // surfacing a transport-timeout code for a capture that merely never stabilised.
      if (screenshots > 0 && remaining() <= 0) {
        throw new ParityCaptureError(
          "capture_unstable",
          `screenshots did not become byte-identical ${config.stableCount} times before the deadline`,
          { phase, screenshots, stableCount: config.stableCount, lastSha256: sha256(lastBytes) },
        );
      }
      const response = await sendBounded("Page.captureScreenshot", {
        captureBeyondViewport: false,
        format: "png",
        fromSurface: true,
      });
      const bytes = Buffer.from(String(response?.data ?? ""), "base64");
      if (bytes.length === 0)
        throw new ParityCaptureError("capture_protocol", "captureScreenshot returned no bytes");
      screenshots += 1;
      lastBytes = bytes;
      if (previous !== null && bytes.equals(previous)) {
        consecutive += 1;
      } else {
        consecutive = 1;
      }
      previous = bytes;
      if (consecutive >= config.stableCount) break;
      if (remaining() <= 0) {
        throw new ParityCaptureError(
          "capture_unstable",
          `screenshots did not become byte-identical ${config.stableCount} times before the deadline`,
          { phase, screenshots, stableCount: config.stableCount, lastSha256: sha256(bytes) },
        );
      }
      await sleep(config.pollMs);
    }
    const stabilityMs = Date.now() - stabilityStarted;

    phase = "recorder";
    const recorder = await readJson(sendBounded, RECORDER_EXPRESSION);
    const consoleErrors = [
      ...new Set([
        ...(Array.isArray(recorder.consoleErrors) ? recorder.consoleErrors : []),
        ...events.consoleErrors,
      ]),
    ];
    const networkErrors = [
      ...new Set([
        ...(Array.isArray(recorder.networkErrors) ? recorder.networkErrors : []),
        ...events.networkErrors,
      ]),
    ];
    const png = lastBytes;
    return {
      bytes: png.length,
      clean:
        consoleErrors.length === 0 && networkErrors.length === 0 && events.channel === "subscribed",
      clock: { fixedEpochMs: config.fixedEpochMs, randomSeed: config.randomSeed },
      consoleErrors,
      events: { channel: events.channel, complete: events.channel === "subscribed" },
      networkErrors,
      png,
      screenshots,
      sha256: sha256(png),
      stable: true,
      stableCount: config.stableCount,
      timezone: config.timezone,
      timings: {
        loadedMs,
        navigationMs,
        quietMs: config.quietMs,
        readinessMs,
        stabilityMs,
        totalMs: Date.now() - startedAt,
      },
      url,
      viewport: { ...config.viewport },
    };
  } finally {
    events.dispose();
  }
};

/** Every surfaced capture problem, for a caller that must fail a gate instead of reading past issues. */
export const captureIssues = (result) => {
  const issues = [];
  for (const line of result?.consoleErrors ?? []) issues.push(`console: ${line}`);
  for (const line of result?.networkErrors ?? []) issues.push(`network: ${line}`);
  if (result?.events?.channel !== "subscribed") {
    issues.push("event channel unavailable: console/network events may be incomplete");
  }
  return issues;
};

const sleep = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
