import { releaseHostResources, type HostReleaseError, type HostReleaseResult } from "./release-host-resources.js";

export const HOST_RUNTIME_KINDS = ["server", "packagedRuntime", "backend", "extensionRuntimeOwner", "extensionRuntime"] as const;
export type HostRuntimeKind = (typeof HOST_RUNTIME_KINDS)[number];

export interface HostRuntimeRegistration {
  readonly close: () => Promise<void>;
  readonly kind: HostRuntimeKind;
}

export interface HostRuntimeScope {
  close: () => Promise<HostReleaseResult>;
  register: (kind: HostRuntimeKind, close: () => Promise<void>) => void;
  registered: () => readonly HostRuntimeKind[];
}

export const createHostRuntimeScope = (): HostRuntimeScope => {
  const entries = new Map<HostRuntimeKind, () => Promise<void>>();
  let closed = false;
  return {
    async close() {
      if (closed) return { errors: [], released: [] };
      closed = true;
      const resources: Record<string, (() => Promise<void>) | undefined> = {};
      for (const [kind, close] of entries) resources[kind] = close;
      return releaseHostResources(resources as Parameters<typeof releaseHostResources>[0]);
    },
    register(kind, close) {
      if (closed) throw new Error("Host runtime scope is already closed");
      if (entries.has(kind)) throw new Error("Host runtime resource already registered: " + kind);
      entries.set(kind, close);
    },
    registered() {
      return [...entries.keys()];
    },
  };
};
