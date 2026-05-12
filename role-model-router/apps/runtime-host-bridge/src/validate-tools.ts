import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RuntimeObservationBundle } from "@role-model-router/runtime-observability";
import type { ToolRegistryExecution } from "@role-model-router/tool-registry";

import {
  createRuntimeBridgeBackend,
  type BridgeToolCall,
  type BridgeChatCompletionsExecutionResult,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeToolsValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface RuntimeToolsValidationResult {
  readonly requestId: string;
  readonly endpointId: string;
  readonly toolCalls: readonly BridgeToolCall[];
  readonly toolExecutions: readonly ToolRegistryExecution[];
  readonly observation: RuntimeObservationBundle;
}

function createToolValidationRequest(): {
  readonly model: string;
  readonly messages: readonly [{ readonly role: "user"; readonly content: string }];
  readonly tools: readonly [
    {
      readonly type: "function";
      readonly function: {
        readonly name: "lookupRegistry";
        readonly description: "Look up endpoint details.";
        readonly parameters: {
          readonly type: "object";
          readonly properties: {
            readonly endpointId: {
              readonly type: "string";
            };
          };
          readonly required: readonly ["endpointId"];
        };
      };
    },
  ];
} {
  return {
    model: "moonshot/kimi-k2.5",
    messages: [{ role: "user", content: "Use the registry tool." }],
    tools: [
      {
        type: "function",
        function: {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          parameters: {
            type: "object",
            properties: {
              endpointId: {
                type: "string",
              },
            },
            required: ["endpointId"],
          },
        },
      },
    ],
  };
}

function requireObservation(
  observation: RuntimeObservationBundle | null,
  requestId: string,
): RuntimeObservationBundle {
  if (!observation) {
    throw new Error(`Runtime tools validation did not persist observation for ${requestId}.`);
  }
  return observation;
}

export async function runRuntimeToolsValidation(
  options: RuntimeToolsValidationOptions,
): Promise<RuntimeToolsValidationResult> {
  const backend = await createRuntimeBridgeBackend(options);
  const requestId = "req-runtime-tools-validation-001";
  const result = (await backend.executeChatCompletions(
    createToolValidationRequest(),
    requestId,
  )) as BridgeChatCompletionsExecutionResult;
  const observation = requireObservation(await backend.readRequestObservation(requestId), requestId);

  return {
    requestId,
    endpointId: result.endpointId,
    toolCalls: result.toolCalls ?? [],
    toolExecutions: result.toolExecutions ?? [],
    observation,
  };
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-tools");

  console.log(
    JSON.stringify(
      await runRuntimeToolsValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "runtime-tools-validation",
      }),
      null,
      2,
    ),
  );
  process.exit(0);
}
