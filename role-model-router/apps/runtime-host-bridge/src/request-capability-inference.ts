import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

export interface InferredCapabilityRequirements {
  readonly requiredInputModalities: readonly string[];
  readonly requiredOutputModalities: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly advisoryCapabilities: readonly string[];
}

export interface CapabilityEligibilityExcludedTarget {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasons: readonly string[];
}

export interface CapabilityEligibilityDiagnostics {
  readonly requiredInputModalities: readonly string[];
  readonly requiredOutputModalities: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly advisoryCapabilities: readonly string[];
  readonly includedEndpoints: readonly string[];
  readonly excludedTargets: readonly CapabilityEligibilityExcludedTarget[];
}

export interface CapabilityEligibilityResult {
  readonly allowEndpoints: readonly string[];
  readonly diagnostics: CapabilityEligibilityDiagnostics;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort(compareText);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function addContentModalities(value: unknown, modalities: Set<string>): void {
  if (typeof value === "string") {
    modalities.add("text");
    return;
  }
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      addContentModalities(entry, modalities);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }
  const type = typeof record.type === "string" ? record.type : "";
  if (type === "text" || type === "input_text" || typeof record.text === "string") {
    modalities.add("text");
  }
  if (
    type === "image_url" ||
    type === "input_image" ||
    "image_url" in record ||
    "image" in record
  ) {
    modalities.add("image");
  }
  if (
    type === "video_url" ||
    type === "input_video" ||
    "video_url" in record ||
    "video" in record
  ) {
    modalities.add("video");
  }
  if (type === "input_file" || type === "file" || "file" in record) {
    modalities.add("pdf");
  }
}

function inferMessageModalities(messages: unknown): readonly string[] {
  const modalities = new Set<string>();
  if (!Array.isArray(messages)) {
    modalities.add("text");
    return uniqueSorted(modalities);
  }
  for (const message of messages) {
    const record = asRecord(message);
    if (!record) {
      continue;
    }
    addContentModalities(record.content, modalities);
  }
  if (modalities.size === 0) {
    modalities.add("text");
  }
  return uniqueSorted(modalities);
}

function inferResponsesInputModalities(input: unknown): readonly string[] {
  if (typeof input === "string") {
    return ["text"];
  }
  if (!Array.isArray(input)) {
    return ["text"];
  }
  return inferMessageModalities(input);
}

function inferToolCapabilities(
  tools: unknown,
  mode: "chat" | "responses",
): {
  readonly required: readonly string[];
  readonly advisory: readonly string[];
} {
  if (!Array.isArray(tools) || tools.length === 0) {
    return {
      required: [],
      advisory: [],
    };
  }

  const required = new Set<string>();
  const advisory = new Set<string>();
  for (const tool of tools) {
    const record = asRecord(tool);
    if (!record || typeof record.type !== "string") {
      continue;
    }
    if (record.type === "function") {
      required.add("tools.function_calling");
      continue;
    }
    if (mode === "responses" && record.type === "web_search") {
      advisory.add("tools.hosted.web_search");
      continue;
    }
    advisory.add(`tools.hosted.${record.type}`);
  }
  return {
    required: uniqueSorted(required),
    advisory: uniqueSorted(advisory),
  };
}

function inferResponseFormatCapabilities(body: Record<string, unknown>): readonly string[] {
  const responseFormat = asRecord(body.response_format);
  if (!responseFormat) {
    return [];
  }
  if (responseFormat.type === "json_schema" || responseFormat.type === "json_object") {
    return ["structured.output"];
  }
  return [];
}

function inferReasoningCapabilities(body: Record<string, unknown>): readonly string[] {
  if (typeof body.reasoning_effort === "string") {
    return ["reasoning.effort_control"];
  }
  if (asRecord(body.reasoning) || asRecord(body.thinking)) {
    return ["reasoning.control"];
  }
  return [];
}

