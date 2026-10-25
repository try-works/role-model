import { type ChildProcess, spawn, spawnSync } from "node:child_process";

export type VendorHealthStatus = "starting" | "healthy" | "stopped" | "crashed";

const DEFAULT_STARTUP_TIMEOUT_MS = 15_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const DEFAULT_RESTART_LIMIT = 5;
const DEFAULT_RESTART_BACKOFF_MS = 250;
const MAX_RESTART_BACKOFF_MS = 30_000;
const DEFAULT_LOG_LIMIT = 100;
/** One event-loop settle after the shutdown bound so a prompt exit event wins before SIGKILL. */
const STOP_ESCALATION_SETTLE_MS = 25;

export interface StartVendorOptions {
  readonly vendorId: string;
  readonly command: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly healthCheckUrl?: string;
  readonly startupTimeoutMs?: number;
  readonly shutdownTimeoutMs?: number;
  readonly restartLimit?: number;
  readonly restartBackoffMs?: number;
  readonly logLimit?: number;
  readonly required: boolean;
}

export interface ProcessSupervisorOptions {
  /** Base environment for supervised children. Defaults to the owning runtime process environment. */
  readonly baseEnvironment?: Readonly<Record<string, string | undefined>>;
  /**
   * Injectable Windows termination runner (used by the failed-taskkill bound test).
   * Defaults to taskkill /T /F. POSIX stops never call it.
   */
  readonly terminationRunner?: (pid: number, force: boolean) => void;
}

export class ProcessStopTimeoutError extends Error {
  readonly code = "PROCESS_STOP_TIMEOUT";
  constructor(vendorId: string, boundMs: number) {
    super(
      `Managed vendor ${vendorId} stop timed out after ${boundMs}ms; taskkill did not terminate the process.`,
    );
    this.name = "ProcessStopTimeoutError";
  }
}

export interface ManagedVendorStatus {
  readonly vendorId: string;
  readonly pid: number;
  readonly port: number | undefined;
  readonly healthStatus: VendorHealthStatus;
  readonly startTime: string;
  readonly restartCount: number;
  readonly logs: readonly string[];
  readonly exitCode?: number | null;
}

export interface ManagedVendor extends ManagedVendorStatus {
  stop(): Promise<void>;
}

/**
 * Run 115 S5b (R22): observable stop attempt. On POSIX a graceful SIGTERM is
 * attempted first and SIGKILL is only used after the shutdown bound expires.
 * Windows has no console graceful signal for these Node children: the supervisor's
 * only working stop is the force tree-kill, so its trace is explicit about that
 * limitation instead of pretending an escalation happened.
 */
export interface VendorStopTrace {
  readonly vendorId: string;
  readonly mode: "graceful-with-escalation" | "force-only";
  readonly gracefulSignal: string;
  gracefulRequests: number;
  readonly gracefulRequestedAtMs: number;
  gracefulWaitMs: number;
  escapedGraceful: boolean;
  forceSignal: string | null;
  escalatedAfterMs: number | null;
}

