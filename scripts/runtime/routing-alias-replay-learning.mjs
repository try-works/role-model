#!/usr/bin/env node
/**
 * S613: real-alias + replay/queue + learning-pack verification on the packaged build.
 *
 * Extends the live-credential pattern: a fresh per-run copy of the isolated credential state boots the
 * packaged artifact on loopback 3462, the harness sends ONE taxonomy-scoped chat through the REAL alias
 * the production config declares for the remote-only baseline posture, and then reports what the host
 * actually did with the request in the replay queue and the learning surface. Replay/learning presence is
 * recorded as a FINDING, never forced: not-queued/absent must be reported with the observed reason instead
 * of being turned into a pass.
 *
 * What it does:
 *   1. verifies the artifact manifest/sha against --expect-version and boots it with an isolated COPY of
 *      D:/DEV/rm-clean/live-state2 (the source state is metadata-signature checked before/after and never
 *      read for content; the per-run copy is deleted; credential bytes and authorization headers never
 *      reach the log - every captured line/body is redacted);
 *   2. enumerates /v1/models and /api/role-model/models and selects the served alias matching
 *      baseline.remote-only (or the exact declared remote-only baseline alias), plus the researcher posture
 *      scope declared in the live runtime config readback;
 *   3. sends POST /v1/chat/completions through that alias with a declared role_model taxonomy intent
 *      (researcher / a canonical researcher task) with no token budget;
 *   4. asserts HTTP 200, a real remote completion (content + usage.total_tokens > 0) and a routing decision
 *      with providerId=deepseek, sourceType=remote, finishReason=stop; captures the full decision row and
 *      the request observation's routing diagnostics;
 *   5. queries /api/role-model/operator/replay/jobs and /api/role-model/operator/learning (+ records and
 *      history when exposed) and reports HONESTLY whether the request entered the replay queue (job id) or
 *      not (with the recorded reason, if any), and whether a learning pack covers the (role, task) scope.
 *
 * Usage:
 *   node scripts/runtime/routing-alias-replay-learning.mjs
 *   node scripts/runtime/routing-alias-replay-learning.mjs --state-source <dir> --port 3462 \
 *     --expect-version 0.0.20-471-g2e4aca6b [--alias baseline.remote-only] [--role researcher]
 *
 * Exit: 0 routing assertions passed and replay/learning findings recorded; 1 a routing assertion failed;
 *       2 NOT RUN (bad inputs / busy port / unhealthy host).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutRoot = path.resolve(__dirname, "../..");

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};

const head = (() => {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: checkoutRoot,
    encoding: "utf8",
  });
  return result.status === 0 ? String(result.stdout).trim() : "unknown";
})();

const exe = path.resolve(
  value("--exe") ??
    path.join(
      checkoutRoot,
      "role-model-router",
      "dist",
      "release",
      "win32-x64",
      "role-model-dev.exe",
    ),
);
const stateSource = path.resolve(value("--state-source") ?? "D:/DEV/rm-clean/live-state2");
const port = Number(value("--port") ?? 3462);
const expectedVersion = value("--expect-version") ?? "0.0.20-471-g2e4aca6b";
const aliasPreference = value("--alias") ?? "baseline.remote-only";
const roleId = value("--role") ?? "researcher";
const healthBudgetMs = Number(process.env.ROUTING_LIVE_HEALTH_TIMEOUT_MS ?? 240_000);
const logPath = path.resolve(
  value("--log") ??
    path.join(
      checkoutRoot,
      ".recursive",
      "run",
      "115-effect-foldkit-runtime-migration",
      "evidence",
      "logs",
      `routing-alias-replay-learning-${head}.log`,
    ),
);

const lines = [];
const record = (line = "") => {
  lines.push(line);
  console.log(line);
};
const truncate = (text, limit = 6000) =>
  text.length <= limit ? text : `${text.slice(0, limit)}…(${String(text.length)} bytes)`;
const redact = (text) =>
  String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(sk-[A-Za-z0-9_-]{4,})/g, "[REDACTED_API_KEY]")
    .replace(/("?api[-_]?key"?\s*[:=]\s*)("[^"]*"|[^\s,;}]+)/gi, "$1[REDACTED]")
    .replace(/(authorization"?\s*[:=]\s*)("[^"]*"|[^\s,;}]+)/gi, "$1[REDACTED]");

const failures = [];
const checks = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    checks.push({ name, status: "PASS", detail });
    record(`PASS ${name}: ${redact(String(detail))}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, status: "FAIL", detail });
    failures.push(`${name}: ${detail}`);
    record(`FAIL ${name}: ${redact(detail)}`);
  }
};
const finishLog = () => {
  try {
    mkdirSync(path.dirname(logPath), { recursive: true });
    writeFileSync(logPath, `${redact(lines.join("\n"))}\n`, "utf8");
    console.log(`log=${logPath}`);
  } catch (error) {
    console.log(
      `could not write evidence log: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
const notRun = (message) => {
  record(`NOT RUN: ${message}`);
  finishLog();
  process.exit(2);
};

/** Metadata-only signature (relative path + size). Never reads file contents. */
const treeSignature = (root) => {
  const entries = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const nextRel = rel.length === 0 ? entry.name : `${rel}/${entry.name}`;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, nextRel);
      else if (entry.isFile()) entries.push(`${nextRel}\t${String(statSync(full).size)}`);
    }
  };
  walk(root, "");
  return entries.sort().join("\n");
};

