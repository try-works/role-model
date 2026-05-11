import { type ChildProcess, spawn, spawnSync } from "node:child_process";

export type VendorHealthStatus = "starting" | "healthy" | "stopped" | "crashed";

const DEFAULT_STARTUP_TIMEOUT_MS = 15_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const DEFAULT_RESTART_LIMIT = 5;
const DEFAULT_RESTART_BACKOFF_MS = 250;
const MAX_RESTART_BACKOFF_MS = 30_000;
const DEFAULT_LOG_LIMIT = 100;

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

interface ManagedVendorRecord {
  child: ChildProcess | null;
  status: ManagedVendorStatus;
  stopping: boolean;
  stopDeferred: Promise<void> | null;
  resolveStop: (() => void) | null;
  restartPromise: Promise<void> | null;
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

async function waitForHealth(record: ManagedVendorRecord): Promise<void> {
  if (!record.options.healthCheckUrl) {
    record.status = {
      ...record.status,
      healthStatus: "healthy",
    };
    return;
  }

  const deadline = Date.now() + (record.options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS);
  while (Date.now() <= deadline) {
    const child = record.child;
    if (!child) {
      throw new Error(`Managed vendor ${record.options.vendorId} is missing its child process.`);
    }
    if (child.exitCode !== null) {
      throw new Error(`Managed vendor ${record.options.vendorId} exited before becoming healthy.`);
    }

    try {
      const response = await fetch(record.options.healthCheckUrl);
      if (response.ok) {
        record.status = {
          ...record.status,
          healthStatus: "healthy",
          exitCode: undefined,
        };
        return;
      }
    } catch {
      // Poll until the process becomes reachable or exits.
    }

    await sleep(50);
  }

  throw new Error(
    `Managed vendor ${record.options.vendorId} did not become healthy before startup timed out.`,
  );
}

function beginChildLifecycle(record: ManagedVendorRecord, child: ChildProcess): void {
  record.child = child;
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

function spawnVendorProcess(record: ManagedVendorRecord): ChildProcess {
  const child = spawn(record.options.command, [...(record.options.args ?? [])], {
    cwd: record.options.cwd,
    env: {
      ...process.env,
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

function requestGracefulStop(record: ManagedVendorRecord): void {
  const child = record.child;
  if (!child || child.pid === undefined || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32") {
    requestWindowsTermination(child.pid, true);
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
    requestWindowsTermination(child.pid, true);
    return;
  }
  child.kill("SIGKILL");
}

export class ProcessSupervisor {
  private readonly managedVendors = new Map<string, ManagedVendorRecord>();

  private readonly crashListeners: VendorCrashListener[] = [];

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
    this.managedVendors.set(options.vendorId, record);

    const child = spawnVendorProcess(record);
    child.once("exit", (exitCode) => {
      void this.handleUnexpectedExit(record, exitCode);
    });

    try {
      await waitForHealth(record);
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

  async stopVendor(vendorId: string): Promise<void> {
    const record = this.managedVendors.get(vendorId);
    if (!record) {
      return;
    }

    record.stopping = true;
    const child = record.child;
    if (child && child.exitCode === null) {
      requestGracefulStop(record);
      const shutdownTimeoutMs = record.options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
      await Promise.race([record.stopDeferred ?? Promise.resolve(), sleep(shutdownTimeoutMs)]);
      if (child.exitCode === null) {
        appendLog(record, "supervisor", "Escalating managed vendor shutdown.");
        requestForceStop(record);
        await (record.stopDeferred ?? Promise.resolve());
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
  ): Promise<void> {
    record.status = {
      ...record.status,
      healthStatus: record.stopping ? "stopped" : "crashed",
      exitCode,
    };
    record.resolveStop?.();

    if (record.stopping) {
      return;
    }

    for (const listener of this.crashListeners) {
      listener(record.options.vendorId, exitCode);
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
      const child = spawnVendorProcess(record);
      child.once("exit", (exitCode) => {
        void this.handleUnexpectedExit(record, exitCode);
      });
      await waitForHealth(record);
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
