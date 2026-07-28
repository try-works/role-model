export type KwPromptInjectReceipt = {
  readonly injected: boolean;
  readonly code?: string;
  readonly systemMessage?: string;
  readonly surface?: string;
  readonly plane?: string;
  readonly productionPromptInjection?: boolean;
  readonly truncated?: boolean;
  readonly payload?: unknown;
};

export type KwSessionWorker = {
  readonly promptInject: (input: Record<string, unknown>) => KwPromptInjectReceipt;
  readonly activate?: (policy: unknown) => unknown;
  readonly deactivate?: (policy: unknown) => unknown;
};

const kwSessions = new Map<string, KwSessionWorker>();

export function registerKwPromptInjectSession(sessionId: string, worker: KwSessionWorker): void {
  kwSessions.set(String(sessionId), worker);
}

export function unregisterKwPromptInjectSession(sessionId: string): void {
  kwSessions.delete(String(sessionId));
}

export function getKwPromptInjectSession(sessionId: string): KwSessionWorker | undefined {
  return kwSessions.get(String(sessionId));
}

export function clearKwPromptInjectSessionsForTests(): void {
  kwSessions.clear();
}

export type KwPrivateRunner = (envelope: Record<string, unknown>) => Promise<unknown>;

export type KwPromptInjectJoinInput = {
  readonly sessionId: string;
  readonly action: "activate" | "deactivate";
  readonly authority?: unknown;
  readonly value?: unknown;
  readonly policy?: unknown;
  readonly activatePolicy?: unknown;
  readonly run?: KwPrivateRunner;
  readonly worker?: KwSessionWorker;
};

export async function syncPrivateKnowledgeActivation(
  input: KwPromptInjectJoinInput,
): Promise<{ readonly ok: boolean; readonly code?: string; readonly result?: unknown }> {
  if (input.worker) {
    try {
      const result =
        input.action === "activate"
          ? input.worker.activate?.(input.policy)
          : input.worker.deactivate?.(input.policy);
      registerKwPromptInjectSession(input.sessionId, input.worker);
      if (input.action === "deactivate") {
        // keep session registered until explicit unregister; soft OFF still needs refuse path
      }
      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        code: "kw_prompt_inject_join_unsatisfied",
        result: String((error as Error)?.message ?? error),
      };
    }
  }
  if (!input.run) {
    return { ok: false, code: "kw_prompt_inject_join_unsatisfied" };
  }
  try {
    const result = await input.run({
      capability: input.action === "activate" ? "knowledge:activate" : "knowledge:deactivate",
      sessionId: input.sessionId,
      ...(input.authority ? { authority: input.authority } : {}),
      ...(input.value ? { value: input.value } : {}),
      ...(input.policy ? { policy: input.policy } : {}),
      ...(input.activatePolicy ? { activatePolicy: input.activatePolicy } : {}),
    });
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      code: "kw_prompt_inject_join_unsatisfied",
      result: String((error as Error)?.message ?? error),
    };
  }
}

export type ApplyKwPromptInjectInput = {
  readonly messages: readonly { readonly role: string; readonly content?: unknown }[];
  readonly hostProductionActivation: boolean;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly query?: Record<string, unknown>;
  readonly run?: KwPrivateRunner;
  readonly worker?: KwSessionWorker;
};

export type ApplyKwPromptInjectResult = {
  readonly messages: readonly { readonly role: string; readonly content?: unknown }[];
  readonly receipt: KwPromptInjectReceipt;
};

function refuseReceipt(code: string, extra: Partial<KwPromptInjectReceipt> = {}): KwPromptInjectReceipt {
  return {
    injected: false,
    code,
    surface: "applyRequestedRoleExecutionPolicy",
    ...extra,
  };
}

export function applyKwPromptInjectToMessagesSync(
  input: ApplyKwPromptInjectInput,
): ApplyKwPromptInjectResult {
  if (!input.hostProductionActivation) {
    return {
      messages: input.messages,
      receipt: refuseReceipt("kw_prompt_inject_requires_activation"),
    };
  }
  const worker =
    input.worker ??
    (input.sessionId ? getKwPromptInjectSession(input.sessionId) : undefined);
  if (!worker || !input.sessionId) {
    return {
      messages: input.messages,
      receipt: refuseReceipt("kw_prompt_inject_join_unsatisfied"),
    };
  }
  const receipt = worker.promptInject({
    injectContractVersion: 1,
    sessionId: input.sessionId,
    requestId: input.requestId,
    query: input.query,
  });
  if (!receipt?.injected || typeof receipt.systemMessage !== "string" || !receipt.systemMessage) {
    return {
      messages: input.messages,
      receipt: refuseReceipt(
        receipt?.code ?? "kw_prompt_inject_requires_production_retrieve",
        receipt ?? {},
      ),
    };
  }
  return {
    messages: [{ role: "system", content: receipt.systemMessage }, ...input.messages],
    receipt: {
      ...receipt,
      surface: "applyRequestedRoleExecutionPolicy",
    },
  };
}

export async function applyKwPromptInjectToMessages(
  input: ApplyKwPromptInjectInput,
): Promise<ApplyKwPromptInjectResult> {
  if (input.worker || (input.sessionId && getKwPromptInjectSession(input.sessionId))) {
    return applyKwPromptInjectToMessagesSync(input);
  }
  if (!input.hostProductionActivation) {
    return {
      messages: input.messages,
      receipt: refuseReceipt("kw_prompt_inject_requires_activation"),
    };
  }
  if (!input.run || !input.sessionId) {
    return {
      messages: input.messages,
      receipt: refuseReceipt("kw_prompt_inject_join_unsatisfied"),
    };
  }
  let receipt: KwPromptInjectReceipt;
  try {
    receipt = (await input.run({
      capability: "knowledge:prompt-inject",
      sessionId: input.sessionId,
      injectContractVersion: 1,
      requestId: input.requestId,
      query: input.query,
    })) as KwPromptInjectReceipt;
  } catch (error) {
    return {
      messages: input.messages,
      receipt: refuseReceipt("kw_prompt_inject_join_unsatisfied", {
        systemMessage: String((error as Error)?.message ?? error),
      }),
    };
  }
  if (!receipt?.injected || typeof receipt.systemMessage !== "string" || !receipt.systemMessage) {
    return {
      messages: input.messages,
      receipt: refuseReceipt(
        receipt?.code ?? "kw_prompt_inject_requires_production_retrieve",
        receipt ?? {},
      ),
    };
  }
  return {
    messages: [{ role: "system", content: receipt.systemMessage }, ...input.messages],
    receipt: {
      ...receipt,
      surface: "applyRequestedRoleExecutionPolicy",
    },
  };
}
