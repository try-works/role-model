import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeField(value) {
  return typeof value === "string" ? value : "missing";
}

function describeRuntimeHealth(health) {
  if (!isRecord(health)) {
    return "health response is not a JSON object";
  }

  const authority = isRecord(health.credentialLifecycleAuthority)
    ? health.credentialLifecycleAuthority
    : {};
  const sessionBootstrap = isRecord(health.sessionBootstrap) ? health.sessionBootstrap : {};

  return [
    `status=${describeField(health.status)}`,
    `credentialLifecycleAuthority.state=${describeField(authority.state)}`,
    `credentialLifecycleAuthority.bootstrapStatus=${describeField(authority.bootstrapStatus)}`,
    `sessionBootstrap=${describeField(sessionBootstrap.status)}`,
  ].join(", ");
}

export function isSemanticRuntimeReady(health) {
  if (!isRecord(health)) {
    return false;
  }

  const authority = health.credentialLifecycleAuthority;
  const sessionBootstrap = health.sessionBootstrap;
  return (
    health.status === "healthy" &&
    isRecord(authority) &&
    authority.state === "authoritative" &&
    authority.bootstrapStatus === "ready" &&
    isRecord(sessionBootstrap) &&
    sessionBootstrap.status === "ready"
  );
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function inspectHealth(url, requestTimeoutMs, fetchFn) {
  try {
    const response = await fetchFn(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) {
      return { diagnostic: `HTTP ${response.status}`, ready: false };
    }

    let health;
    try {
      health = await response.json();
    } catch (error) {
      return { diagnostic: `malformed JSON: ${errorMessage(error)}`, ready: false };
    }

    if (isSemanticRuntimeReady(health)) {
      return { health, ready: true };
    }

    return { diagnostic: describeRuntimeHealth(health), ready: false };
  } catch (error) {
    return { diagnostic: `request failed: ${errorMessage(error)}`, ready: false };
  }
}

export async function waitForSemanticRuntimeReadiness({
  fetchFn = fetch,
  now = Date.now,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  sleepFn = sleep,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  url,
} = {}) {
  const deadline = now() + timeoutMs;
  let lastDiagnostic = "no health response received";

  while (true) {
    const remainingBeforeRequest = deadline - now();
    if (remainingBeforeRequest <= 0) {
      break;
    }

    const observation = await inspectHealth(
      url,
      Math.max(1, Math.min(5_000, remainingBeforeRequest)),
      fetchFn,
    );
    if (observation.ready) {
      return observation.health;
    }
    lastDiagnostic = observation.diagnostic;

    const remainingBeforeSleep = deadline - now();
    if (remainingBeforeSleep <= 0) {
      break;
    }
    await sleepFn(Math.min(pollIntervalMs, remainingBeforeSleep));
  }

  throw new Error(
    `Timed out waiting for semantic runtime readiness after ${timeoutMs}ms; last observation: ${lastDiagnostic}`,
  );
}

function parsePositiveInteger(value, flag) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${flag} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!["--url", "--timeout-ms", "--poll-interval-ms"].includes(flag)) {
      throw new Error(`Unknown option: ${flag}`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--") || values.has(flag)) {
      throw new Error(`Expected one value for ${flag}`);
    }
    values.set(flag, value);
    index += 1;
  }

  const url = values.get("--url");
  if (!url) {
    throw new Error("--url is required");
  }
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("--url must use http or https");
  }

  return {
    pollIntervalMs: parsePositiveInteger(
      values.get("--poll-interval-ms") ?? String(DEFAULT_POLL_INTERVAL_MS),
      "--poll-interval-ms",
    ),
    timeoutMs: parsePositiveInteger(
      values.get("--timeout-ms") ?? String(DEFAULT_TIMEOUT_MS),
      "--timeout-ms",
    ),
    url: parsedUrl.toString(),
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const health = await waitForSemanticRuntimeReadiness(options);
  console.log(`Semantic runtime readiness: ready (${describeRuntimeHealth(health)})`);
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  try {
    await main();
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 1;
  }
}
