import { spawn } from "node:child_process";
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineExtension, encodeFrame, extractFrames, verifySignedBundle } from "../extension-sdk/index.mjs";

const runtimePath = fileURLToPath(new URL("./worker-runtime.mjs", import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeModuleUrl = (value) => value instanceof URL ? value.href : value.startsWith("file:") ? value : pathToFileURL(value).href;

class ProcessWorker {
  constructor(moduleUrl, onExit, startupTimeoutMs) { this.moduleUrl = normalizeModuleUrl(moduleUrl); this.onExit = onExit; this.startupTimeoutMs = startupTimeoutMs; this.pending = new Map(); this.child = null; this.exited = true; this.stopping = false; }
  async start() {
    if (this.child && !this.exited) return;
    this.exited = false;
    this.child = spawn(process.execPath, [runtimePath, this.moduleUrl], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let bytes = Buffer.alloc(0), settled = false, rejectReady;
    const ready = new Promise((resolve, reject) => {
      rejectReady = reject;
      this.child.once("error", reject);
      this.child.stdout.on("data", chunk => {
        bytes = Buffer.concat([bytes, chunk]);
        const parsed = extractFrames(bytes); bytes = parsed.remainder;
        for (const message of parsed.values) {
          if (message.type === "ready") { settled = true; this.pid = message.pid; resolve(); continue; }
          const pending = this.pending.get(message.requestId); if (!pending) continue;
          this.pending.delete(message.requestId);
          this.child?.stdin.write(encodeFrame({type:"ack",requestId:message.requestId}));
          if (message.type === "result") pending.resolve({ ...message.result, workerPid: this.pid }); else pending.reject(new Error(message.error));
        }
      });
    });
    this.child.once("exit", (code, signal) => { const expected=this.stopping; this.exited = true; for (const item of this.pending.values()) item.reject(new Error("worker exited")); this.pending.clear(); if (!settled) rejectReady(new Error(`worker exited during startup (${code ?? signal})`)); if(!expected)this.onExit?.(code,signal); });
    let timer;
    try { await Promise.race([ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("worker startup timeout")), this.startupTimeoutMs); })]); }
    catch (error) { if (!this.exited) this.child.kill(); throw error; }
    finally { clearTimeout(timer); }
  }
  invoke(envelope) { if(this.exited||!this.child)return Promise.reject(new Error("worker exited")); return new Promise((resolve, reject) => { this.pending.set(envelope.requestId, { resolve, reject }); this.child.stdin.write(encodeFrame({ type: "invoke", requestId: envelope.requestId, envelope }),(error)=>{if(error){this.pending.delete(envelope.requestId);reject(error);}}); }); }
  async stop() { if (!this.child || this.exited) return; this.stopping=true; const child=this.child; child.stdin.write(encodeFrame({type:"shutdown"})); await new Promise(resolve=>{const timer=setTimeout(()=>{if(!this.exited)child.kill();},250);child.once("exit",()=>{clearTimeout(timer);resolve();});}); this.child=null; }
}