interface ManagedVendorRecord {
  child: ChildProcess | null;
  status: ManagedVendorStatus;
  stopping: boolean;
  startupPending: boolean;
  stopDeferred: Promise<void> | null;
  resolveStop: (() => void) | null;
  restartPromise: Promise<void> | null;
  stopPromise: Promise<void> | null;
  gracefulRequests: number;
  exitInfo: { readonly code: number | null; readonly signal: NodeJS.Signals | null } | null;
  exitPromise: Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
  resolveExit:
    | ((info: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | null;
  stopTrace: VendorStopTrace | null;
  readonly terminationRunner: (pid: number, force: boolean) => void;
  readonly options: StartVendorOptions;
}

type VendorCrashListener = (vendorId: string, exitCode: number | null) => void;

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function inferPort(options: StartVendorOptions): number | undefined {
  const fromEnv = options.env?.PORT ? Number(options.env.PORT) : Number.NaN;
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  if (!options.healthCheckUrl) {
    return undefined;
  }
  const url = new URL(options.healthCheckUrl);
  return url.port.length > 0 ? Number(url.port) : undefined;
}

function cloneStatus(status: ManagedVendorStatus): ManagedVendorStatus {
  return {
    ...status,
    logs: [...status.logs],
  };
}

function startupStderr(record: ManagedVendorRecord): string {
  return record.status.logs.filter((line) => line.startsWith("stderr:")).join(" | ");
}

function startupExitError(record: ManagedVendorRecord, exitCode: number | null): Error {
  const stderr = startupStderr(record);
  return new Error(
    `Managed vendor ${record.options.vendorId} exited during startup with code ${String(exitCode)}.` +
      ` stderr: ${stderr.length > 0 ? stderr : "<none>"}`,
  );
}

function readinessTimeoutError(record: ManagedVendorRecord): Error {
  return new Error(
    `Managed vendor ${record.options.vendorId} did not become healthy before startup timed out.`,
  );
}

function appendLog(
  record: ManagedVendorRecord,
  source: "stdout" | "stderr" | "supervisor",
  chunk: string,
): void {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => `${source}: ${line}`);
  if (lines.length === 0) {
    return;
  }
  const merged = [...record.status.logs, ...lines];
  const logLimit = Math.max(record.options.logLimit ?? DEFAULT_LOG_LIMIT, 1);
  record.status = {
    ...record.status,
    logs: merged.slice(-logLimit),
  };
}

type HealthProbeOutcome = "healthy" | "unhealthy" | "unreachable" | "timed-out";

/**
 * Releases an unread response body so a probe never leaves a socket dangling
 * once we have decided whether the peer is healthy.
 */
function releaseResponseBody(response: Response): void {
  const body = response.body;
  if (!body) {
    return;
  }
  void body.cancel().catch(() => undefined);
}

/**
 * Performs exactly one bounded health probe.
 *
 * The request is raced against a deadline timer *and* handed an AbortSignal, so
 * the bound holds even when the fetch implementation ignores cancellation: a
 * peer that accepts the TCP connection and never writes a response can no
 * longer park this await past the supervisor's startup deadline.
 */
async function probeHealth(url: string, attemptTimeoutMs: number): Promise<HealthProbeOutcome> {
  const controller = new AbortController();
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadlineReached = new Promise<HealthProbeOutcome>((resolve) => {
    deadlineTimer = setTimeout(
      () => {
        resolve("timed-out");
        controller.abort();
      },
      Math.max(attemptTimeoutMs, 1),
    );
  });

  try {
    const request = fetch(url, { signal: controller.signal }).then(
      (response): HealthProbeOutcome => {
        const healthy = response.ok;
        releaseResponseBody(response);
        return healthy ? "healthy" : "unhealthy";
      },
      (): HealthProbeOutcome => "unreachable",
    );
    return await Promise.race([request, deadlineReached]);
  } finally {
    if (deadlineTimer !== undefined) {
      clearTimeout(deadlineTimer);
    }
    controller.abort();
  }
}

async function waitForHealth(record: ManagedVendorRecord): Promise<void> {
  if (!record.options.healthCheckUrl) {
    record.status = {
      ...record.status,
      healthStatus: "healthy",
    };
    return;
  }

  const healthCheckUrl = record.options.healthCheckUrl;
  const deadline = Date.now() + (record.options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS);
  while (Date.now() <= deadline) {
    const child = record.child;
    if (!child) {
      throw new Error(`Managed vendor ${record.options.vendorId} is missing its child process.`);
    }
    if (child.exitCode !== null || record.exitInfo !== null) {
      // Captured stderr is the distinction between a startup failure and a
      // readiness timeout. A child externally killed without stderr (the bounded
      // health-wait harness) must still report the readiness timeout.
      if (startupStderr(record).length > 0) {
        throw startupExitError(record, child.exitCode ?? record.exitInfo?.code ?? null);
      }
      throw readinessTimeoutError(record);
    }

    // Bound the request itself, not only the gap between polls. Race the probe
    // against the child's exit so a startup death is reported with stderr
    // immediately rather than after a readiness timeout.
    const probe = probeHealth(healthCheckUrl, deadline - Date.now()).then((outcome) => ({
      kind: "probe" as const,
      outcome,
    }));
    const exited = record.exitPromise.then((info) => ({ kind: "exit" as const, info }));
    const raced = await Promise.race([probe, exited]);
    if (raced.kind === "exit") {
      // Captured stderr makes this a startup failure; without it the readiness
      // bound remains responsible (an external kill is not a startup report).
      if (startupStderr(record).length > 0) {
        throw startupExitError(record, raced.info.code);
      }
      throw readinessTimeoutError(record);
    }
    const outcome = raced.outcome;
    if (outcome === "healthy") {
      record.status = {
        ...record.status,
        healthStatus: "healthy",
        exitCode: undefined,
      };
      return;
    }

    if (Date.now() > deadline) {
      break;
    }
    await sleep(50);
  }

  throw readinessTimeoutError(record);
}

function beginChildLifecycle(record: ManagedVendorRecord, child: ChildProcess): void {
  record.child = child;
  record.startupPending = true;
  record.exitInfo = null;
  record.exitPromise = new Promise((resolve) => {
    record.resolveExit = resolve;
  });
  record.stopDeferred = new Promise<void>((resolve) => {
    record.resolveStop = resolve;
  });
  record.status = {
    ...record.status,
    pid: child.pid ?? record.status.pid,
    port: inferPort(record.options),
    healthStatus: "starting",
    startTime: new Date().toISOString(),
    exitCode: undefined,
  };

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    appendLog(record, "stdout", chunk);
  });
  child.stderr?.on("data", (chunk: string) => {
    appendLog(record, "stderr", chunk);
  });
}

