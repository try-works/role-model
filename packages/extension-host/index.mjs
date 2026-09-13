import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  defineExtension,
  encodeControlFrame,
  extractControlFrames,
  verifySignedBundle,
} from "../extension-sdk/index.mjs";
import { createInputTransferArtifact } from "./transfer-artifact.mjs";

/**
 * Reject malformed graph-contract metadata at the host boundary.  Extension
 * packages must not be able to treat an incomplete registry as a usable
 * contract, even when they are loaded independently from the Track-B bundle.
 */
export function validateGraphRegistry(registry) {
  if (!registry || registry.version !== 1 || !Array.isArray(registry.kinds)) {
    throw new Error("invalid graph registry");
  }
  const seen = new Set();
  const kinds = registry.kinds.map((kind) => {
    if (
      !kind?.id ||
      !Number.isInteger(kind.version) ||
      !kind.category ||
      !Array.isArray(kind.fields)
    ) {
      throw new Error("incomplete graph registry entry");
    }
    const key = `${kind.id}@${kind.version}`;
    if (seen.has(key)) throw new Error(`duplicate graph registry entry: ${key}`);
    seen.add(key);
    return Object.freeze({ ...kind, fields: Object.freeze([...kind.fields]) });
  });
  return Object.freeze({ version: registry.version, kinds: Object.freeze(kinds) });
}

