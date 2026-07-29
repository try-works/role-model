import { existsSync, readFileSync } from "node:fs";

let configuredBridgeStatePath: string | undefined;

export function configureKwPromptInjectHost(input: {
  readonly bridgeStatePath?: string;
}): void {
  configuredBridgeStatePath = input.bridgeStatePath?.trim() || undefined;
}

export function getConfiguredKwPromptInjectBridgeStatePath(): string | undefined {
  return configuredBridgeStatePath;
}

export function readDurableKwProductionActivation(
  bridgeStatePath = configuredBridgeStatePath,
): boolean {
  if (!bridgeStatePath || !existsSync(bridgeStatePath)) return false;
  try {
    const state = JSON.parse(readFileSync(bridgeStatePath, "utf8")) as {
      readonly extensions?: readonly {
        readonly id?: string;
        readonly productionActivation?: boolean;
        readonly health?: { readonly productionActivation?: boolean };
      }[];
      readonly revision?: string | number;
    };
    const kw = state.extensions?.find((row) => row.id === "knowledge-worker");
    return (
      kw?.productionActivation === true || kw?.health?.productionActivation === true
    );
  } catch {
    return false;
  }
}

export function readDurableKwJoinSessionId(
  bridgeStatePath = configuredBridgeStatePath,
): string | undefined {
  if (!bridgeStatePath || !existsSync(bridgeStatePath)) return undefined;
  try {
    const state = JSON.parse(readFileSync(bridgeStatePath, "utf8")) as {
      readonly revision?: string | number;
    };
    if (state.revision === undefined || state.revision === null) return "runtime-default";
    return String(state.revision);
  } catch {
    return undefined;
  }
}

export type KwAutoArmRequestOptions = {
  readonly sessionId?: string;
  readonly kwProductionActivation?: boolean;
};

/**
 * Host-derived bounded retrieve query for live chat/completions when KW is ON.
 * Request-time retrieve authority stays on the host; clients do not supply this.
 */
export function deriveDefaultKwPromptInjectQuery(
  messages: readonly { readonly role: string; readonly content?: unknown }[],
):
  | {
      readonly scopeId: string;
      readonly query: string;
      readonly filters: { readonly activeOnly: true; readonly sensitivityMax: "private" };
      readonly limit: number;
    }
  | undefined {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  let text = "";
  if (typeof lastUser?.content === "string") {
    text = lastUser.content;
  } else if (Array.isArray(lastUser?.content)) {
    text = lastUser.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join(" ");
  }
  const terms = text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (!terms.length) return undefined;
  return {
    scopeId: "runtime-default",
    query: terms.slice(0, 12).join(" "),
    filters: { activeOnly: true, sensitivityMax: "private" },
    limit: 5,
  };
}

/**
 * Auto-arm inject from durable host KW production activation (FD8).
 * Does not trust client headers for activation; only durable bridge state.
 * KW join session is host-owned (durable bridge revision), not client session headers.
 */
export function withKwProductionAutoArm<T extends KwAutoArmRequestOptions>(
  requestOptions: T | undefined,
): (T & { readonly sessionId: string; readonly kwProductionActivation: true }) | T | undefined {
  const durableOn = readDurableKwProductionActivation();
  if (!durableOn) return requestOptions;
  const sessionId = readDurableKwJoinSessionId() || "runtime-default";
  return {
    ...(requestOptions ?? ({} as T)),
    sessionId,
    kwProductionActivation: true as const,
  };
}