export class ExtensionHost {
  #enabled = true; #workers = new Map(); #active = 0; #queue = []; #degradations = []; #restartCount=0;
  constructor({ protocolVersion, compatibleProtocolVersions = [], authorizationEpoch = 0, timeoutMs = 1_000, startupTimeoutMs = 2_000, maxConcurrent = 8, maxQueued = 64, maxDegradationReceipts = 64, journalPath=null, maxRestarts=3, restartBackoffMs=10 }) {
    this.protocolVersion = protocolVersion;
    this.protocolVersions = new Set([protocolVersion, ...compatibleProtocolVersions]);
    this.timeoutMs = timeoutMs;
    this.startupTimeoutMs = startupTimeoutMs;
    this.authorizationEpoch = authorizationEpoch;
    this.maxConcurrent = maxConcurrent;
    this.maxQueued = maxQueued;
    this.maxDegradationReceipts = maxDegradationReceipts;
    this.journalPath=journalPath;this.maxRestarts=maxRestarts;this.restartBackoffMs=restartBackoffMs;
  }
  #validateDescriptor(descriptor){descriptor=defineExtension(descriptor);if(!this.protocolVersions.has(descriptor.protocolVersion))throw new Error("protocol version mismatch");if(this.#workers.has(descriptor.id))throw new Error(`duplicate extension ${descriptor.id}`);return descriptor;}
  async #journal(event){if(!this.journalPath)return;await mkdir(dirname(this.journalPath),{recursive:true});await appendFile(this.journalPath,`${JSON.stringify({...event,at:new Date().toISOString()})}\n`,"utf8");}
  register(descriptor, worker) {
    descriptor = this.#validateDescriptor(descriptor);
    if(typeof worker!=="function")throw new Error("worker function required");
    this.#workers.set(descriptor.id, { descriptor, worker, kind: "inline", lifecycle: "ready" });
  }
  async registerProcess(descriptor, moduleUrl,{journal=true}={}) {
    descriptor=this.#validateDescriptor(descriptor);const normalized=normalizeModuleUrl(moduleUrl);
    const record={descriptor,moduleUrl:normalized,kind:"process",lifecycle:"starting",restarts:0};record.worker=new ProcessWorker(normalized,()=>{record.lifecycle="exited";},this.startupTimeoutMs);this.#workers.set(descriptor.id,record);
    try{await record.worker.start();record.lifecycle="ready";}catch(error){this.#workers.delete(descriptor.id);throw error;}
    if(journal)await this.#journal({type:"installed",descriptor,moduleUrl:normalized});
  }
  async install(bundle, signingKey){const verified=verifySignedBundle(bundle,signingKey),descriptor=defineExtension(verified.manifest);if(!descriptor.entrypoint)throw new Error("manifest entrypoint is required");const moduleUrl=verified.payload?.moduleUrl;if(typeof moduleUrl!=="string"||!moduleUrl.endsWith(`/${descriptor.entrypoint}`))throw new Error("bundle module URL does not match manifest entrypoint");await this.registerProcess(descriptor,moduleUrl);}
  async restoreJournal(){if(!this.journalPath)throw new Error("journal path required");let content;try{content=await readFile(this.journalPath,"utf8");}catch(error){if(error.code==="ENOENT")return;throw error;}const latest=new Map();for(const line of content.split(/\r?\n/).filter(Boolean)){const row=JSON.parse(line);if(row.type==="installed")latest.set(row.descriptor.id,row);}for(const row of latest.values())if(!this.#workers.has(row.descriptor.id))await this.registerProcess(row.descriptor,row.moduleUrl,{journal:false});}
  disable() { this.#enabled = false; }
  rotateAuthorizationEpoch(epoch){if(!Number.isInteger(epoch)||epoch<=this.authorizationEpoch)throw new Error("authorization epoch must increase");this.authorizationEpoch=epoch;}
  snapshot() {
    return JSON.stringify({ protocolVersion: this.protocolVersion, compatibleProtocolVersions: [...this.protocolVersions].filter((version) => version !== this.protocolVersion), authorizationEpoch:this.authorizationEpoch,timeoutMs: this.timeoutMs,startupTimeoutMs:this.startupTimeoutMs,maxConcurrent: this.maxConcurrent, maxQueued: this.maxQueued, maxDegradationReceipts: this.maxDegradationReceipts, enabled: this.#enabled, workers: [...this.#workers.values()].filter(row=>row.kind==="inline").map(({ descriptor, lifecycle }) => ({ descriptor, lifecycle })) });
  }
  static restore(snapshot, workerResolver) {
    const state = JSON.parse(snapshot);
    const host = new ExtensionHost(state);
    for (const item of state.workers) host.register(item.descriptor, workerResolver(item.descriptor));
    if (!state.enabled) host.disable();
    return host;
  }
  #record(id, reason, envelope = {}) {
    this.#degradations.push(Object.freeze({ extensionId: id, reason, requestId: envelope.requestId ?? null, channel: envelope.channel ?? null, scope: envelope.scope ?? null, at: new Date().toISOString() }));
    while (this.#degradations.length > this.maxDegradationReceipts) this.#degradations.shift();
  }
  degradations() { return structuredClone(this.#degradations); }
  async #ensureProcess(record){if(record.kind!=="process"||!record.worker.exited)return;if(record.restarts>=this.maxRestarts)throw new Error("worker restart budget exhausted");await delay(this.restartBackoffMs*(2**record.restarts));record.restarts+=1;this.#restartCount+=1;record.worker.stopping=false;await record.worker.start();record.lifecycle="ready";await this.#journal({type:"restarted",extensionId:record.descriptor.id,restart:record.restarts});}
  invoke(id, envelope) {
    if (!this.#enabled) return Promise.reject(new Error("extension discovery disabled"));
    const registered = this.#workers.get(id); if (!registered) return Promise.reject(new Error(`unknown extension ${id}`));
    if (!envelope?.requestId || !this.protocolVersions.has(envelope.protocolVersion) || !envelope.channel || !envelope.scope || !Number.isInteger(envelope.authorizationEpoch)) return Promise.reject(new Error("envelope identity is incomplete or incompatible"));
    if (envelope.authorizationEpoch !== this.authorizationEpoch) return Promise.reject(new Error("authorization epoch is stale or untrusted"));
    if (envelope.artifactRef && envelope.artifactRef.channel !== envelope.channel) return Promise.reject(new Error("artifact channel mismatch"));
    if (envelope.artifactRef && envelope.artifactRef.scope !== envelope.scope) return Promise.reject(new Error("artifact scope mismatch"));
    const inlineBytes = Buffer.byteLength(JSON.stringify(envelope.payload ?? null));
    if (inlineBytes > 16 * 1024 && (!envelope.transferArtifact || envelope.transferArtifact.channel !== envelope.channel || envelope.transferArtifact.scope !== envelope.scope)) return Promise.reject(new Error("oversized payload requires a channel-local transfer artifact"));
    if (envelope.capability && !registered.descriptor.capabilities.includes(envelope.capability)) return Promise.reject(new Error("capability denied"));
    if (envelope.signal?.aborted) { this.#record(id, "cancelled", envelope); return Promise.reject(new Error("extension invocation cancelled")); }
    if (this.#active >= this.maxConcurrent && this.#queue.length >= this.maxQueued) { this.#record(id, "queue_overflow", envelope); return Promise.reject(new Error("extension queue capacity exceeded")); }
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.#active += 1;
        let timer; let abort;
        try {
          await this.#ensureProcess(registered);
          const timeout = new Promise((_, timeoutReject) => { timer = setTimeout(() => timeoutReject(new Error("timeout")), this.timeoutMs); });
          const cancellation = new Promise((_, cancelReject) => { abort = () => cancelReject(new Error("cancelled")); envelope.signal?.addEventListener("abort", abort, { once: true }); });
          const invocation=registered.kind==="process"?registered.worker.invoke({...envelope,signal:undefined}):registered.worker(envelope);
          resolve(await Promise.race([Promise.resolve(invocation), timeout, cancellation]));
        } catch (error) { const reason = error.message === "timeout" ? "timeout" : error.message === "cancelled" ? "cancelled" : "worker_error"; this.#record(id, reason, envelope); reject(new Error(`extension ${id} failed: ${error.message}`, { cause: error })); }
        finally {
          clearTimeout(timer);
          if (abort) envelope.signal?.removeEventListener("abort", abort);
          this.#active -= 1;
          const next = this.#queue.shift();
          if (next) queueMicrotask(next);
        }
      };
      if (this.#active < this.maxConcurrent) void execute(); else this.#queue.push(execute);
    });
  }
  async shutdown(){for(const record of this.#workers.values())if(record.kind==="process")await record.worker.stop();await this.#journal({type:"shutdown"});}
  health() { return { available: true, enabled: this.#enabled, extensions: [...this.#workers.keys()].sort(), active: this.#active, queued: this.#queue.length, degradationCount: this.#degradations.length, routingAvailable: true, pendingAcknowledgements:[...this.#workers.values()].reduce((sum,row)=>sum+(row.worker?.pending?.size??0),0),restartCount:this.#restartCount }; }
}

export class ExtensionSupervisor {
  #workers = new Map(); #failures = [];
  constructor({ factory, maxRestarts = 3, restartBackoffMs=0 }) { if (typeof factory !== "function") throw new Error("worker factory required"); this.factory = factory; this.maxRestarts = maxRestarts; this.restartBackoffMs=restartBackoffMs; }
  async ensure(id) {
    for (let attempt = 0; attempt <= this.maxRestarts; attempt += 1) {
      if(attempt)await delay(this.restartBackoffMs*(2**(attempt-1)));
      const worker = await this.factory(id, attempt);
      if (!worker?.exited) { this.#workers.set(id, worker); return { id, status: "ready", restarts: attempt }; }
      this.#failures.push({ id, attempt, reason: "startup_exit" });
    }
    return { id, status: "degraded", restarts: this.maxRestarts };
  }
  stop(id) { this.#workers.delete(id); return { id, status: "stopped" }; }
  health() { return { available: true, routingAvailable: true, readyWorkers: this.#workers.size, boundedFailureCount: this.#failures.length }; }
}