/** Finds the first object in a JSON tree with the requested key/value pair. */
const findObject = (value, predicate, depth = 0) => {
  if (depth > 12 || value === null || typeof value !== "object") return undefined;
  if (!Array.isArray(value) && predicate(value)) return value;
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findObject(child, predicate, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
};

/** Collects every path whose object mentions a pack/candidate marker for the given scope. */
const findScopeMentions = (value, needles, prefix = "", out = [], depth = 0) => {
  if (out.length >= 20 || depth > 12 || value === null || typeof value !== "object") return out;
  if (!Array.isArray(value)) {
    const text = JSON.stringify(value);
    if (needles.every((needle) => text.includes(needle))) out.push({ path: prefix, value });
  }
  for (const [key, child] of Object.entries(Array.isArray(value) ? { "[]": value } : value)) {
    findScopeMentions(
      child,
      needles,
      prefix.length === 0 ? key : `${prefix}.${key}`,
      out,
      depth + 1,
    );
  }
  return out;
};

// ---- preflight -------------------------------------------------------------------------------
record("# S613 real-alias + replay/learning verification");
record(`head=${head}`);
record(`exe=${exe}`);
record(`state_source=${stateSource}`);
record(`port=${String(port)}`);
record(`expect_version=${expectedVersion}`);
record(`requested_alias=${aliasPreference} role=${roleId}`);
record(`started_at=${new Date().toISOString()}`);
record("");
if (!existsSync(exe)) notRun(`packaged executable not found: ${exe}`);
if (!existsSync(stateSource)) notRun(`credential state source not found: ${stateSource}`);
if (!Number.isInteger(port) || port < 1 || port > 65535) notRun("invalid --port");
const exeSha256 = createHash("sha256").update(readFileSync(exe)).digest("hex");
record(`exe_sha256=${exeSha256}`);
const manifestPath = path.join(path.dirname(exe), "manifest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  record(`manifest_version=${String(manifest?.version ?? "unknown")}`);
  record(`manifest_sha256=${String(manifest?.executable_sha256 ?? manifest?.sha256 ?? "missing")}`);
  if (expectedVersion !== undefined && manifest?.version !== expectedVersion) {
    notRun(
      `manifest version ${String(manifest?.version)} does not match --expect-version ${expectedVersion}`,
    );
  }
} else {
  record(`manifest=missing (${manifestPath})`);
}
const taxonomyRoot = path.join(
  checkoutRoot,
  "role-model-router",
  "packages",
  "core",
  "data",
  "taxonomy",
);
const taxonomyManifest = JSON.parse(readFileSync(path.join(taxonomyRoot, "manifest.json"), "utf8"));
const taskTypes = JSON.parse(readFileSync(path.join(taxonomyRoot, "task-types.json"), "utf8"));
const researcherTask = Array.isArray(taskTypes)
  ? taskTypes.find((task) => task?.primaryRole === roleId)
  : undefined;
if (researcherTask === undefined) notRun(`no canonical ${roleId} task in the taxonomy data`);
record(
  `taxonomy_version=${String(taxonomyManifest.taxonomyVersion)} classification_contract_version=${String(taxonomyManifest.classificationContractVersion)}`,
);
record(`selected_task_type=${String(researcherTask.id)} role=${roleId}`);
record("");

const portFree = async (candidate) => {
  const server = net.createServer();
  const free = await new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(candidate, "127.0.0.1", () => server.close(() => resolve(true)));
  });
  return free;
};
if (!(await portFree(port)))
  notRun(`port ${String(port)} is already in use; refusing to measure another process`);

