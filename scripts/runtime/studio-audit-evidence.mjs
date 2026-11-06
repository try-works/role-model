/**
 * S286 (goal 235): bounded, redacted collector for the packaged Studio gate failure.
 *
 * Pure collector/classifier/formatter only — no browser, no CLI, no second audit. The existing
 * scripts/runtime/audit-rendered-ui.mjs feeds its own CDP Network/Page events into
 * createStudioCollector and prints the formatted evidence during the IDENTICAL gate sequence
 * (same routes, sweeps, timings and click order).
 *
 * Never captured: response bodies, prompt/message content, auth headers, tokens. Classification is
 * evidence, not a root-cause claim.
 */

export const STUDIO_CHAT_PATH = "/v1/chat/completions";
export const CATALOGUE_PATH = "/api/role-model/models";
export const DEFAULT_REQUEST_CAP = 100;
export const PAGE_EVENT_CAP = 30;
export const CATALOGUE_CAP = 20;

const pathnameOf = (value) => {
  try {
    return new URL(String(value)).pathname;
  } catch {
    return String(value);
  }
};

/** Whitelisted body summary: model/stream/messageCount only. Never prompt, messages or auth. */
export const summarizeStudioBody = (postData) => {
  const empty = { messageCount: null, model: null, stream: null };
  if (typeof postData !== "string" || postData.trim().length === 0) return empty;
  let body;
  try {
    body = JSON.parse(postData);
  } catch {
    return { ...empty, unparsable: true };
  }
  if (body === null || typeof body !== "object") return { ...empty, unparsable: true };
  return {
    messageCount: Array.isArray(body.messages) ? body.messages.length : null,
    model: typeof body.model === "string" ? body.model : null,
    stream: typeof body.stream === "boolean" ? body.stream : null,
  };
};

export const createStudioCollector = ({
  now = Date.now,
  requestCap = DEFAULT_REQUEST_CAP,
} = {}) => {
  const startedAt = now();
  const studioRequests = [];
  const pageEvents = [];
  const phases = [];
  let currentPhase = "unknown";
  const catalogues = [];
  let catalogueTotal = 0;
  let catalogueDropped = 0;
  let enabledAtMs;
  let dropped = 0;
  const elapsed = () => Math.max(0, now() - startedAt);
  const find = (requestId) =>
    studioRequests.find((entry) => entry.requestId === requestId) ??
    catalogues.find((entry) => entry.requestId === requestId);
  const handle = (method, params = {}) => {
    if (method === "Network.enable") {
      enabledAtMs = elapsed();
      return;
    }
    if (method === "StudioPhase") {
      currentPhase = String(params.phase ?? "unknown");
      phases.push({ elapsedMs: elapsed(), phase: currentPhase });
      return;
    }
    if (method === "Page.frameNavigated" || method === "Page.loadEventFired") {
      if (pageEvents.length < PAGE_EVENT_CAP) {
        pageEvents.push({
          elapsedMs: elapsed(),
          method,
          url:
            method === "Page.frameNavigated"
              ? String(params.frame?.url ?? "").slice(0, 200)
              : undefined,
        });
      }
      return;
    }
    if (method === "Network.requestWillBeSent") {
      const request = params.request ?? {};
      const requestId = String(params.requestId ?? "");
      const pathname = pathnameOf(request.url);
      if (request.method === "POST" && pathname === STUDIO_CHAT_PATH) {
        if (studioRequests.length >= requestCap) {
          dropped += 1;
          return;
        }
        studioRequests.push({
          body: summarizeStudioBody(request.postData),
          durationMs: undefined,
          failure: undefined,
          finishedElapsedMs: undefined,
          method: "POST",
          path: pathname,
          phase: currentPhase,
          requestId,
          startElapsedMs: elapsed(),
          status: undefined,
        });
        return;
      }
      if (request.method === "GET" && pathname === CATALOGUE_PATH) {
        catalogueTotal += 1;
        catalogues.push({
          durationMs: undefined,
          finishedElapsedMs: undefined,
          method: "GET",
          path: pathname,
          phase: currentPhase,
          requestId,
          startElapsedMs: elapsed(),
          status: undefined,
        });
        if (catalogues.length > CATALOGUE_CAP) {
          catalogues.shift();
          catalogueDropped += 1;
        }
      }
      return;
    }
    if (method === "Network.responseReceived") {
      const entry = find(String(params.requestId ?? ""));
      if (entry) entry.status = Number(params.response?.status ?? 0);
      return;
    }
    if (method === "Network.loadingFinished" || method === "Network.loadingFailed") {
      const entry = find(String(params.requestId ?? ""));
      if (entry) {
        entry.finishedElapsedMs = elapsed();
        entry.durationMs = entry.finishedElapsedMs - entry.startElapsedMs;
        if (method === "Network.loadingFailed")
          entry.failure = String(params.errorText ?? "failed").slice(0, 120);
      }
    }
  };
  return {
    catalogueDropped: () => catalogueDropped,
    catalogueRequest: () =>
      catalogues.length === 0 ? undefined : { ...catalogues[catalogues.length - 1] },
    catalogues: () => catalogues.map((entry) => ({ ...entry })),
    catalogueTotal: () => catalogueTotal,
    dropped: () => dropped,
    enabledAtMs: () => enabledAtMs,
    evidence: () => ({
      catalogue: catalogues.length === 0 ? undefined : { ...catalogues[catalogues.length - 1] },
      catalogueDropped,
      catalogues: catalogues.map((entry) => ({ ...entry })),
      catalogueTotal,
      dropped,
      enabledAtMs,
      pageEvents: pageEvents.slice(),
      phases: phases.slice(),
      studioRequests: studioRequests.map((entry) => ({ ...entry, body: { ...entry.body } })),
    }),
    handle,
    phase: (name) => handle("StudioPhase", { phase: name }),
    studioRequests: () => studioRequests.map((entry) => ({ ...entry, body: { ...entry.body } })),
  };
};

