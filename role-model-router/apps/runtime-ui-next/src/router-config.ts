export interface RouterPostureSavePayload {
  readonly executionMode: string;
  readonly pinWeights: boolean;
  readonly mode: string;
  readonly scoringStrategy: string;
}

export interface RouterBlockSavePayload {
  readonly block: "agent_strategies" | "workloads";
  readonly json: string;
}

export interface RouterConfigClient {
  readonly saveBlock: (payload: RouterBlockSavePayload) => Promise<unknown>;
  readonly savePosture: (payload: RouterPostureSavePayload) => Promise<unknown>;
}

interface RouterConfigClientOptions {
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

const errorMessage = (body: unknown): string => {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Readonly<Record<string, unknown>>;
    const error = record.error;
    if (typeof error === "string" && error.length > 0) return error;
    if (typeof record.message === "string" && record.message.length > 0) return record.message;
  }
  return "runtime config update failed";
};

export const createRouterConfigClient = (
  options: RouterConfigClientOptions = {},
): RouterConfigClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const put = async (body: unknown): Promise<unknown> => {
    const response = await fetchImpl("/api/role-model/runtime/config", {
      body: JSON.stringify(body),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(options.token === undefined ? {} : { authorization: "Bearer " + options.token }),
      },
      method: "PUT",
    });
    const parsed: unknown = await response.json();
    if (!response.ok) throw new Error(errorMessage(parsed));
    return parsed;
  };
  return {
    saveBlock: async (payload) => {
      const parsed: unknown = JSON.parse(payload.json);
      return put({ [payload.block]: parsed, replace_blocks: true });
    },
    savePosture: async (payload) =>
      put({
        execution_mode: payload.executionMode,
        routing: { mode: payload.mode, pin_weights: payload.pinWeights, scoring_strategy: payload.scoringStrategy },
      }),
  };
};
