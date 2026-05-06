export interface ToolExecutionDiagnostic {
  readonly code: string;
  readonly message: string;
}

export interface ToolRegistryExecution {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly connectorId: string;
  readonly connectorKind: string;
  readonly status: "succeeded" | "failed" | "rejected";
  readonly output: unknown;
  readonly diagnostics: readonly ToolExecutionDiagnostic[];
}

export interface ToolRegistryExecutionResult {
  readonly executions: readonly ToolRegistryExecution[];
  readonly diagnostics: readonly ToolExecutionDiagnostic[];
}

export interface ToolRegistryCall {
  readonly name: string;
  readonly arguments: unknown;
  readonly providerToolId?: string;
}

export interface ToolRegistryExecutionContext {
  readonly requestId: string;
  readonly toolCallId: string;
  readonly arguments: unknown;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>;
  execute(context: ToolRegistryExecutionContext): Promise<{ readonly content: unknown }>;
}

export interface ToolConnector {
  readonly connectorId: string;
  readonly connectorKind: string;
  readonly tools: readonly ToolDefinition[];
}

export interface ToolRegistry {
  readonly connectors: readonly ToolConnector[];
}

export function createToolRegistry(input: {
  readonly connectors: readonly ToolConnector[];
}): ToolRegistry {
  return {
    connectors: input.connectors,
  };
}

function resolveTool(
  registry: ToolRegistry,
  toolName: string,
): { connector: ToolConnector; tool: ToolDefinition } {
  for (const connector of registry.connectors) {
    const tool = connector.tools.find((entry) => entry.name === toolName);
    if (tool) {
      return { connector, tool };
    }
  }

  throw new Error(`No tool is registered for ${toolName}.`);
}

function toDiagnostic(code: string, error: unknown): ToolExecutionDiagnostic {
  return {
    code,
    message: error instanceof Error ? error.message : String(error),
  };
}

function validateRequiredFields(
  toolName: string,
  inputSchema: Record<string, unknown>,
  toolArguments: unknown,
): ToolExecutionDiagnostic[] {
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (required.length === 0) {
    return [];
  }

  const objectArguments =
    toolArguments && typeof toolArguments === "object"
      ? (toolArguments as Record<string, unknown>)
      : {};

  for (const field of required) {
    if (!(field in objectArguments)) {
      return [
        {
          code: "TOOL_SCHEMA_INVALID",
          message: `Tool ${toolName} is missing required field ${field}.`,
        },
      ];
    }
  }

  return [];
}

export async function executeToolCalls(
  registry: ToolRegistry,
  input: {
    readonly requestId: string;
    readonly toolCalls: readonly ToolRegistryCall[];
  },
): Promise<ToolRegistryExecutionResult> {
  const executions: ToolRegistryExecution[] = [];

  for (const toolCall of input.toolCalls) {
    const toolCallId = toolCall.providerToolId ?? `${toolCall.name}-${executions.length + 1}`;
    let resolved: { connector: ToolConnector; tool: ToolDefinition };
    try {
      resolved = resolveTool(registry, toolCall.name);
    } catch (error) {
      executions.push({
        toolCallId,
        toolName: toolCall.name,
        connectorId: "unresolved",
        connectorKind: "unknown",
        status: "failed",
        output: null,
        diagnostics: [toDiagnostic("TOOL_NOT_REGISTERED", error)],
      });
      continue;
    }
    const validationDiagnostics = validateRequiredFields(
      toolCall.name,
      resolved.tool.inputSchema,
      toolCall.arguments,
    );
    if (validationDiagnostics.length > 0) {
      executions.push({
        toolCallId,
        toolName: toolCall.name,
        connectorId: resolved.connector.connectorId,
        connectorKind: resolved.connector.connectorKind,
        status: "rejected",
        output: null,
        diagnostics: validationDiagnostics,
      });
      continue;
    }
    try {
      const result = await resolved.tool.execute({
        requestId: input.requestId,
        toolCallId,
        arguments: toolCall.arguments,
      });

      executions.push({
        toolCallId,
        toolName: toolCall.name,
        connectorId: resolved.connector.connectorId,
        connectorKind: resolved.connector.connectorKind,
        status: "succeeded",
        output: result.content,
        diagnostics: [],
      });
    } catch (error) {
      executions.push({
        toolCallId,
        toolName: toolCall.name,
        connectorId: resolved.connector.connectorId,
        connectorKind: resolved.connector.connectorKind,
        status: "failed",
        output: null,
        diagnostics: [toDiagnostic("TOOL_EXECUTION_FAILED", error)],
      });
    }
  }

  return {
    executions,
    diagnostics: executions.flatMap((entry) => entry.diagnostics),
  };
}