/** Safe classification. "unknown" is a legitimate result; this is not a root-cause declaration. */
export const classifyStudioOutcome = ({ entry, buttonDisabledAtClick, rawStateAtEnd }) => {
  if (entry === undefined) return buttonDisabledAtClick ? "no-post-disabled" : "no-post";
  if (entry.failure !== undefined) return "failed";
  if (entry.status === undefined || entry.status === null) return "in-flight";
  if (entry.status >= 400) return "http-error";
  if (entry.status >= 200 && entry.status < 300)
    return rawStateAtEnd === "success" ? "applied" : "responded-unapplied";
  return "unknown";
};

export const formatStudioEvidence = ({ evidence, click = {}, outcome, maxLines = 30 }) => {
  const header = [
    `studio-evidence: enabledAtMs=${String(evidence.enabledAtMs ?? "n/a")} phases=${evidence.phases.map((entry) => entry.phase).join(",")} requests=${String(evidence.studioRequests.length)} dropped=${String(evidence.dropped)} catalogueTotal=${String(evidence.catalogueTotal ?? 0)} catalogueDropped=${String(evidence.catalogueDropped ?? 0)}`,
  ];
  const catalogue = evidence.catalogue;
  header.push(
    catalogue === undefined
      ? `catalogue GET ${CATALOGUE_PATH} not observed`
      : `catalogue GET ${catalogue.path} latest phase=${String(catalogue.phase)} status=${String(catalogue.status)} start=${String(catalogue.startElapsedMs)}ms duration=${String(catalogue.durationMs ?? "n/a")}ms count=${String((evidence.catalogues ?? []).length)}`,
  );
  const requestLines = evidence.studioRequests.map(
    (entry) =>
      `studio POST ${entry.path} phase=${entry.phase} model=${
        entry.body.model === null || entry.body.model === undefined
          ? "unavailable"
          : String(entry.body.model)
      } stream=${String(entry.body.stream)} messages=${String(entry.body.messageCount)} start=${String(entry.startElapsedMs)}ms status=${String(entry.status)} duration=${String(entry.durationMs ?? "n/a")}ms${entry.failure === undefined ? "" : ` failure=${entry.failure}`}`,
  );
  // Click and outcome are reserved: a long request list may drop request lines, never the verdict.
  const tail = [
    `click: buttonDisabled=${String(click.buttonDisabled)} rawAtClick=${String(click.rawAtClick)} errorAtClick=${String(click.errorAtClick ?? "none")} samePathname=${String(click.navigatedSameUrl)} selectedModelDom=${String(click.selectedModelDom)} clickedAt=${String(click.clickedAt)}`,
    "note: modelStateInferred=false (selectedModelDom is the DOM field, not readback status)",
    `outcome: ${String(outcome)}`,
  ];
  const budget = Math.max(0, maxLines - header.length - tail.length);
  return [...header, ...requestLines.slice(0, budget), ...tail];
};
