export const SESSION_BOOTSTRAP_STAGE_ORDER = [
  "credentials",
  "endpoints",
  "peers",
  "vendors",
  "local-reload",
  "remote-health",
  "inventory",
] as const;

export type BootstrapStageId = (typeof SESSION_BOOTSTRAP_STAGE_ORDER)[number];

export type BootstrapStageStatus =
  | "pending"
  | "running"
  | "ready"
  | "degraded"
  | "failed"
  | "skipped";

export type SessionBootstrapStatus =
  | "pending"
  | "running"
  | "ready"
  | "degraded"
  | "blocked";

export interface BootstrapStageReceipt {
  readonly stageId: BootstrapStageId;
  readonly status: BootstrapStageStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
}

export interface SessionBootstrapState {
  readonly status: SessionBootstrapStatus;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly stages: readonly BootstrapStageReceipt[];
}

export interface BootstrapStageResult {
  readonly status: BootstrapStageStatus;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
}

export interface SessionBootstrapHandlers {
  readonly credentials: () => Promise<BootstrapStageResult>;
  readonly endpoints: () => Promise<BootstrapStageResult>;
  readonly peers: () => Promise<BootstrapStageResult>;
  readonly vendors: () => Promise<BootstrapStageResult>;
  readonly localReload: () => Promise<BootstrapStageResult>;
  readonly remoteHealth: () => Promise<BootstrapStageResult>;
  readonly inventory: () => Promise<BootstrapStageResult>;
}

const STAGE_HANDLER_KEYS: Record<
  BootstrapStageId,
  keyof SessionBootstrapHandlers
> = {
  credentials: "credentials",
  endpoints: "endpoints",
  peers: "peers",
  vendors: "vendors",
  "local-reload": "localReload",
  "remote-health": "remoteHealth",
  inventory: "inventory",
};

export function createPendingBootstrapState(): SessionBootstrapState {
  return {
    status: "pending",
    startedAt: null,
    finishedAt: null,
    stages: [],
  };
}

export function summarizeSessionBootstrapStatus(
  stages: readonly BootstrapStageReceipt[],
  running: boolean,
): SessionBootstrapStatus {
  if (running) {
    return "running";
  }
  if (stages.length === 0) {
    return "pending";
  }
  if (stages.some((stage) => stage.stageId === "credentials" && stage.status === "failed")) {
    return "blocked";
  }
  if (stages.some((stage) => stage.status === "failed" || stage.status === "degraded")) {
    return "degraded";
  }
  if (stages.every((stage) => stage.status === "ready" || stage.status === "skipped")) {
    return "ready";
  }
  return "pending";
}

async function runStage(
  stageId: BootstrapStageId,
  handler: () => Promise<BootstrapStageResult>,
): Promise<BootstrapStageReceipt> {
  const startedAt = new Date().toISOString();
  try {
    const result = await handler();
    return {
      stageId,
      status: result.status,
      startedAt,
      finishedAt: new Date().toISOString(),
      ...(result.message ? { message: result.message } : {}),
      ...(result.details ? { details: result.details } : {}),
    };
  } catch (error) {
    return {
      stageId,
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "bootstrap stage failed",
    };
  }
}

export async function runSessionBootstrapStages(
  handlers: SessionBootstrapHandlers,
): Promise<SessionBootstrapState> {
  const startedAt = new Date().toISOString();
  const stages: BootstrapStageReceipt[] = [];

  for (const stageId of SESSION_BOOTSTRAP_STAGE_ORDER) {
    const handlerKey = STAGE_HANDLER_KEYS[stageId];
    stages.push(await runStage(stageId, handlers[handlerKey]));
  }

  return {
    status: summarizeSessionBootstrapStatus(stages, false),
    startedAt,
    finishedAt: new Date().toISOString(),
    stages,
  };
}
