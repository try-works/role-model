/**
 * Run 97 replay retention and receipt hygiene.
 *
 * Replay and counterfactual branch artifacts inherit the source capture's privacy
 * class and retention policy ids - classification is never loosened and no egress is
 * introduced. Receipts and ledger rows stay metadata-only: references, digests,
 * counters, and dispositions, never raw prompts, tool arguments, provider bodies, or
 * secrets.
 */

const REPLAY_ARTIFACT_KINDS = ["replay_branch", "counterfactual_branch"] as const;
export type ReplayArtifactKind = (typeof REPLAY_ARTIFACT_KINDS)[number];

const FORBIDDEN_RECEIPT_KEYS = [
  "messages",
  "message",
  "content",
  "prompt",
  "prompts",
  "systemPrompt",
  "outputText",
  "output",
  "completion",
  "providerBody",
  "providerRequest",
  "providerResponse",
  "rawBody",
  "toolArguments",
  "toolArgumentsJson",
  "arguments",
  "toolResultContent",
  "stream",
  "streamChunks",
  "tokenArrays",
  "logprobs",
  "apikey",
  "apiKey",
  "api_key",
  "secret",
  "token",
  "credential",
  "credentials",
  "authorization",
  "password",
  "privateKey",
] as const;

const FORBIDDEN_KEY_SET = new Set(FORBIDDEN_RECEIPT_KEYS.map((key) => key.toLowerCase()));

export function assertReplayReceiptMetadataOnly(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEY_SET.has(key.toLowerCase())) {
      throw new Error(
        `replay receipt field ${key} would store raw content or a secret; replay receipts must be metadata only`,
      );
    }
  }
}

export interface ReplayArtifactRetentionClassification {
  readonly kind: ReplayArtifactKind;
  readonly privacyClass: string;
  readonly retentionPolicyIds: Readonly<Record<string, string>>;
  readonly egress: "none";
}

export function classifyReplayArtifactRetention(input: {
  readonly kind: ReplayArtifactKind;
  readonly privacyClass: string;
  readonly retentionPolicyIds: Readonly<Record<string, string>>;
}): ReplayArtifactRetentionClassification {
  if (!REPLAY_ARTIFACT_KINDS.includes(input.kind)) {
    throw new Error(`unsupported replay artifact kind: ${String(input.kind)}`);
  }
  const privacyClass = typeof input.privacyClass === "string" ? input.privacyClass.trim() : "";
  if (!privacyClass) {
    throw new Error("replay artifact retention requires the source privacy class");
  }
  const retentionPolicyIds: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.retentionPolicyIds ?? {})) {
    if (typeof value === "string" && value.trim()) retentionPolicyIds[key] = value.trim();
  }
  return {
    kind: input.kind,
    privacyClass,
    retentionPolicyIds: Object.freeze(retentionPolicyIds),
    egress: "none",
  };
}