function spawnVendorProcess(
  record: ManagedVendorRecord,
  baseEnvironment: Readonly<Record<string, string | undefined>>,
): ChildProcess {
  const child = spawn(record.options.command, [...(record.options.args ?? [])], {
    cwd: record.options.cwd,
    env: {
      ...baseEnvironment,
      ...record.options.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  if (!child.pid) {
    throw new Error(`Managed vendor ${record.options.vendorId} did not expose a process id.`);
  }

  beginChildLifecycle(record, child);
  return child;
}

function requestWindowsTermination(pid: number, force: boolean): void {
  const args = force ? ["/PID", String(pid), "/T", "/F"] : ["/PID", String(pid), "/T"];
  spawnSync("taskkill", args, {
    stdio: "ignore",
    windowsHide: true,
  });
}

function defaultTerminationRunner(pid: number, force: boolean): void {
  requestWindowsTermination(pid, force);
}

function requestGracefulStop(record: ManagedVendorRecord): void {
  const child = record.child;
  if (!child || child.pid === undefined || child.exitCode !== null) {
    return;
  }
  record.gracefulRequests += 1;
  if (process.platform === "win32") {
    record.terminationRunner(child.pid, true);
    return;
  }
  child.kill("SIGTERM");
}

function requestForceStop(record: ManagedVendorRecord): void {
  const child = record.child;
  if (!child || child.pid === undefined || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32") {
    record.terminationRunner(child.pid, true);
    return;
  }
  child.kill("SIGKILL");
}

export class ProcessSupervisor {
  private readonly managedVendors = new Map<string, ManagedVendorRecord>();

  private readonly lastStopTraces = new Map<string, VendorStopTrace>();

  private readonly crashListeners: VendorCrashListener[] = [];

  private readonly baseEnvironment: Readonly<Record<string, string | undefined>>;

  private readonly terminationRunner: (pid: number, force: boolean) => void;

  constructor(options: ProcessSupervisorOptions = {}) {
    this.baseEnvironment = options.baseEnvironment ?? process.env;
    this.terminationRunner = options.terminationRunner ?? defaultTerminationRunner;
  }

  onVendorCrash(listener: VendorCrashListener): void {
    this.crashListeners.push(listener);
  }

  isVendorRunning(vendorId: string): boolean {
    const record = this.managedVendors.get(vendorId);
    return Boolean(
      record?.child && record.child.exitCode === null && record.status.healthStatus === "healthy",
    );
  }

  getVendorStatus(vendorId: string): ManagedVendorStatus | undefined {
    const record = this.managedVendors.get(vendorId);
    return record ? cloneStatus(record.status) : undefined;
  }

  getAllStatuses(): ManagedVendorStatus[] {
    return [...this.managedVendors.values()].map((record) => cloneStatus(record.status));
  }

  async startVendor(options: StartVendorOptions): Promise<ManagedVendor> {
    const existing = this.managedVendors.get(options.vendorId);
    if (existing) {
      if (existing.child?.exitCode === null && existing.status.healthStatus === "healthy") {
        return this.createManagedVendor(options.vendorId, existing);
      }
      if (existing.restartPromise) {
        await existing.restartPromise;
        return this.createManagedVendor(options.vendorId, existing);
      }
    }

    const record: ManagedVendorRecord = existing ?? {
      child: null,
      stopping: false,
      stopDeferred: null,
      resolveStop: null,
      restartPromise: null,
      stopPromise: null,
      gracefulRequests: 0,
      exitInfo: null,
      exitPromise: Promise.resolve({ code: null, signal: null }),
      resolveExit: null,
      stopTrace: null,
      terminationRunner: this.terminationRunner,
      startupPending: false,
      options,
      status: {
        vendorId: options.vendorId,
        pid: -1,
        port: inferPort(options),
        healthStatus: "starting",
        startTime: new Date().toISOString(),
        restartCount: 0,
        logs: [],
      },
    };

    record.stopping = false;
    record.stopPromise = null;
    record.gracefulRequests = 0;
    record.stopTrace = null;
    this.managedVendors.set(options.vendorId, record);

    const child = spawnVendorProcess(record, this.baseEnvironment);
    child.once("exit", (exitCode, signal) => {
      void this.handleUnexpectedExit(record, exitCode, signal);
    });

    try {
      await waitForHealth(record);
      record.startupPending = false;
      return this.createManagedVendor(options.vendorId, record);
    } catch (error) {
      record.stopping = true;
      if (record.child?.exitCode === null) {
        requestForceStop(record);
        await record.stopDeferred;
      }
      this.managedVendors.delete(options.vendorId);
      throw error;
    }
  }

  getStopTrace(vendorId: string): VendorStopTrace | undefined {
    const trace = this.lastStopTraces.get(vendorId);
    return trace ? { ...trace } : undefined;
  }

  async stopVendor(vendorId: string): Promise<void> {
    const record = this.managedVendors.get(vendorId);
    if (!record) {
      return;
    }
    // Repeated and concurrent stops share one lifecycle promise, so the child
    // is signalled once and every caller settles with the same result.
    if (record.stopPromise) {
      return record.stopPromise;
    }
    record.stopping = true;
    record.stopPromise = this.stopVendorOnce(record).catch((error: unknown) => {
      // Keep the record for a later retry (the child may still be alive), but do
      // not pin every future stop to this failed promise.
      record.stopPromise = null;
      throw error;
    });
    return record.stopPromise;
  }

  private async stopVendorOnce(record: ManagedVendorRecord): Promise<void> {
    const vendorId = record.options.vendorId;
    const gracefulRequestedAtMs = Date.now();
    const child = record.child;
    const shutdownTimeoutMs = record.options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    const trace: VendorStopTrace = {
      vendorId,
      mode: process.platform === "win32" ? "force-only" : "graceful-with-escalation",
      gracefulSignal:
        process.platform === "win32"
          ? "taskkill /T /F (Windows force-only: no console graceful signal)"
          : "SIGTERM",
      gracefulRequests: record.gracefulRequests,
      gracefulRequestedAtMs,
      gracefulWaitMs: 0,
      escapedGraceful: false,
      forceSignal: null,
      escalatedAfterMs: null,
    };
    record.stopTrace = trace;
    this.lastStopTraces.set(vendorId, trace);

    if (child && child.exitCode === null) {
      requestGracefulStop(record);
      trace.gracefulRequests = record.gracefulRequests;
      if (process.platform === "win32") {
        // taskkill /T /F is the only working stop for a console child; there is no
        // graceful console signal to escalate from. Record the limitation honestly,
        // but bound the wait: a denied/failed taskkill must reject, not hang.
        trace.forceSignal = "taskkill /T /F";
        const exited = await Promise.race([
          (record.stopDeferred ?? Promise.resolve()).then(() => true),
          sleep(shutdownTimeoutMs).then(() => false),
        ]);
        trace.gracefulWaitMs = Date.now() - gracefulRequestedAtMs;
        if (!exited && child.exitCode === null && record.exitInfo === null) {
          throw new ProcessStopTimeoutError(vendorId, shutdownTimeoutMs);
        }
      } else {
        await Promise.race([record.stopDeferred ?? Promise.resolve(), sleep(shutdownTimeoutMs)]);
        // The 'exit' event can land just after the timer. Give one bounded settle
        // turn and re-check exitInfo before declaring the graceful phase escaped.
        if (child.exitCode === null && record.exitInfo === null) {
          await Promise.race([
            record.stopDeferred ?? Promise.resolve(),
            sleep(STOP_ESCALATION_SETTLE_MS),
          ]);
        }
        trace.gracefulWaitMs = Date.now() - gracefulRequestedAtMs;
        if (child.exitCode === null && record.exitInfo === null) {
          trace.escapedGraceful = true;
          trace.forceSignal = "SIGKILL";
          trace.escalatedAfterMs = Date.now() - gracefulRequestedAtMs;
          appendLog(
            record,
            "supervisor",
            `Escalating managed vendor shutdown after ${trace.escalatedAfterMs}ms with SIGKILL.`,
          );
          requestForceStop(record);
          await (record.stopDeferred ?? Promise.resolve());
        }
      }
    }

    if (record.restartPromise) {
      await record.restartPromise;
    }
    this.managedVendors.delete(vendorId);
  }

  async shutdown(): Promise<void> {
    for (const vendorId of [...this.managedVendors.keys()]) {
      await this.stopVendor(vendorId);
    }
  }

  private async handleUnexpectedExit(
    record: ManagedVendorRecord,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    const startupPending = record.startupPending;
    record.startupPending = false;
    record.exitInfo = { code: exitCode, signal };
    record.resolveExit?.({ code: exitCode, signal });
    record.status = {
      ...record.status,
      healthStatus: record.stopping ? "stopped" : "crashed",
      exitCode,
    };
    record.resolveStop?.();

    if (record.stopping && !startupPending) {
      return;
    }

    for (const listener of this.crashListeners) {
      listener(record.options.vendorId, exitCode);
    }

    if (startupPending) {
      return;
    }

    if (!record.restartPromise) {
      record.restartPromise = this.restartVendor(record);
      await record.restartPromise;
    }
  }

  private async restartVendor(record: ManagedVendorRecord): Promise<void> {
    const restartLimit = record.options.restartLimit ?? DEFAULT_RESTART_LIMIT;
    if (record.status.restartCount >= restartLimit) {
      appendLog(record, "supervisor", "Restart limit reached; leaving vendor crashed.");
      record.restartPromise = null;
      return;
    }

    const nextRestartCount = record.status.restartCount + 1;
    const restartDelay = Math.min(
      (record.options.restartBackoffMs ?? DEFAULT_RESTART_BACKOFF_MS) * 2 ** (nextRestartCount - 1),
      MAX_RESTART_BACKOFF_MS,
    );

    record.status = {
      ...record.status,
      healthStatus: "starting",
      restartCount: nextRestartCount,
    };
    appendLog(record, "supervisor", `Restarting vendor after ${restartDelay}ms backoff.`);
    await sleep(restartDelay);

    if (record.stopping) {
      record.restartPromise = null;
      return;
    }

    try {
      const child = spawnVendorProcess(record, this.baseEnvironment);
      child.once("exit", (exitCode, signal) => {
        void this.handleUnexpectedExit(record, exitCode, signal);
      });
      await waitForHealth(record);
      record.startupPending = false;
    } catch (error) {
      appendLog(
        record,
        "supervisor",
        error instanceof Error ? error.message : "Vendor restart failed with an unknown error.",
      );
      if (!record.stopping && record.status.restartCount < restartLimit) {
        record.restartPromise = null;
        record.restartPromise = this.restartVendor(record);
        await record.restartPromise;
        return;
      }
    }

    record.restartPromise = null;
  }

  private createManagedVendor(vendorId: string, record: ManagedVendorRecord): ManagedVendor {
    return {
      ...cloneStatus(record.status),
      stop: async () => {
        await this.stopVendor(vendorId);
      },
    };
  }
}
