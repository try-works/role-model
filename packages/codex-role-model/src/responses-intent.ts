import { classifyWithProgressiveDisclosure } from "./taxonomy/classify-with-progressive-disclosure.js";
import type { CompactTaxonomy } from "./taxonomy/compact-data.js";
import { injectRoleModelIntentIntoPayload } from "./request-intent.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRoleModelIntent(payload: Record<string, unknown>): boolean {
  return isRecord(payload.role_model) && isRecord(payload.role_model.intent);
}

function textFromResponsesInput(input: unknown): string {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) return "";
  const texts: string[] = [];
  for (const item of input) {
    if (!isRecord(item)) continue;
    if (item.type === "message" && isRecord(item.content)) {
      if (typeof item.content === "string") {
        texts.push(item.content);
        continue;
      }
    }
    if (item.type === "input_text" && typeof item.text === "string") {
      texts.push(item.text);
      continue;
    }
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (isRecord(part) && part.type === "input_text" && typeof part.text === "string") {
          texts.push(part.text);
        }
        if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
          texts.push(part.text);
        }
      }
    }
    if (item.role === "user") {
      if (typeof item.content === "string") texts.push(item.content);
      if (Array.isArray(item.content)) {
        for (const part of item.content) {
          if (isRecord(part) && typeof part.text === "string") texts.push(part.text);
        }
      }
    }
  }
  return texts.join("\n").trim();
}

function extractResponsesContext(payload: Record<string, unknown>) {
  const prompt = textFromResponsesInput(payload.input);
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const toolNames = tools
    .map((tool: unknown) => {
      if (isRecord(tool) && tool.type === "function" && isRecord(tool.function)) {
        return String(tool.function.name ?? "");
      }
      if (isRecord(tool) && typeof tool.name === "string") return tool.name;
      return "";
    })
    .filter(Boolean);
  return {
    prompt,
    hasTools: tools.length > 0,
    toolNames,
    hasImages: false,
    hasFiles: false,
    fileExtensions: [] as string[],
  };
}

export function injectRoleModelIntentIntoResponsesPayload(
  payload: unknown,
  roleModelAliasIds: ReadonlySet<string>,
  taxonomy?: CompactTaxonomy,
): unknown {
  if (!isRecord(payload)) return payload;
  const model = typeof payload.model === "string" ? payload.model : "";
  const normalizedModel = model.startsWith("role-model/")
    ? model.slice("role-model/".length)
    : model;
  if (!roleModelAliasIds.has(normalizedModel)) {
    return injectRoleModelIntentIntoPayload(payload, roleModelAliasIds, taxonomy);
  }
  if (hasRoleModelIntent(payload)) return payload;

  const ctx = extractResponsesContext(payload);
  if (!ctx.prompt.trim()) {
    return injectRoleModelIntentIntoPayload(payload, roleModelAliasIds, taxonomy);
  }

  return {
    ...payload,
    role_model: classifyWithProgressiveDisclosure({
      prompt: ctx.prompt,
      taxonomy,
      context: {
        hasTools: ctx.hasTools,
        toolNames: ctx.toolNames,
        hasImages: ctx.hasImages,
        hasFiles: ctx.hasFiles,
        fileExtensions: ctx.fileExtensions,
      },
    }).role_model,
  };
}
