import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures");
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("Track B operations APIs", () => {
  test("serves extension lifecycle and storage retention through bounded callbacks", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({ repoRoot, fixtureRoot, runtimeStateRoot, scopeId: "track-b-operations" });
    const extensions = [{ id: "artifact-store", packageClass: "canonical_extension", lifecycle: "ready", installed: true, enabled: true, channel: "production", scope: "global", authorizationEpoch: 2, health: { available: true, routingDependency: false }, permissions: ["graph:write"], dataClasses: ["rich_artifact"], retention: "policy_bound", degradation: "routing_continues", compatibility: ["N/N", "N/N-1"] }];
    const summary = { totalBytes: 100, categories: [{ id: "graph", tier: "canonical", scope: "global", bytes: 100, count: 2 }], managedPolicy: false, conflicts: [], receipts: [], activeJob: null };
    let dryRunCount = 0;
    const server = await startBridgeServer({ host: "127.0.0.1", port: 0, registry: backend.registry, getRegistry: () => backend.registry, executeChatCompletions: backend.executeChatCompletions, executeResponses: backend.executeResponses, listExtensions: async () => extensions, readStorageRetention: async () => summary, dryRunStorageRetention: async () => ({ ...summary, receipts: [{ id: `dry-${++dryRunCount}`, status: "preview", affectedCount: 2, rollbackAvailable: true }] }) });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      expect(await (await fetch(`${base}/api/role-model/extensions`)).json()).toEqual(extensions);
      expect(await (await fetch(`${base}/api/role-model/storage-retention`)).json()).toEqual(summary);
      const dryRun = await fetch(`${base}/api/role-model/storage-retention/dry-run`, { method: "POST" });
      expect(dryRun.status).toBe(200);
      expect((await dryRun.json()).receipts[0].id).toBe("dry-1");
    } finally { await server.close(); await backend.shutdown(); }
  });

  test("fails closed when an operations capability is not wired", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-operations-absent-${Date.now()}`);
    roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({ repoRoot, fixtureRoot, runtimeStateRoot, scopeId: "track-b-operations-absent" });
    const server = await startBridgeServer({ host: "127.0.0.1", port: 0, registry: backend.registry, getRegistry: () => backend.registry, executeChatCompletions: backend.executeChatCompletions, executeResponses: backend.executeResponses });
    try { expect((await fetch(`http://127.0.0.1:${server.port}/api/role-model/extensions`)).status).toBe(404); }
    finally { await server.close(); await backend.shutdown(); }
  });

  test("production backend never infers extension health from the catalog", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `track-b-production-absent-${Date.now()}`); roots.push(runtimeStateRoot);
    const backend = await createRuntimeBridgeBackend({ repoRoot, fixtureRoot, runtimeStateRoot, scopeId: "production" });
    try { const rows=await backend.listExtensions() as readonly {installed:boolean;lifecycle:string;health:{available:boolean}}[]; expect(rows).toHaveLength(13); expect(rows.every(row=>!row.installed&&row.lifecycle==="unavailable"&&!row.health.available)).toBe(true); }
    finally { await backend.shutdown(); }
  });

  test("production backend reads and atomically updates real bridge storage state", async () => {
    const runtimeStateRoot=path.join(os.tmpdir(),`track-b-production-state-${Date.now()}`),scopeId="production",directory=path.join(runtimeStateRoot,scopeId);roots.push(runtimeStateRoot);await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,"track-b-production-bridge.json"),JSON.stringify({schemaVersion:"role-model.track-b-production-bridge.v1",protocolVersion:"1.0",revision:7,generatedAt:new Date().toISOString(),extensions:[{id:"artifact-store",lifecycle:"ready",enabled:true,channel:"production",scope:"global",authorizationEpoch:3,health:{available:true,routingDependency:false}}],storageServices:[{id:"artifact-store",category:"rich_trace",tier:"canonical",scope:"global",bytes:100,count:2,holds:1,leases:0,conflicts:[]},{id:"event-log",category:"routing_only",tier:"hot",scope:"global",bytes:40,count:4,holds:0,leases:1,conflicts:[]}],retention:{managedPolicy:false,receipts:[],activeJob:null}}));
    const backend=await createRuntimeBridgeBackend({repoRoot,fixtureRoot,runtimeStateRoot,scopeId});try{const extensions=await backend.listExtensions() as readonly {id:string;installed:boolean;health:{available:boolean}}[];expect(extensions.find(row=>row.id==="artifact-store")).toMatchObject({installed:true,health:{available:true}});expect(extensions.filter(row=>row.installed)).toHaveLength(1);expect(await backend.readStorageRetention()).toMatchObject({revision:7,totalBytes:140,holds:1,leases:1});const next=await backend.dryRunStorageRetention() as {revision:number;receipts:readonly {affectedCount:number}[]};expect(next.revision).toBe(8);expect(next.receipts.at(-1)?.affectedCount).toBe(6);}finally{await backend.shutdown();}
  });
});
