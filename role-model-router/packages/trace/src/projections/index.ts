import { createHash } from "node:crypto";

export type ProjectionEvidence = {
  sourceRef: string;
  sourceHash: string;
  sourceAvailable: boolean;
  renderer?: { id: string; version: string; hash: string };
  tokenizer?: { id: string; revision: string; hash: string };
  tokenIds?: readonly number[];
  sampledMask?: readonly boolean[];
  contentMask?: readonly boolean[];
  logprobs?: readonly (number | null)[];
};

export type ProjectionReadiness = "semantic_only" | "token_exact" | "unavailable";

export function deriveProjectionReadiness(evidence: ProjectionEvidence): ProjectionReadiness {
  if (!evidence.sourceAvailable || !/^sha256:[a-f0-9]{64}$/u.test(evidence.sourceHash)) return "unavailable";
  const length = evidence.tokenIds?.length ?? 0;
  const exact = evidence.renderer && evidence.tokenizer && length > 0 && evidence.sampledMask?.length === length && evidence.contentMask?.length === length && evidence.logprobs?.length === length;
  return exact ? "token_exact" : "semantic_only";
}

export function projectionIdentity(evidence: ProjectionEvidence): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(evidence)).digest("hex")}`;
}