export function inferChatCompletionsCapabilityRequirements(
  body: Record<string, unknown>,
): InferredCapabilityRequirements {
  const tools = inferToolCapabilities(body.tools, "chat");
  return {
    requiredInputModalities: inferMessageModalities(body.messages),
    requiredOutputModalities: ["text"],
    requiredCapabilities: uniqueSorted([
      "text.chat",
      ...tools.required,
      ...inferResponseFormatCapabilities(body),
      ...inferReasoningCapabilities(body),
    ]),
    advisoryCapabilities: tools.advisory,
  };
}

export function inferResponsesCapabilityRequirements(
  body: Record<string, unknown>,
): InferredCapabilityRequirements {
  const tools = inferToolCapabilities(body.tools, "responses");
  return {
    requiredInputModalities: inferResponsesInputModalities(body.input),
    requiredOutputModalities: ["text"],
    requiredCapabilities: uniqueSorted([
      "text.chat",
      ...tools.required,
      ...inferResponseFormatCapabilities(body),
      ...inferReasoningCapabilities(body),
    ]),
    advisoryCapabilities: tools.advisory,
  };
}

function endpointSupportsCapability(
  endpoint: EndpointRegistryResult["endpoints"][number],
  capability: string,
): boolean {
  const capabilities = endpoint.declared.capabilities;
  if (capabilities.includes(capability)) {
    return true;
  }
  if (
    capability === "tools.function_calling" &&
    (endpoint.declared.tool_calling.supported ||
      endpoint.declared.capabilities.includes("tools.function_calling"))
  ) {
    return true;
  }
  if (
    (capability === "reasoning.effort_control" || capability === "reasoning.control") &&
    (capabilities.includes("reasoning") ||
      capabilities.includes("reasoning.effort_control") ||
      capabilities.includes("reasoning.control"))
  ) {
    return true;
  }
  if (
    capability === "structured.output" &&
    (capabilities.includes("structured.output") || capabilities.includes("response.json_schema"))
  ) {
    return true;
  }
  return false;
}

export function filterEndpointsByCapabilityRequirements(input: {
  readonly registry: EndpointRegistryResult;
  readonly allowEndpoints: readonly string[];
  readonly requirements: InferredCapabilityRequirements;
}): CapabilityEligibilityResult {
  const includedEndpoints: string[] = [];
  const excludedTargets: CapabilityEligibilityExcludedTarget[] = [];
  const allowed = new Set(input.allowEndpoints);

  for (const endpoint of input.registry.endpoints) {
    if (!allowed.has(endpoint.identity.endpoint_id)) {
      continue;
    }
    const reasons: string[] = [];
    for (const modality of input.requirements.requiredInputModalities) {
      if (!endpoint.declared.modalities.includes(modality)) {
        reasons.push(`missing_input.${modality}`);
      }
    }
    for (const capability of input.requirements.requiredCapabilities) {
      if (!endpointSupportsCapability(endpoint, capability)) {
        reasons.push(`missing_capability.${capability}`);
      }
    }

    if (reasons.length > 0) {
      excludedTargets.push({
        endpointId: endpoint.identity.endpoint_id,
        modelId: endpoint.identity.model_id,
        reasons: uniqueSorted(reasons),
      });
    } else {
      includedEndpoints.push(endpoint.identity.endpoint_id);
    }
  }

  return {
    allowEndpoints: includedEndpoints.sort(compareText),
    diagnostics: {
      requiredInputModalities: input.requirements.requiredInputModalities,
      requiredOutputModalities: input.requirements.requiredOutputModalities,
      requiredCapabilities: input.requirements.requiredCapabilities,
      advisoryCapabilities: input.requirements.advisoryCapabilities,
      includedEndpoints: includedEndpoints.sort(compareText),
      excludedTargets: excludedTargets.sort((left, right) =>
        compareText(left.endpointId, right.endpointId),
      ),
    },
  };
}
