import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { KwSessionWorker } from "./kw-prompt-inject.js";

export type PrivateKnowledgeWorkerModule = {
  readonly KnowledgeWorker: new (options?: {
    readonly authority?: unknown;
    readonly filePath?: string;
  }) => KwSessionWorker & {
    readonly derive?: (value: unknown) => unknown;
    readonly bootstrapShadowReady?: (value: unknown) => unknown;
    readonly activate?: (policy: unknown) => unknown;
    readonly deactivate?: (policy: unknown) => unknown;
    readonly health?: () => { readonly productionActivation?: boolean };
  };
  readonly KnowledgeEvidenceAuthority: new (options: { readonly secret: string }) => {
    readonly issue: (claims: Record<string, unknown>) => unknown;
    readonly groupDigest: (group: unknown) => string;
    readonly verify: (receipt: unknown) => boolean;
  };
};

export interface Run88PrivateDistributionIdentity {
  readonly generation: "N" | "N-1" | string;
  readonly manifestSha256: string;
  readonly channel: string;
}

export function validateRun88PrivateDistributionIdentity(
  identity: Run88PrivateDistributionIdentity | null,
  expected: {
    readonly channel: "stage";
    readonly manifestSha256: string;
    readonly previousManifestSha256?: string;
    readonly publicGeneration: "N";
  },
) {
  if (!identity) {
    return { available: false, compatible: false, degradation: "public-routing-only" } as const;
  }
  if (identity.channel !== expected.channel)
    throw new Error("private distribution channel mismatch");
  if (
    !/^[a-f0-9]{64}$/.test(expected.manifestSha256) ||
    (expected.previousManifestSha256 !== undefined &&
      (!/^[a-f0-9]{64}$/.test(expected.previousManifestSha256) ||
        expected.previousManifestSha256 === expected.manifestSha256))
  ) {
    throw new Error("expected private distribution manifest identity is invalid");
  }
  const requiredManifestSha256 =
    identity.generation === "N-1"
      ? (expected.previousManifestSha256 ?? expected.manifestSha256)
      : expected.manifestSha256;
  if (
    !/^[a-f0-9]{64}$/.test(identity.manifestSha256) ||
    identity.manifestSha256 !== requiredManifestSha256
  ) {
    throw new Error("private distribution manifest identity mismatch");
  }
  if (expected.publicGeneration !== "N" || !new Set(["N", "N-1"]).has(identity.generation)) {
    throw new Error("private distribution generation is incompatible");
  }
  return { available: true, compatible: true, generation: identity.generation } as const;
}

export function resolvePrivateKnowledgeWorkerModulePath(
  distributionRoot?: string,
): string | undefined {
  const candidates: string[] = [];
  const root = distributionRoot?.trim() || process.env.ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT?.trim();
  if (root) {
    candidates.push(path.join(root, "extensions", "knowledge-worker.mjs"));
    candidates.push(path.join(root, "extensions", "knowledge-worker", "index.mjs"));
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export async function loadPrivateKnowledgeWorkerModule(
  distributionRoot?: string,
): Promise<{ readonly module: PrivateKnowledgeWorkerModule; readonly modulePath: string }> {
  const modulePath = resolvePrivateKnowledgeWorkerModulePath(distributionRoot);
  if (!modulePath) {
    throw new Error("knowledge-worker module not found in Track B distribution");
  }
  const module = (await import(pathToFileURL(modulePath).href)) as PrivateKnowledgeWorkerModule;
  if (typeof module.KnowledgeWorker !== "function") {
    throw new Error(`knowledge-worker module missing KnowledgeWorker: ${modulePath}`);
  }
  return { module, modulePath };
}

export type KwJoinWorkerFactory = (sessionId: string) => Promise<KwSessionWorker | undefined>;

export function createPrivateKwJoinWorkerFactory(options: {
  readonly distributionRoot: string;
  readonly authoritySecret?: string;
  readonly prepareWorker?: (
    worker: KwSessionWorker & {
      readonly derive?: (value: unknown) => unknown;
      readonly bootstrapShadowReady?: (value: unknown) => unknown;
      readonly activate?: (policy: unknown) => unknown;
      readonly deactivate?: (policy: unknown) => unknown;
      readonly authority?: unknown;
    },
    sessionId: string,
  ) => void | Promise<void>;
}): KwJoinWorkerFactory {
  const cache = new Map<string, KwSessionWorker>();
  let loadPromise:
    | Promise<{ readonly module: PrivateKnowledgeWorkerModule; readonly modulePath: string }>
    | undefined;

  return async (sessionId: string) => {
    const key = String(sessionId);
    const existing = cache.get(key);
    if (existing) return existing;
    loadPromise ??= loadPrivateKnowledgeWorkerModule(options.distributionRoot);
    const { module } = await loadPromise;
    const secret =
      options.authoritySecret?.trim() ||
      process.env.ROLE_MODEL_KW_AUTHORITY_SECRET?.trim() ||
      "role-model-packaged-kw-join";
    const authority = new module.KnowledgeEvidenceAuthority({ secret });
    const worker = new module.KnowledgeWorker({ authority });
    if (options.prepareWorker) {
      await options.prepareWorker(worker, key);
    }
    cache.set(key, worker);
    return worker;
  };
}