// ---- per-run credential-state copy -----------------------------------------------------------
const sourceBefore = treeSignature(stateSource);
record(
  `state_source_signature_sha256=${createHash("sha256").update(sourceBefore).digest("hex")} files=${String(sourceBefore.split("\n").filter(Boolean).length)}`,
);
const stateCopy = mkdtempSync(path.join(os.tmpdir(), "routing-alias-"));
const copiedState = path.join(stateCopy, "state");
cpSync(stateSource, copiedState, { recursive: true });
const staleKeyLifecycle = path.join(
  copiedState,
  "standalone-runtime-dev",
  "track-b",
  "key-lifecycle.json",
);
if (existsSync(staleKeyLifecycle)) {
  rmSync(staleKeyLifecycle, { force: true });
  record(
    "copied_key_lifecycle_reset=true (path-scoped Track B key rows are re-minted under the copy root)",
  );
}
record(`state_copy=${copiedState}`);
record("");

// ---- launch ---------------------------------------------------------------------------------
const childArgs = [
  "--repo-root",
  path.dirname(exe),
  "--runtime-state-root",
  copiedState,
  "--host",
  "127.0.0.1",
  "--port",
  String(port),
];
record(`spawn: ${exe} ${childArgs.join(" ")}`);
const child = spawn(exe, childArgs, { stdio: ["ignore", "pipe", "pipe"] });
let childExited = null;
child.once("exit", (code, signal) => {
  childExited = { code, signal };
  record(`[host] exited code=${String(code)} signal=${String(signal)}`);
});
child.stdout.on("data", (chunk) => {
  for (const line of String(chunk)
    .split("\n")
    .filter((entry) => entry.trim().length > 0))
    record(`[host] ${redact(line)}`);
});
child.stderr.on("data", (chunk) => {
  for (const line of String(chunk)
    .split("\n")
    .filter((entry) => entry.trim().length > 0))
    record(`[host:err] ${redact(line)}`);
});