const runtimePath = fileURLToPath(new URL("./worker-runtime.mjs", import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeModuleUrl = (value) =>
  value instanceof URL ? value.href : value.startsWith("file:") ? value : pathToFileURL(value).href;
const resolveNodeWorkerExecutable = (configured = process.env.ROLE_MODEL_EXTENSION_WORKER_NODE) => {
  const explicit = configured?.trim();
  if (explicit) return explicit;
  const executableName = basename(process.execPath).toLowerCase();
  return executableName === "node.exe" || executableName === "node" ? process.execPath : "node";
};

class ProcessWorker {
  constructor(moduleUrl, onExit, startupTimeoutMs, workerExecPath, extensionId, stateRoot, channel = null) {
    this.moduleUrl = normalizeModuleUrl(moduleUrl);
    this.onExit = onExit;
    this.startupTimeoutMs = startupTimeoutMs;
    this.workerExecPath = workerExecPath;
    this.extensionId = extensionId;
    this.stateRoot = stateRoot;
    this.channel = channel;
    this.pending = new Map();
    this.child = null;
    this.stderr = "";
    this.exited = true;
    this.stopping = false;
    this.controlSecret = null;
    this.outboundSequence = 0;
    this.inboundSequence = 0;
    this.terminationPromise = null;
  }
  #encode(value) {
    const sequence = this.outboundSequence + 1;
    const frame = encodeControlFrame(value, {
      secret: this.controlSecret,
      direction: "host->worker",
      sequence,
    });
    this.outboundSequence = sequence;
    return frame;
  }
  #rejectPending(error) {
    for (const item of this.pending.values()) {
      void item.cleanup?.().catch(() => {});
      item.reject(error);
    }
    this.pending.clear();
  }
  async start() {
    if (this.child && !this.exited) return;
    if (this.stateRoot) await mkdir(this.stateRoot, { recursive: true });
    this.stopping = false;
    this.exited = false;
    this.transferKey = randomBytes(32).toString("hex");
    this.controlSecret = this.transferKey;
    this.outboundSequence = 0;
    this.inboundSequence = 0;
    this.child = spawn(this.workerExecPath, [runtimePath, this.moduleUrl], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        ROLE_MODEL_EXTENSION_ID: this.extensionId,
        ...(this.stateRoot ? { ROLE_MODEL_EXTENSION_STATE_ROOT: this.stateRoot } : {}),
        ...(this.channel ? { ROLE_MODEL_EXTENSION_CHANNEL: this.channel } : {}),
        ROLE_MODEL_EXTENSION_TRANSFER_KEY: this.transferKey,
        ROLE_MODEL_EXTENSION_CONTROL_KEY: this.controlSecret,
      },
    });
    this.stderr = "";
    this.child.stderr.on("data", (chunk) => {
      this.stderr = `${this.stderr}${chunk.toString("utf8")}`.slice(-4096);
    });
    let bytes = Buffer.alloc(0);
    let readyResolved = false;
    let readyRejected = false;
    let rejectReady;
    const rejectProtocol = (error) => {
      const failure = error instanceof Error ? error : new Error(String(error));
      this.#rejectPending(failure);
      if (!readyResolved && !readyRejected) {
        readyRejected = true;
        rejectReady(failure);
      }
      if (!this.exited) {
        this.stopping = false;
        this.child.kill();
      }
    };
    // A worker that dies or closes its pipes makes the host->worker socket emit an
    // asynchronous `error` (EPIPE). Without a listener Node raises an uncaught
    // exception and the whole packaged runtime process exits; that killed the Phase 5
    // proof runtime under real traffic. Pipe errors now degrade the worker instead.
    this.child.stdin.on("error", (error) => rejectProtocol(error));
    this.child.stdout.on("error", (error) => rejectProtocol(error));
    const ready = new Promise((resolve, reject) => {
      rejectReady = reject;
      this.child.once("error", reject);
      this.child.stdout.on("data", (chunk) => {
        try {
          bytes = Buffer.concat([bytes, chunk]);
          const parsed = extractControlFrames(bytes, {
            secret: this.controlSecret,
            direction: "worker->host",
            lastSequence: this.inboundSequence,
          });
          bytes = parsed.remainder;
          this.inboundSequence = parsed.lastSequence;
          for (const message of parsed.values) {
            if (message.type === "ready") {
              readyResolved = true;
              this.pid = message.pid;
              resolve();
              continue;
            }
            const pending = this.pending.get(message.requestId);
            if (!pending) continue;
            this.pending.delete(message.requestId);
            void pending.cleanup?.().catch(() => {});
            try {
              this.child?.stdin.write(this.#encode({ type: "ack", requestId: message.requestId }));
            } catch {
              // The worker already closed its pipe; the pending invoke has settled.
            }
            if (message.type === "result")
              pending.resolve({ ...message.result, workerPid: this.pid });
            else pending.reject(new Error(message.error));
          }
        } catch (error) {
          rejectProtocol(error);
        }
      });
    });
    this.child.once("exit", (code, signal) => {
      const expected = this.stopping;
      this.exited = true;
      const detail = this.stderr.trim();
      this.#rejectPending(new Error(detail ? `worker exited: ${detail}` : "worker exited"));
      if (!readyResolved && !readyRejected)
        rejectReady(
          new Error(
            `worker exited during startup (${code ?? signal})${detail ? `: ${detail}` : ""}`,
          ),
        );
      if (!expected) this.onExit?.(code, signal);
    });
    let timer;
    try {
      await Promise.race([
        ready,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("worker startup timeout")),
            this.startupTimeoutMs,
          );
        }),
      ]);
    } catch (error) {
      if (!this.exited) this.child.kill();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  async invoke(envelope) {
    if (this.exited || !this.child) return Promise.reject(new Error("worker exited"));
    let wireEnvelope = envelope;
    let transferPath = null;
    let frame;
    try {
      frame = this.#encode({ type: "invoke", requestId: envelope.requestId, envelope });
    } catch (error) {
      if (
        !/frame exceeds inline limit/i.test(error instanceof Error ? error.message : String(error))
      ) {
        throw error;
      }
      const transferArtifact = await createInputTransferArtifact({
        stateRoot: this.stateRoot,
        transferKey: this.transferKey,
        envelope,
      });
      transferPath = join(this.stateRoot, ...transferArtifact.relativePath.split("/"));
      wireEnvelope = {
        requestId: envelope.requestId,
        protocolVersion: envelope.protocolVersion,
        authorizationEpoch: envelope.authorizationEpoch,
        channel: envelope.channel,
        scope: envelope.scope,
        capability: envelope.capability,
        transferArtifact,
      };
      frame = this.#encode({
        type: "invoke",
        requestId: envelope.requestId,
        envelope: wireEnvelope,
      });
    }
    const cleanup = async () => {
      if (!transferPath) return;
      try {
        await unlink(transferPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    };
    return new Promise((resolve, reject) => {
      this.pending.set(envelope.requestId, { resolve, reject, cleanup });
      try {
        this.child.stdin.write(frame, (error) => {
          if (error) {
            this.pending.delete(envelope.requestId);
            void cleanup().catch(() => {});
            reject(error);
          }
        });
      } catch (error) {
        this.pending.delete(envelope.requestId);
        void cleanup().catch(() => {});
        reject(error);
      }
    });
  }
  async stop() {
    if (!this.child || this.exited) return;
    if (this.terminationPromise) {
      await this.terminationPromise;
      return;
    }
    this.stopping = true;
    const child = this.child;
    try {
      child.stdin.write(this.#encode({ type: "shutdown" }));
    } catch {
      child.kill();
    }
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!this.exited) child.kill();
      }, 250);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.child = null;
  }
  async terminate() {
    if (!this.child || this.exited) return;
    if (this.terminationPromise) return this.terminationPromise;
    const child = this.child;
    this.stopping = false;
    this.#rejectPending(new Error("worker terminated"));
    this.terminationPromise = new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        if (!this.exited) child.kill();
        finish();
      }, 250);
      child.once("exit", finish);
      try {
        child.kill();
      } catch {
        finish();
      }
    }).finally(() => {
      this.terminationPromise = null;
    });
    return this.terminationPromise;
  }
  state() {
    return {
      pid: this.exited ? null : (this.pid ?? null),
      exited: this.exited,
    };
  }
}

