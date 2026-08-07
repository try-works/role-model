import { classifyWithProgressiveDisclosure } from "./taxonomy/classify-with-progressive-disclosure.js";
import type { CompactRoleTask, CompactTaxonomy } from "./taxonomy/compact-data.js";
import { createStagedCompactTaxonomyReader } from "./taxonomy/staged-compact-taxonomy.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRoleModelIntent(payload: Record<string, unknown>): boolean {
  return isRecord(payload.role_model) && isRecord(payload.role_model.intent);
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (isRecord(part) && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function promptFromMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (const message of [...messages].reverse()) {
    if (!isRecord(message) || message.role !== "user") continue;
    const text = textFromContent(message.content);
    if (text.trim()) return text;
  }
  return "";
}

function promptFromResponsesInput(input: unknown): string {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) return "";
  for (const item of [...input].reverse()) {
    if (typeof item === "string" && item.trim()) return item;
    if (!isRecord(item)) continue;
    if (item.role === "user" || item.type === "message") {
      const text = textFromContent(item.content ?? item.text);
      if (text.trim()) return text;
    }
    if (typeof item.text === "string" && item.text.trim()) return item.text;
  }
  return "";
}

interface ClassificationContext {
  prompt: string;
  hasTools: boolean;
  toolNames: readonly string[];
  hasImages: boolean;
  hasFiles: boolean;
  fileExtensions: readonly string[];
}

function extractClassificationContext(payload: Record<string, unknown>): ClassificationContext {
  const prompt =
    promptFromMessages(payload.messages) || promptFromResponsesInput(payload.input);

  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const hasTools = tools.length > 0;
  const toolNames = tools
    .map((tool: unknown) => {
      if (isRecord(tool) && tool.type === "function" && isRecord(tool.function)) {
        return String(tool.function.name ?? "");
      }
      return "";
    })
    .filter(Boolean);

  let hasImages = false;
  let hasFiles = false;
  const fileExtensions: string[] = [];
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  for (const message of messages) {
    if (!isRecord(message)) continue;
    const content = message.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (isRecord(part)) {
          if (part.type === "image_url") hasImages = true;
          if (part.type === "file") {
            hasFiles = true;
            if (isRecord(part.file) && typeof part.file.filename === "string") {
              const ext = part.file.filename
                .slice(part.file.filename.lastIndexOf("."))
                .toLowerCase();
              if (ext && ext.length > 1 && ext.length <= 10) fileExtensions.push(ext);
            }
          }
        }
      }
    }
  }

  return { prompt, hasTools, toolNames, hasImages, hasFiles, fileExtensions };
}

export function injectRoleModelIntentIntoPayload(
  payload: unknown,
  roleModelAliasIds: ReadonlySet<string>,
  taxonomy?: CompactTaxonomy,
): unknown {
  if (!isRecord(payload)) return payload;
  const model = typeof payload.model === "string" ? payload.model : "";
  const normalizedModel = model.startsWith("role-model/")
    ? model.slice("role-model/".length)
    : model;
  if (!roleModelAliasIds.has(normalizedModel)) return payload;
  if (hasRoleModelIntent(payload)) return payload;

  const ctx = extractClassificationContext(payload);
  if (!ctx.prompt.trim()) return payload;

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

export async function injectRoleModelIntentIntoPayloadWithRuntimeTasks(
  payload: unknown,
  roleModelAliasIds: ReadonlySet<string>,
  taxonomy: CompactTaxonomy | undefined,
  fetchRuntimeTaskChunk?: (roleId: string) => Promise<readonly CompactRoleTask[]>,
  fetchRuntimeRoleSummaries?: () => Promise<CompactTaxonomy["roleSummaries"]>,
): Promise<unknown> {
  if (!isRecord(payload)) return payload;
  const model = typeof payload.model === "string" ? payload.model : "";
  const normalizedModel = model.startsWith("role-model/")
    ? model.slice("role-model/".length)
    : model;
  if (!roleModelAliasIds.has(normalizedModel)) return payload;
  if (hasRoleModelIntent(payload)) return payload;

  const ctx = extractClassificationContext(payload);
  if (!ctx.prompt.trim()) return payload;

  const classificationContext = {
    hasTools: ctx.hasTools,
    toolNames: ctx.toolNames,
    hasImages: ctx.hasImages,
    hasFiles: ctx.hasFiles,
    fileExtensions: ctx.fileExtensions,
  };

  const firstPass = classifyWithProgressiveDisclosure({
    prompt: ctx.prompt,
    taxonomy,
    context: classificationContext,
  });
  if (!fetchRuntimeTaskChunk || firstPass.candidateRoleIds.length === 0) {
    return {
      ...payload,
      role_model: firstPass.role_model,
    };
  }

  try {
    let candidateRoleIds = [...firstPass.candidateRoleIds];

    if (fetchRuntimeRoleSummaries) {
      try {
        const runtimeRoleSummaries = await fetchRuntimeRoleSummaries();
        if (runtimeRoleSummaries.length > 0) {
          const reader = createStagedCompactTaxonomyReader();
          const baseGroups = taxonomy?.groups ?? reader.loadGroups();
          const candidateGroupIds =
            firstPass.candidateGroupIds.length > 0
              ? firstPass.candidateGroupIds
              : baseGroups.slice(0, 3).map((g) => g.id);
          const additionalRoles = runtimeRoleSummaries
            .filter(
              (role) =>
                candidateGroupIds.includes(role.primaryGroupId) ||
                role.secondaryGroupIds.some((sg) => candidateGroupIds.includes(sg)),
            )
            .filter((role) => !candidateRoleIds.includes(role.id))
            .map((role) => role.id);
          candidateRoleIds = [...new Set([...candidateRoleIds, ...additionalRoles])].slice(0, 5);
        }
      } catch {
        // runtime role summaries unavailable; proceed with first-pass candidates
      }
    }

    const taskEntries = await Promise.all(
      candidateRoleIds.map(
        async (roleId) => [roleId, await fetchRuntimeTaskChunk(roleId)] as const,
      ),
    );
    const reader = createStagedCompactTaxonomyReader();
    const baseTaxonomy =
      taxonomy ??
      ({
        manifest: reader.loadManifest(),
        groups: reader.loadGroups(),
        roleSummaries: reader.loadRoleSummaries(),
        roleTaskIndex: reader.loadRoleTaskIndex(),
        roleTaskChunks: {},
      } satisfies CompactTaxonomy);
    const runtimeTaxonomy: CompactTaxonomy = {
      ...baseTaxonomy,
      roleTaskChunks: {
        ...Object.fromEntries(taskEntries),
      },
    };
    return {
      ...payload,
      role_model: classifyWithProgressiveDisclosure({
        prompt: ctx.prompt,
        taxonomy: runtimeTaxonomy,
        context: classificationContext,
      }).role_model,
    };
  } catch {
    return {
      ...payload,
      role_model: firstPass.role_model,
    };
  }
}
