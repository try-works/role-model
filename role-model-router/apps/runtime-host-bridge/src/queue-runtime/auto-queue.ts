import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ReplayLedgerLimits } from "../track-b-replay-ledger.js";
import {
  DEFAULT_UNIFIED_RUNTIME_REPLAY_CONFIG,
  parseUnifiedRuntimeConfigText,
  resolveUnifiedRuntimeReplayConfig,
} from "../unified-runtime-config.js";

/**
 * Run 115: the Learning Overview's replay auto-queue cap.
 *
 * The queue plane already auto-enqueues admitted captures (the replay loop offers
 * them to `replay.dispatch`); this module is the persisted bound the operator edits
 * through `GET/PUT /api/role-model/runtime/config`. The cap maps onto the replay
 * ledger's daily counterfactual ceiling, which is the durable accounting the
 * admission path already consults before reserving an automatic replay.
 */
export const DEFAULT_AUTO_QUEUE_DAILY_CAP =
  DEFAULT_UNIFIED_RUNTIME_REPLAY_CONFIG.autoQueue.dailyCap;

export interface AutoQueueSettings {
  readonly dailyCap: number;
  readonly enabled: boolean;
}

/** Reads `replay.auto_queue` from the scope's runtime config; absent/broken means the safe default. */
export function resolveAutoQueueSettings(configPath?: string): AutoQueueSettings {
  if (!configPath) return { ...DEFAULT_UNIFIED_RUNTIME_REPLAY_CONFIG.autoQueue };
  try {
    const config = parseUnifiedRuntimeConfigText(readFileSync(configPath, "utf8"));
    return resolveUnifiedRuntimeReplayConfig(config).autoQueue;
  } catch {
    // A missing or invalid document must not disable the queue plane; the
    // documented default (100/day) is the same value a fresh config ships.
    return { ...DEFAULT_UNIFIED_RUNTIME_REPLAY_CONFIG.autoQueue };
  }
}

/**
 * The host's unified config path resolution, mirrored here for the cap read:
 * explicit `--unified-runtime-config` first, then the root document, then the
 * legacy `state/runtime-config.yaml` document. The explicit path wins even when
 * no file exists yet, so a first PUT creates the document the host reads.
 */
export function resolveAutoQueueConfigPath(input: {
  readonly runtimeStateRoot: string;
  readonly unifiedRuntimeConfigPath?: string;
}): string {
  if (input.unifiedRuntimeConfigPath) return input.unifiedRuntimeConfigPath;
  const rootConfig = path.join(input.runtimeStateRoot, "runtime-config.yaml");
  if (existsSync(rootConfig)) return rootConfig;
  const legacyConfig = path.join(input.runtimeStateRoot, "state", "runtime-config.yaml");
  return existsSync(legacyConfig) ? legacyConfig : rootConfig;
}

export function resolveAutoQueueDailyCap(configPath?: string): number {
  return resolveAutoQueueSettings(configPath).dailyCap;
}

/**
 * Applies the configured cap to the ledger limits. `enabled: false` sets the
 * ceiling to zero so no automatic replay can be reserved while the operator has
 * switched auto-queueing off.
 */
export function applyAutoQueueDailyCap(
  limits: Partial<ReplayLedgerLimits>,
  dailyCap: number,
): Partial<ReplayLedgerLimits> {
  const counterfactualsPerDay = Number.isSafeInteger(dailyCap) && dailyCap >= 0 ? dailyCap : 0;
  return {
    ...limits,
    counterfactualsPerDay,
    // The hard ceiling is checked before the channel-scoped `enforced` guard, so a
    // disabled auto-queue or a configured cap binds on dev/stage as well.
    hardCounterfactualLimit: counterfactualsPerDay,
  };
}