export class ExtensionHost {
  #enabled = true;
  #workers = new Map();
  #active = 0;
  #queue = [];
  #degradations = [];
  #restartCount = 0;
  constructor({
    protocolVersion,
    compatibleProtocolVersions = [],
    authorizationEpoch = 0,
    timeoutMs = 1_000,
    startupTimeoutMs = 2_000,
    maxConcurrent = 8,
    maxQueued = 64,
    maxDegradationReceipts = 64,
    journalPath = null,
    maxRestarts = 3,
    restartBackoffMs = 10,
    workerExecPath = resolveNodeWorkerExecutable(),
    /**
     * Runtime channel this host serves. Envelopes that omit a channel are stamped
     * with it, so extension-side scope bindings and reference resolvers see the
     * channel the runtime actually serves instead of falling back to development.
     */
    channel = null,
  }) {
    this.protocolVersion = protocolVersion;
    this.protocolVersions = new Set([protocolVersion, ...compatibleProtocolVersions]);
    this.timeoutMs = timeoutMs;
    this.startupTimeoutMs = startupTimeoutMs;
    this.authorizationEpoch = authorizationEpoch;
    this.maxConcurrent = maxConcurrent;
    this.maxQueued = maxQueued;
    this.maxDegradationReceipts = maxDegradationReceipts;
    this.journalPath = journalPath;
    this.maxRestarts = maxRestarts;
    this.restartBackoffMs = restartBackoffMs;
    this.workerExecPath = workerExecPath;
    this.channel = channel;
  }
  #validateDescriptor(descriptor) {
    const validated = defineExtension(descriptor);
    if (!this.protocolVersions.has(validated.protocolVersion))
      throw new Error("protocol version mismatch");
    if (this.#workers.has(validated.id)) throw new Error(`duplicate extension ${validated.id}`);
    return validated;
  }
  async #journal(event) {
    if (!this.journalPath) return;
    await mkdir(dirname(this.journalPath), { recursive: true });
    await appendFile(
      this.journalPath,
      `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`,
      "utf8",
    );
  }
  #recoverExitedProcess(record) {
    if (record.kind !== "process" || !record.autoRestart || !record.worker.exited) return null;
    if (record.restartPromise) return record.restartPromise;
    record.restartPromise = (async () => {
      while (record.autoRestart && record.worker.exited) {
        if (record.restarts >= this.maxRestarts) {
          record.lifecycle = "degraded";
          await this.#journal({
            type: "restart_exhausted",
            extensionId: record.descriptor.id,
            restart: record.restarts,
          });
          return;
        }
        await delay(this.restartBackoffMs * 2 ** record.restarts);
        if (!record.autoRestart || !record.worker.exited) return;
        record.restarts += 1;
        this.#restartCount += 1;
        record.lifecycle = "starting";
        try {
          await record.worker.start();
          record.lifecycle = "ready";
          await this.#journal({
            type: "restarted",
            extensionId: record.descriptor.id,
            restart: record.restarts,
          });
          return;
        } catch (error) {
          record.lifecycle = "exited";
          await this.#journal({
            type: "restart_failed",
            extensionId: record.descriptor.id,
            restart: record.restarts,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })().finally(() => {
      record.restartPromise = null;
    });
    return record.restartPromise;
  }
  register(descriptor, worker) {
    const validated = this.#validateDescriptor(descriptor);
    if (typeof worker !== "function") throw new Error("worker function required");
    this.#workers.set(validated.id, {
      descriptor: validated,
      worker,
      kind: "inline",
      lifecycle: "ready",
    });
  }
  async registerProcess(descriptor, moduleUrl, { journal = true } = {}) {
    const validated = this.#validateDescriptor(descriptor);
    const normalized = normalizeModuleUrl(moduleUrl);
    const record = {
      descriptor: validated,
      moduleUrl: normalized,
      kind: "process",
      lifecycle: "starting",
      restarts: 0,
      autoRestart: false,
      restartPromise: null,
      transitions: 0,
    };
    record.worker = new ProcessWorker(
      normalized,
      () => {
        record.lifecycle = "exited";
        if (record.autoRestart) void this.#recoverExitedProcess(record);
      },
      this.startupTimeoutMs,
      this.workerExecPath,
      validated.id,
      this.journalPath ? join(dirname(this.journalPath), "workers", validated.id) : null,
      this.channel,
    );
    this.#workers.set(validated.id, record);
    try {
      await record.worker.start();
      record.lifecycle = "ready";
      record.autoRestart = true;
    } catch (error) {
      record.autoRestart = false;
      this.#workers.delete(validated.id);
      throw error;
    }
    if (journal)
      await this.#journal({ type: "installed", descriptor: validated, moduleUrl: normalized });
  }
  async install(bundle, signingKey) {
    const verified = verifySignedBundle(bundle, signingKey);
    const descriptor = defineExtension(verified.manifest);
    if (!descriptor.entrypoint) throw new Error("manifest entrypoint is required");
    const moduleUrl = verified.payload?.moduleUrl;
    if (typeof moduleUrl !== "string" || !moduleUrl.endsWith(`/${descriptor.entrypoint}`))
      throw new Error("bundle module URL does not match manifest entrypoint");
    await this.registerProcess(descriptor, moduleUrl);
  }
  async restoreJournal() {
    if (!this.journalPath) throw new Error("journal path required");
    let content;
    try {
      content = await readFile(this.journalPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    const latest = new Map();
    for (const line of content.split(/\r?\n/).filter(Boolean)) {
      const row = JSON.parse(line);
      if (row.type === "installed") {
        latest.set(row.descriptor.id, { ...row, desiredState: "ready" });
        continue;
      }
      const extensionId = row.extensionId;
      if (!extensionId || !latest.has(extensionId)) continue;
      if (row.type === "removed") latest.delete(extensionId);
      else if (row.type === "stopped")
        latest.set(extensionId, { ...latest.get(extensionId), desiredState: "stopped" });
      else if (row.type === "started" || row.type === "restarted")
        latest.set(extensionId, { ...latest.get(extensionId), desiredState: "ready" });
    }
    for (const row of latest.values()) {
      if (!this.#workers.has(row.descriptor.id)) {
        await this.registerProcess(row.descriptor, row.moduleUrl, { journal: false });
        if (row.desiredState === "stopped") {
          const record = this.#workers.get(row.descriptor.id);
          record.lifecycle = "stopping";
          await record.worker.stop();
          record.lifecycle = "stopped";
        }
      }
    }
  }
  disable() {
    this.#enabled = false;
  }
  extensionState(id) {
    const record = this.#workers.get(id);
    if (!record) throw new Error(`unknown extension ${id}`);
    return {
      id,
      lifecycle: record.lifecycle,
      pid: record.kind === "process" ? record.worker.state().pid : null,
      restarts: record.restarts ?? 0,
      // A supervised start/stop/restart is a bounded, expected transition.  The
      // readiness projection must be able to tell it apart from a terminal
      // worker failure, including the window between stop and start.
      transitioning: (record.transitions ?? 0) > 0 || Boolean(record.restartPromise),
    };
  }
  listExtensionStates() {
    return [...this.#workers.keys()].sort().map((id) => this.extensionState(id));
  }
  async stopProcess(id) {
    const record = this.#workers.get(id);
    if (!record || record.kind !== "process") throw new Error(`unknown process extension ${id}`);
    record.transitions = (record.transitions ?? 0) + 1;
    try {
      record.lifecycle = "stopping";
      record.autoRestart = false;
      await record.worker.stop();
      record.lifecycle = "stopped";
      await this.#journal({ type: "stopped", extensionId: id, pid: null });
      return this.extensionState(id);
    } finally {
      record.transitions = Math.max(0, (record.transitions ?? 1) - 1);
    }
  }
  async startProcess(id) {
    const record = this.#workers.get(id);
    if (!record || record.kind !== "process") throw new Error(`unknown process extension ${id}`);
    if (record.lifecycle === "ready" && !record.worker.exited) return this.extensionState(id);
    record.transitions = (record.transitions ?? 0) + 1;
    try {
      record.lifecycle = "starting";
      await record.worker.start();
      record.lifecycle = "ready";
      record.autoRestart = true;
      await this.#journal({ type: "started", extensionId: id, pid: record.worker.state().pid });
      return this.extensionState(id);
    } catch (error) {
      // A failed supervised start is terminal for this attempt: leaving the
      // record in `starting` would let readiness report an unbounded pending
      // transition instead of a real worker failure.
      record.lifecycle = "exited";
      throw error;
    } finally {
      record.transitions = Math.max(0, (record.transitions ?? 1) - 1);
    }
  }
  async restartProcess(id) {
    const record = this.#workers.get(id);
    if (!record || record.kind !== "process") throw new Error(`unknown process extension ${id}`);
    record.transitions = (record.transitions ?? 0) + 1;
    try {
      await this.stopProcess(id);
      record.restarts = (record.restarts ?? 0) + 1;
      this.#restartCount += 1;
      const state = await this.startProcess(id);
      await this.#journal({ type: "restarted", extensionId: id, restart: record.restarts });
      return state;
    } finally {
      record.transitions = Math.max(0, (record.transitions ?? 1) - 1);
    }
  }
  async removeProcess(id) {
    const record = this.#workers.get(id);
    if (!record || record.kind !== "process") throw new Error(`unknown process extension ${id}`);
    await this.stopProcess(id);
    record.autoRestart = false;
    this.#workers.delete(id);
    await this.#journal({ type: "removed", extensionId: id });
  }
  rotateAuthorizationEpoch(epoch) {
    if (!Number.isInteger(epoch) || epoch <= this.authorizationEpoch)
      throw new Error("authorization epoch must increase");
    this.authorizationEpoch = epoch;
  }
  snapshot() {
    return JSON.stringify({
      protocolVersion: this.protocolVersion,
      compatibleProtocolVersions: [...this.protocolVersions].filter(
        (version) => version !== this.protocolVersion,
      ),
      authorizationEpoch: this.authorizationEpoch,
      timeoutMs: this.timeoutMs,
      startupTimeoutMs: this.startupTimeoutMs,
      maxConcurrent: this.maxConcurrent,
      maxQueued: this.maxQueued,
      maxDegradationReceipts: this.maxDegradationReceipts,
      enabled: this.#enabled,
      workers: [...this.#workers.values()]
        .filter((row) => row.kind === "inline")
        .map(({ descriptor, lifecycle }) => ({ descriptor, lifecycle })),
    });
  }
  static restore(snapshot, workerResolver) {
    const state = JSON.parse(snapshot);
    const host = new ExtensionHost(state);
    for (const item of state.workers)
      host.register(item.descriptor, workerResolver(item.descriptor));
    if (!state.enabled) host.disable();
    return host;
  }
  #record(id, reason, envelope = {}) {
    this.#degradations.push(
      Object.freeze({
        extensionId: id,
        reason,
        requestId: envelope.requestId ?? null,
        channel: envelope.channel ?? null,
        scope: envelope.scope ?? null,
        at: new Date().toISOString(),
      }),
    );
    while (this.#degradations.length > this.maxDegradationReceipts) this.#degradations.shift();
  }
  degradations() {
    return structuredClone(this.#degradations);
  }
  async #ensureProcess(record) {
    if (record.kind !== "process" || !record.worker.exited) return;
    await this.#recoverExitedProcess(record);
    if (record.worker.exited) throw new Error("worker restart budget exhausted");
  }
  invoke(id, envelope) {
    if (!this.#enabled) return Promise.reject(new Error("extension discovery disabled"));
    const registered = this.#workers.get(id);
    if (!registered) return Promise.reject(new Error(`unknown extension ${id}`));
    if (registered.lifecycle === "stopped" || registered.lifecycle === "stopping")
      return Promise.reject(new Error(`extension ${id} is disabled or stopped`));
    if (this.channel && envelope && !envelope.channel) {
      envelope = { ...envelope, channel: this.channel };
    }
    if (
      !envelope?.requestId ||
      !this.protocolVersions.has(envelope.protocolVersion) ||
      !envelope.channel ||
      !envelope.scope ||
      !envelope.capability ||
      !Number.isInteger(envelope.authorizationEpoch)
    )
      return Promise.reject(
        new Error("envelope identity or capability is incomplete or incompatible"),
      );
    if (envelope.authorizationEpoch !== this.authorizationEpoch)
      return Promise.reject(new Error("authorization epoch is stale or untrusted"));
    if (envelope.transferArtifact)
      return Promise.reject(new Error("caller-supplied input transfer artifacts are prohibited"));
    if (envelope.artifactRef && envelope.artifactRef.channel !== envelope.channel)
      return Promise.reject(new Error("artifact channel mismatch"));
    if (envelope.artifactRef && envelope.artifactRef.scope !== envelope.scope)
      return Promise.reject(new Error("artifact scope mismatch"));
    const inlineBytes = Buffer.byteLength(JSON.stringify(envelope.payload ?? null));
    if (inlineBytes > 16 * 1024 && registered.kind !== "process")
      return Promise.reject(new Error("oversized inline-worker payload is prohibited"));
    const hostReadCapability =
      registered.kind === "process" && envelope.capability === "extension-output:read";
    if (
      envelope.capability &&
      !hostReadCapability &&
      !registered.descriptor.capabilities.includes(envelope.capability)
    )
      return Promise.reject(new Error("capability denied"));
    if (envelope.signal?.aborted) {
      this.#record(id, "cancelled", envelope);
      return Promise.reject(new Error("extension invocation cancelled"));
    }
    if (this.#active >= this.maxConcurrent && this.#queue.length >= this.maxQueued) {
      this.#record(id, "queue_overflow", envelope);
      return Promise.reject(new Error("extension queue capacity exceeded"));
    }
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.#active += 1;
        let timer;
        let abort;
        try {
          await this.#ensureProcess(registered);
          const timeout = new Promise((_, timeoutReject) => {
            timer = setTimeout(() => {
              if (registered.kind === "process") void registered.worker.terminate();
              timeoutReject(new Error("timeout"));
            }, this.timeoutMs);
          });
          const cancellation = new Promise((_, cancelReject) => {
            abort = () => {
              if (registered.kind === "process") void registered.worker.terminate();
              cancelReject(new Error("cancelled"));
            };
            envelope.signal?.addEventListener("abort", abort, { once: true });
          });
          const invocation =
            registered.kind === "process"
              ? registered.worker.invoke({ ...envelope, signal: undefined })
              : registered.worker(envelope);
          resolve(await Promise.race([Promise.resolve(invocation), timeout, cancellation]));
        } catch (error) {
          const reason =
            error.message === "timeout"
              ? "timeout"
              : error.message === "cancelled"
                ? "cancelled"
                : "worker_error";
          this.#record(id, reason, envelope);
          reject(new Error(`extension ${id} failed: ${error.message}`, { cause: error }));
        } finally {
          clearTimeout(timer);
          if (abort) envelope.signal?.removeEventListener("abort", abort);
          this.#active -= 1;
          const next = this.#queue.shift();
          if (next) queueMicrotask(next);
        }
      };
      if (this.#active < this.maxConcurrent) void execute();
      else this.#queue.push(execute);
    });
  }
  async shutdown() {
    for (const record of this.#workers.values())
      if (record.kind === "process") {
        record.autoRestart = false;
        await record.worker.stop();
      }
    await this.#journal({ type: "shutdown" });
  }
  health() {
    return {
      available: true,
      enabled: this.#enabled,
      extensions: [...this.#workers.keys()].sort(),
      active: this.#active,
      queued: this.#queue.length,
      degradationCount: this.#degradations.length,
      routingAvailable: true,
      pendingAcknowledgements: [...this.#workers.values()].reduce(
        (sum, row) => sum + (row.worker?.pending?.size ?? 0),
        0,
      ),
      restartCount: this.#restartCount,
      workerStates: this.listExtensionStates(),
    };
  }
}

export class ExtensionSupervisor {
  #workers = new Map();
  #failures = [];
  constructor({ factory, maxRestarts = 3, restartBackoffMs = 0 }) {
    if (typeof factory !== "function") throw new Error("worker factory required");
    this.factory = factory;
    this.maxRestarts = maxRestarts;
    this.restartBackoffMs = restartBackoffMs;
  }
  async ensure(id) {
    for (let attempt = 0; attempt <= this.maxRestarts; attempt += 1) {
      if (attempt) await delay(this.restartBackoffMs * 2 ** (attempt - 1));
      const worker = await this.factory(id, attempt);
      if (!worker?.exited) {
        this.#workers.set(id, worker);
        return { id, status: "ready", restarts: attempt };
      }
      this.#failures.push({ id, attempt, reason: "startup_exit" });
    }
    return { id, status: "degraded", restarts: this.maxRestarts };
  }
  stop(id) {
    this.#workers.delete(id);
    return { id, status: "stopped" };
  }
  health() {
    return {
      available: true,
      routingAvailable: true,
      readyWorkers: this.#workers.size,
      boundedFailureCount: this.#failures.length,
    };
  }
}
