import type { EndpointCandidate } from "@role-model-router/core";

export function toOpenAIModelDescriptor(candidate: EndpointCandidate): {
  id: string;
  object: "model";
  owned_by: string;
} {
  return {
    id: candidate.identity.model_id,
    object: "model",
    owned_by: candidate.identity.provider_kind,
  };
}