const base = `http://127.0.0.1:${String(port)}`;
const call = async (method, pathname, body, headers = {}) => {
  const response = await fetch(base + pathname, {
    method,
    headers: {
      connection: "close",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  record(`HTTP ${method} ${pathname} -> ${String(response.status)}`);
  if (body !== undefined) record(`  request_body=${redact(truncate(JSON.stringify(body)))}`);
  record(`  response_body=${redact(truncate(text))}`);
  return { status: response.status, body: parsed, text };
};

const waitForHealth = async () => {
  const deadline = Date.now() + healthBudgetMs;
  while (Date.now() < deadline) {
    if (childExited !== null)
      return {
        ok: false,
        reason: `host exited before health (code ${String(childExited.code)})`,
      };
    try {
      const response = await fetch(`${base}/healthz`, { headers: { connection: "close" } });
      if (response.ok) {
        const body = await response.json();
        record(`healthz=${redact(truncate(JSON.stringify(body), 4000))}`);
        return { ok: true, body };
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return {
    ok: false,
    reason: `health did not become ready within ${String(healthBudgetMs)}ms`,
  };
};

const shutdown = async () => {
  if (childExited !== null) return;
  child.kill();
  const exited = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 10_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  if (exited) {
    record("[host] graceful shutdown acknowledged");
    return;
  }
  record("[host] graceful shutdown timed out; escalating");
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(child.pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
};

let replayFinding = "NOT CHECKED";
let learningFinding = "NOT CHECKED";
const runStartedAtMs = Date.now();
try {
  const health = await waitForHealth();
  if (!health.ok) {
    record("");
    record(`NOT RUN: ${health.reason}`);
    await shutdown();
    try {
      rmSync(stateCopy, { force: true, recursive: true });
      record("state_copy_removed=true");
    } catch {
      record("state_copy_removed=false");
    }
    finishLog();
    process.exit(2);
  }
  await check("health", () => {
    if (String(health.body?.status) !== "healthy")
      throw new Error(`health status ${String(health.body?.status)}`);
    const servedVersion = health.body?.runtime?.version;
    if (expectedVersion !== undefined && servedVersion !== expectedVersion) {
      throw new Error(
        `health version ${String(servedVersion)} does not match --expect-version ${expectedVersion}`,
      );
    }
    return `healthy ${String(servedVersion)}`;
  });

  // ---- discovery: served aliases, runtime config posture, learning/replay baseline ------------
  record("");
  record("## Discovery");
  const v1Models = await call("GET", "/v1/models");
  const servedIds = Array.isArray(v1Models.body?.data)
    ? v1Models.body.data
        .map((entry) =>
          entry !== null && typeof entry === "object" && typeof entry.id === "string"
            ? entry.id
            : "",
        )
        .filter(Boolean)
    : [];
  record(`served_model_ids=${JSON.stringify(servedIds)}`);
  const modelsReadback = await call("GET", "/api/role-model/models");
  const aliasRows = Array.isArray(modelsReadback.body)
    ? modelsReadback.body
    : Array.isArray(modelsReadback.body?.data)
      ? modelsReadback.body.data
      : [];
  record(
    `role_model_models=${JSON.stringify(
      aliasRows.map((row) => ({
        id: row?.id,
        role_model: row?.role_model?.type,
        routing_mode: row?.role_model?.routing_mode,
      })),
    )}`,
  );
  const routerConfig = await call("GET", "/api/role-model/router/config");
  const runtimeConfig = await call("GET", "/api/role-model/runtime/config");
  // The alias ids are declared in the runtime config readback (model_aliases), not in the
  // /api/role-model/models record list, so read them where they actually live.
  // /router/config answers the posture view and /runtime/config answers the applied config; the alias
  // declarations live in the latter, so search both instead of stopping at the first defined body.
  const aliasContainer =
    findObject(
      routerConfig.body,
      (candidate) =>
        candidate?.model_aliases !== undefined || candidate?.modelAliases !== undefined,
    ) ??
    findObject(
      runtimeConfig.body,
      (candidate) =>
        candidate?.model_aliases !== undefined || candidate?.modelAliases !== undefined,
    );
  const aliasValue = aliasContainer?.model_aliases ?? aliasContainer?.modelAliases;
  // The readback exposes modelAliases as an ARRAY of {aliasId, mode, modelIds}; the runtime-config YAML
  // shape is a map. Accept both so the "declared" half of the assertion is real, not guessed.
  const declaredAliasIds =
    aliasValue === undefined
      ? []
      : Array.isArray(aliasValue)
        ? aliasValue
            .map((entry) => entry?.aliasId ?? entry?.id)
            .filter((id) => typeof id === "string")
        : Object.keys(aliasValue);
  const declaredTaskAliases = declaredAliasIds.filter((id) => /remote-only/.test(id));
  record(`declared_alias_ids=${JSON.stringify(declaredAliasIds)}`);
  record(`declared_remote_only_alias_ids=${JSON.stringify(declaredTaskAliases)}`);
  const learningBefore = await call("GET", "/api/role-model/operator/learning");
  const replayBefore = await call("GET", "/api/role-model/operator/replay/jobs");
  const posture = findObject(
    routerConfig.body ?? runtimeConfig.body,
    (candidate) => candidate?.role_id === roleId || candidate?.roleId === roleId,
  );
  record(`posture_scope=${JSON.stringify(posture ?? null)}`);
  record(
    `replay_jobs_before=${String(
      Array.isArray(replayBefore.body)
        ? replayBefore.body.length
        : (replayBefore.body?.jobs?.length ?? "unknown"),
    )}`,
  );

  // ---- assertion: alias chosen from the DECLARED readback, not guessed ------------------------
  let chosenAlias = aliasPreference;
  await check("declared remote-only baseline alias is served", async () => {
    const recordIds = aliasRows.map((row) => row?.id).filter((id) => typeof id === "string");
    const candidates = [...new Set([...declaredAliasIds, ...recordIds, ...servedIds])];
    const exact = candidates.find((id) => id === aliasPreference);
    const fallback = candidates.find((id) => /remote-only/.test(id));
    if (exact === undefined && fallback === undefined) {
      throw new Error(
        `no remote-only alias is declared or served; candidates=${JSON.stringify(candidates.slice(0, 60))}`,
      );
    }
    chosenAlias = exact ?? fallback;
    if (!servedIds.includes(chosenAlias))
      throw new Error(`alias ${chosenAlias} is declared but /v1/models does not serve it`);
    return `${chosenAlias} (declared=${String(declaredAliasIds.includes(chosenAlias))}, served=true)`;
  });
  record(`chosen_alias=${chosenAlias}`);
  record(`chosen_posture_role=${String(posture?.role_id ?? posture?.roleId ?? roleId)}`);
  record("");

  // ---- taxonomy-scoped request ----------------------------------------------------------------
  const finalRequestId = `routing-alias-${String(Date.now())}`;
  record("## Taxonomy-scoped chat");
  let observationRequestId;
  await check("POST /v1/chat/completions returns a real remote completion", async () => {
    // No token budget: the owner removed the cap (including the reasoning-arm truncation retry that
    // only existed because a fixed budget could be consumed before the visible answer).
    const result = await call(
      "POST",
      "/v1/chat/completions",
      {
        model: chosenAlias,
        messages: [
          {
            role: "system",
            content: `Taxonomy posture: ${roleId}/${String(researcherTask.id)}, remote-only execution.`,
          },
          {
            role: "user",
            content:
              "Name one primary source domain for EU AI Act updates. Answer in one sentence.",
          },
        ],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: taxonomyManifest.taxonomyVersion,
            classification_contract_version: taxonomyManifest.classificationContractVersion,
            requested_role_id: roleId,
            task_type: String(researcherTask.id),
            source: "operator_ui",
            confidence: 0.9,
          },
        },
      },
      { "x-request-id": finalRequestId, "x-role-model-requested-role-id": roleId },
    );
    if (result.status !== 200)
      throw new Error(`chat HTTP ${String(result.status)}: ${redact(truncate(result.text, 600))}`);
    const body = result.body;
    if (body?.object !== "chat.completion") throw new Error(`object ${String(body?.object)}`);
    const choice = body?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0)
      throw new Error("assistant content is empty");
    if (typeof body?.usage?.total_tokens !== "number" || body.usage.total_tokens <= 0)
      throw new Error(`usage.total_tokens is ${String(body?.usage?.total_tokens)}`);
    if (choice?.finish_reason !== "stop")
      throw new Error(`finish_reason ${String(choice?.finish_reason)}`);
    if (typeof body?.model !== "string" || body.model.length === 0)
      throw new Error("response model is empty");
    return `model=${body.model} total_tokens=${String(body.usage.total_tokens)} finish=stop content=${truncate(String(content).trim(), 120)}`;
  });

  // ---- decision row + observation -------------------------------------------------------------
  record("");
  record("## Routing decision");
  await check("decision recorded with deepseek/remote/stop", async () => {
    const deadline = Date.now() + 20_000;
    let ledgerRequest;
    while (Date.now() < deadline) {
      const ledger = await call("GET", "/api/role-model/requests");
      const rows = Array.isArray(ledger.body) ? ledger.body : [];
      ledgerRequest = rows.find((row) => row?.clientRequestId === finalRequestId);
      if (ledgerRequest !== undefined) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (ledgerRequest === undefined)
      throw new Error(`request ${finalRequestId} not found in /api/role-model/requests`);
    observationRequestId = ledgerRequest.requestId;
    const observation = await call(
      "GET",
      `/api/role-model/requests/${encodeURIComponent(observationRequestId)}`,
    );
    record(`observation_id=${String(observationRequestId)}`);
    record(
      `observation_routing_diagnostics=${redact(truncate(JSON.stringify(observation.body?.routingDiagnostics ?? null), 3000))}`,
    );
    const decisions = await call("GET", "/api/role-model/router/decisions");
    const rows = Array.isArray(decisions.body)
      ? decisions.body
      : Array.isArray(decisions.body?.rows)
        ? decisions.body.rows
        : [];
    const decision = rows.find((row) => row?.requestId === observationRequestId);
    if (decision === undefined)
      throw new Error(`no decision row for requestId ${String(observationRequestId)}`);
    record(`decision_row=${redact(truncate(JSON.stringify(decision), 4000))}`);
    if (decision.providerId !== "deepseek")
      throw new Error(`providerId ${String(decision.providerId)}`);
    if (decision.sourceType !== "remote")
      throw new Error(`sourceType ${String(decision.sourceType)}`);
    if (decision.finishReason !== "stop")
      throw new Error(`finishReason ${String(decision.finishReason)}`);
    return `requestId=${String(decision.requestId)} endpoint=${String(decision.selectedEndpointId)} model=${String(decision.selectedModelId)} effort=${String(decision.reasoningEffort)} source=${String(decision.sourceType)} provider=${String(decision.providerId)} finish=${String(decision.finishReason)}`;
  });

  // ---- replay queue: report honestly ----------------------------------------------------------
  record("");
  record("## Replay queue finding");
  const replayAfter = await call("GET", "/api/role-model/operator/replay/jobs");
  const replayJobs = Array.isArray(replayAfter.body)
    ? replayAfter.body
    : Array.isArray(replayAfter.body?.jobs)
      ? replayAfter.body.jobs
      : [];
  const replayMatch = replayJobs.find(
    (job) =>
      JSON.stringify(job).includes(String(observationRequestId ?? "")) ||
      JSON.stringify(job).includes(finalRequestId),
  );
  const captureEvidence = await call(
    "GET",
    `/api/role-model/operator/capture-evidence?requestId=${encodeURIComponent(String(observationRequestId ?? ""))}`,
  );
  const traceRoots = await call("GET", "/api/role-model/operator/trace-roots");
  const captureTree = captureEvidence.body;
  const captureStrings =
    captureTree === null || captureTree === undefined
      ? []
      : (() => {
          const found = findObject(captureTree, (candidate) =>
            ["reason", "status", "state", "detail", "message", "error", "disposition"].some(
              (key) => typeof candidate?.[key] === "string",
            ),
          );
          return found === undefined
            ? []
            : ["reason", "status", "state", "detail", "message", "error", "disposition"]
                .filter((key) => typeof found[key] === "string")
                .map((key) => `${key}=${String(found[key])}`);
        })();
  const observationReplayMentions =
    observationRequestId === undefined
      ? []
      : findScopeMentions(
          (
            await call(
              "GET",
              `/api/role-model/requests/${encodeURIComponent(observationRequestId)}`,
            )
          ).body,
          ["replay"],
          "",
          [],
          0,
        );
  const traceRootRows = Array.isArray(traceRoots.body?.roots)
    ? traceRoots.body.roots
    : Array.isArray(traceRoots.body)
      ? traceRoots.body
      : [];
  const traceRootForRequest = traceRootRows.find(
    (root) => String(root?.requestObservationId ?? "") === String(observationRequestId ?? ""),
  );
  replayFinding =
    replayMatch === undefined
      ? `not queued: replay jobs=${String(replayJobs.length)} (none reference request ${String(observationRequestId ?? "?")}); capture-evidence=${String(captureEvidence.status)}${captureStrings.length > 0 ? ` [${captureStrings.join(", ")}]` : ""}${captureTree?.hasResponseText === true ? " capture_had_response_text=true" : ""}; trace-roots=${String(traceRootRows.length)}${
          traceRootForRequest === undefined
            ? " (no trace root for this request)"
            : ` (trace root ${String(traceRootForRequest.traceRootId)} completeness=${String(traceRootForRequest.completeness)} readiness=${String(traceRootForRequest.readiness)})`
        }; replay markers in observation=${String(observationReplayMentions.length)}`
      : `queued: job ${String(replayMatch.jobId ?? replayMatch.id ?? "unknown")} references request ${String(observationRequestId)}`;
  record(
    `capture_evidence=${redact(truncate(JSON.stringify(captureEvidence.body ?? null), 3000))}`,
  );
  record(`trace_roots=${redact(truncate(JSON.stringify(traceRoots.body ?? null), 2000))}`);
  record(`REPLAY: ${replayFinding}`);
  record("");

  // ---- learning pack: report honestly ---------------------------------------------------------
  record("## Learning pack finding");
  const learningAfter = await call("GET", "/api/role-model/operator/learning");
  const learningRecords = await call("GET", "/api/role-model/operator/learning/records");
  const learningHistory = await call("GET", "/api/role-model/operator/learning/history");
  const ladders = Array.isArray(learningRecords.body?.ladders) ? learningRecords.body.ladders : [];
  const ladder = ladders.find(
    (entry) => entry?.roleId === roleId && entry?.taskTypeId === String(researcherTask.id),
  );
  const packMentions = findScopeMentions(learningAfter.body, ["pack"], "learning", [], 0);
  const recentBucket = Array.isArray(learningHistory.body?.buckets)
    ? learningHistory.body.buckets[learningHistory.body.buckets.length - 1]
    : undefined;
  record(`learning_ladder=${redact(truncate(JSON.stringify(ladder ?? null), 2500))}`);
  record(
    `learning_pack_markers=${String(packMentions.length)} recent_history_bucket=${redact(truncate(JSON.stringify(recentBucket ?? null), 800))}`,
  );
  learningFinding =
    ladder === undefined
      ? `no ladder/learning entry for scope ${roleId}/${String(researcherTask.id)} (records_status=${String(learningRecords.status)}, history_status=${String(learningHistory.status)}, knowledge_status=${String(learningAfter.status)}, pack_markers=${String(packMentions.length)})`
      : `no pack produced: ladder for ${roleId}/${String(researcherTask.id)} is state=${String(ladder.state)} admitted=${String(ladder.completeness?.admitted ?? "?")}/configured=${String(ladder.completeness?.configured ?? "?")} active=${String(ladder.active)} ladderVersion=${String(ladder.ladderVersion ?? "null")}${
          ladder.rolledBack?.on === true
            ? ` rolledBack=${String(ladder.rolledBack?.reason ?? "true")}`
            : ""
        }; knowledge pack markers=${String(packMentions.length)}`;
  record(`LEARNING: ${learningFinding}`);
  record(
    `learning_records_excerpt=${redact(truncate(JSON.stringify(learningRecords.body), 3000))}`,
  );
} catch (error) {
  failures.push(`unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  record(
    `FAIL unexpected error: ${redact(error instanceof Error ? error.message : String(error))}`,
  );
} finally {
  await shutdown();
  try {
    rmSync(stateCopy, { force: true, recursive: true });
    record("state_copy_removed=true");
  } catch (error) {
    record(
      `state_copy_removed=false (${redact(error instanceof Error ? error.message : String(error))})`,
    );
  }
}

record("");
record("# RESULT");
record(`head=${head} exe_sha256=${exeSha256} port=${String(port)} alias=${aliasPreference}`);
for (const entry of checks)
  record(`${entry.status} ${entry.name}: ${redact(String(entry.detail))}`);
record(`REPLAY: ${replayFinding}`);
record(`LEARNING: ${learningFinding}`);
const sourceAfter = treeSignature(stateSource);
record(`state_source_unchanged=${String(sourceAfter === sourceBefore)}`);
if (sourceAfter !== sourceBefore) failures.push("credential state source changed during the run");
if (failures.length === 0)
  record(
    `RESULT: PASS (${String(checks.length)}/${String(checks.length)} routing assertions; replay/learning recorded as findings)`,
  );
else {
  record(`RESULT: FAIL (${String(failures.length)} failure(s))`);
  for (const failure of failures) record(`  ${redact(failure)}`);
}
finishLog();
process.exit(failures.length === 0 ? 0 : 1);
