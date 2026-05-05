import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { initializeSqliteMemory, persistContinuitySnapshot, readConversationContinuity } from "@role-model-router/sqlite-memory";

import { assembleContextEnvelope } from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("assembleContextEnvelope", () => {
  test("assembles a bounded continuity envelope from SQLite-backed session state", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-context-envelope-"));
    const fixture = await readJson<{
      session: {
        sessionId: string;
        workspaceScope: string;
        createdAtMs: number;
        updatedAtMs: number;
      };
      conversation: {
        conversationId: string;
        sessionId: string;
        createdAtMs: number;
        updatedAtMs: number;
      };
      turns: Array<{
        turnId: string;
        conversationId: string;
        role: string;
        contentRef: string;
        createdAtMs: number;
      }>;
      artifacts: Array<{
        artifactId: string;
        artifactKind: string;
        storageRef: string;
        createdAtMs: number;
      }>;
      artifactLinks: Array<{
        linkId: string;
        artifactId: string;
        conversationId: string | null;
        sessionId: string | null;
        createdAtMs: number;
      }>;
      handoffs: Array<{
        handoffId: string;
        conversationId: string | null;
        fromEndpointId: string | null;
        toEndpointId: string | null;
        createdAtMs: number;
      }>;
      selection: {
        maxTurns: number;
        maxArtifacts: number;
        tokenBudget: number;
      };
    }>("testdata/router-runtime/context-envelope.json");
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "workspace-dev",
    });

    persistContinuitySnapshot({
      databasePath: initialized.databasePath,
      session: fixture.session,
      conversation: fixture.conversation,
      turns: fixture.turns,
      artifacts: fixture.artifacts,
      artifactLinks: fixture.artifactLinks,
      handoffs: fixture.handoffs,
    });

    const continuity = readConversationContinuity({
      databasePath: initialized.databasePath,
      conversationId: fixture.conversation.conversationId,
    });
    const result = assembleContextEnvelope({
      continuity,
      maxTurns: fixture.selection.maxTurns,
      maxArtifacts: fixture.selection.maxArtifacts,
      tokenBudget: fixture.selection.tokenBudget,
    });

    expect(result.sessionId).toBe("session-alpha");
    expect(result.conversationId).toBe("conversation-main");
    expect(result.selectedTurns.map((turn) => turn.turnId)).toEqual(["turn-003", "turn-004"]);
    expect(result.selectedArtifacts.map((artifact) => artifact.artifactId)).toEqual(["artifact-summary"]);
    expect(result.latestHandoff).toEqual(
      expect.objectContaining({
        handoffId: "handoff-1",
        fromEndpointId: "openai.personal.primary.us-east-1.fast",
        toEndpointId: "anthropic.team.shared.us-east-1.default",
      }),
    );
    expect(result.estimatedTokenCount).toBe(240);
    expect(result.diagnostics).toEqual([
      {
        code: "TURN_LIMIT_REACHED",
        message: "Context envelope kept the 2 most recent turns and omitted 2 older turns.",
      },
      {
        code: "TOKEN_BUDGET_REACHED",
        message: "Context envelope omitted 2 artifacts because the token budget was exhausted.",
      },
    ]);
  });
});
