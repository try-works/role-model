import { createRoleModelConfig, type RoleModelPackageConfig } from "./config.js";
import { validateDownstreamOpenAIDiscovery } from "./downstream-openai.js";
import type { DiscoveryResult } from "./types.js";

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverRoleModelRuntime(
  input: Partial<RoleModelPackageConfig> = {},
): Promise<DiscoveryResult> {
  const config = createRoleModelConfig(input);
  const [version, discoveryPayload] = await Promise.all([
    fetchJson(`${config.endpoint}/api/version`, config.requestTimeoutMs).catch(() => undefined),
    fetchJson(`${config.endpoint}/api/role-model/downstream/openai`, config.requestTimeoutMs),
  ]);

  return {
    discovery: validateDownstreamOpenAIDiscovery(discoveryPayload),
    version: typeof version === "object" && version !== null ? (version as Record<string, unknown>) : undefined,
  };
}
