import { mkdir } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, test, vi } from "vitest";

import { readBenchmarkRunProgress } from "../src/benchmark-progress.js";
import { readJudgeGradingText, readJudgeResponseText } from "../src/benchmark-reasoning.js";
import {
  orderEndpointsForGrading,
  probeJudgeEndpoint,
  resetBenchmarkJudgeRuntimeForTests,
  runRoutingCapabilityBenchmark,
} from "../src/benchmark-runner.js";

function initBenchmarkDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS observed_performance_samples (
      sample_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      request_id TEXT,
      routing_decision_id TEXT,
      source_type TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      sample_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observed_performance_samples_by_difficulty (
      sample_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      difficulty_bucket TEXT NOT NULL,
      request_id TEXT,
      routing_decision_id TEXT,
      source_type TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      sample_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      measured_at_ms INTEGER NOT NULL,
      profile_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots_by_difficulty (
      snapshot_id TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL,
      difficulty_bucket TEXT NOT NULL,
      measured_at_ms INTEGER NOT NULL,
      profile_json TEXT NOT NULL
    );
  `);
  database.close();
}

describe("benchmark-runner judge remediation", () => {
  let artifactRoot = "";

  afterEach(() => {
    artifactRoot = "";
    resetBenchmarkJudgeRuntimeForTests();
    vi.restoreAllMocks();
  });

  test("probeJudgeEndpoint reports failure when judge returns empty response", async () => {
    const probe = await probeJudgeEndpoint(
      {
        databasePath: ":memory:",
        listConfiguredEndpoints: async () => [],
        deriveEndpointVersion: () => "v1",
        executeChatCompletions: async () => ({ contentText: "" }),
      },
      { endpointId: "judge.endpoint", modelId: "judge-model" },
    );
    expect(probe.ok).toBe(false);
    expect(probe.error).toBe("empty_judge_response");
  });

  test("creates run progress before async endpoint discovery resolves", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-progress-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const judgeEndpoint = {
      endpointId: "moonshot.kimi",
      modelId: "moonshot/kimi-k2.6",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };
    const subjectEndpoint = {
      endpointId: "local.lfm",
      modelId: "lfm2.5-1.2b-instruct",
      sourceType: "local" as const,
      healthStatus: "healthy",
    };

    let releaseEndpoints: (() => void) | null = null;
    const endpointsReady = new Promise<void>((resolve) => {
      releaseEndpoints = resolve;
    });

    const runId = "run-progress-race";
    const benchmarkPromise = runRoutingCapabilityBenchmark(
      {
        databasePath,
        benchmarkArtifactRoot: artifactRoot,
        listConfiguredEndpoints: async () => {
          await endpointsReady;
          return [subjectEndpoint, judgeEndpoint];
        },
        deriveEndpointVersion: () => "v1",
        executeChatCompletions: async (body, _requestId, requestOptions) => {
          if (body.response_format) {
            return {
              contentText:
                '{"score":1,"rationale":"Deliverable satisfies the benchmark requirements."}',
            };
          }
          if (requestOptions?.endpointId === judgeEndpoint.endpointId) {
            return { contentText: '{"answer":"judge"}' };
          }
          return { contentText: '{"answer":"ok"}' };
        },
      },
      {
        runId,
        endpointIds: [subjectEndpoint.endpointId, judgeEndpoint.endpointId],
        judgeEndpointId: judgeEndpoint.endpointId,
        mode: "quick",
        caseIds: ["h04-tool-read-router"],
        useJudge: true,
      },
    );

    expect(readBenchmarkRunProgress(runId)).toMatchObject({
      runId,
      status: "running",
    });

    releaseEndpoints?.();
    await benchmarkPromise;
  });

  test("readJudgeResponseText merges reasoning and content channels", () => {
    const text = readJudgeResponseText({
      contentText: '{"score":1,"rationale":"ok"}',
      reasoningText: "Short analysis before JSON.",
      outputText: "",
    });
    expect(text).toContain("Short analysis before JSON.");
    expect(text).toContain('"score":1');
  });

  test("orderEndpointsForGrading grades judge-as-subject before other endpoints by default", () => {
    const judge = {
      endpointId: "moonshot.kimi",
      modelId: "moonshot/kimi-k2.6",
      sourceType: "remote" as const,
    };
    const local = {
      endpointId: "local.lfm",
      modelId: "lfm2.5-1.2b-instruct",
      sourceType: "local" as const,
    };
    expect(
      orderEndpointsForGrading([local, judge], judge.endpointId).map((e) => e.endpointId),
    ).toEqual(["moonshot.kimi", "local.lfm"]);
  });

  test("orderEndpointsForGrading grades non-judge subjects first when overlap risk is flagged", () => {
    const judge = {
      endpointId: "moonshot.kimi",
      modelId: "moonshot/kimi-k2.6",
      sourceType: "remote" as const,
    };
    const local = {
      endpointId: "local.lfm",
      modelId: "lfm2.5-1.2b-instruct",
      sourceType: "local" as const,
    };
    expect(
      orderEndpointsForGrading([local, judge], judge.endpointId, {
        judgeSubjectOverlap: true,
      }).map((e) => e.endpointId),
    ).toEqual(["local.lfm", "moonshot.kimi"]);
  });

  test("readJudgeGradingText prefers content channel over reasoning preambles", () => {
    expect(
      readJudgeGradingText({
        contentText: '{"score":0.8,"rationale":"ok"}',
        reasoningText: "The user wants me to grade this response with a long analysis...",
      }),
    ).toBe('{"score":0.8,"rationale":"ok"}');
  });

  test("omits judge max_tokens and persists judge artifacts", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);
    const judgeBodies: Array<Record<string, unknown>> = [];
    const endpoint = {
      endpointId: "moonshot.kimi",
      modelId: "moonshot/kimi-k2.6",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };
    const localEndpoint = {
      endpointId: "local.lfm",
      modelId: "lfm2.5-1.2b-instruct",
      sourceType: "local" as const,
      healthStatus: "healthy",
    };

    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [localEndpoint, endpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async (
        body: Record<string, unknown>,
        requestId: string,
        requestOptions?: { endpointId?: string },
      ) => {
        if (requestId.startsWith("bench-judge-")) {
          judgeBodies.push(body);
          return {
            contentText:
              '{"score":1,"rationale":"Deliverable includes required read_file tool call and formatted answer per checklist."}',
          };
        }
        if (requestOptions?.endpointId === endpoint.endpointId) {
          return {
            contentText: '{"answer":"createRouter"}',
            toolCalls: [
              {
                function: {
                  name: "read_file",
                  arguments: '{"path":"src/router.ts"}',
                },
              },
            ],
          };
        }
        if (requestOptions?.endpointId === localEndpoint.endpointId) {
          return { contentText: '{"answer":"createRouter"}' };
        }
        return { contentText: "unexpected" };
      },
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [localEndpoint.endpointId, endpoint.endpointId],
      judgeEndpointId: endpoint.endpointId,
      mode: "quick",
      caseIds: ["h04-tool-read-router"],
      useJudge: true,
    });

    expect(judgeBodies.length).toBeGreaterThan(0);
    for (const body of judgeBodies) {
      expect(body.max_tokens).toBeUndefined();
      expect(body.temperature).toBe(0);
    }

    expect(result.endpointGrades[0]?.caseResults[0]?.score).toBe(1);
    expect(result.endpointGrades[0]?.caseResults[0]?.rationale).toContain("read_file");

    const { readdir, readFile } = await import("node:fs/promises");
    const judgeSummaryPath = path.join(
      artifactRoot,
      result.runId,
      "judge",
      "moonshot.kimi",
      "h04-tool-read-router.json",
    );
    const judgeSummary = JSON.parse(await readFile(judgeSummaryPath, "utf8")) as {
      parseSuccess: boolean;
      sourceArtifactPath: string;
    };
    expect(judgeSummary.parseSuccess).toBe(true);
    expect(judgeSummary.sourceArtifactPath).toContain(
      "responses/moonshot.kimi/h04-tool-read-router.json",
    );

    const manifest = JSON.parse(
      await readFile(path.join(artifactRoot, result.runId, "manifest.json"), "utf8"),
    ) as {
      executionCompletedAtMs: number;
      gradingCompletedAtMs: number;
      judgeArtifactCount: number;
    };
    expect(manifest.executionCompletedAtMs).toBeLessThanOrEqual(manifest.gradingCompletedAtMs);
    expect(manifest.judgeArtifactCount).toBeGreaterThan(0);
  });

  test("counts executed dynamic tools when the endpoint does not echo assistant tool_calls", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-tool-exec-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const endpoint = {
      endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };
    const judgeEndpoint = {
      endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-flash",
      modelId: "deepseek/deepseek-v4-flash",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [endpoint, judgeEndpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async (body, requestId, requestOptions) => {
        if (requestId.startsWith("bench-judge-")) {
          return {
            contentText:
              '{"score":1,"rationale":"Deliverable includes required read_file tool usage."}',
          };
        }
        if (requestOptions?.endpointId === endpoint.endpointId) {
          return {
            contentText: '{"answer":"createRouter"}',
            toolExecutions: [
              {
                toolCallId: "call-1",
                toolName: "read_file",
                connectorId: "request-scoped",
                connectorKind: "dynamic-tool",
                status: "succeeded" as const,
                output: { path: "src/router.ts" },
                diagnostics: [],
              },
            ],
          };
        }
        if (requestOptions?.endpointId === judgeEndpoint.endpointId) {
          return {
            contentText: '{"answer":"judge-side stub"}',
          };
        }
        return { contentText: JSON.stringify(body) };
      },
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [endpoint.endpointId, judgeEndpoint.endpointId],
      judgeEndpointId: judgeEndpoint.endpointId,
      mode: "quick",
      caseIds: ["h04-tool-read-router"],
      useJudge: true,
    });

    expect(
      result.endpointGrades.find((grade) => grade.endpointId === endpoint.endpointId)
        ?.caseResults[0]?.score,
    ).toBe(1);
  });

  test("sends structured response_format for subject json deliverables", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-response-format-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const endpoint = {
      endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    const subjectBodies: Array<Record<string, unknown>> = [];

    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [endpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async (body: Record<string, unknown>) => {
        subjectBodies.push(body);
        return {
          contentText: '{"answer":"controller"}',
          toolCalls: [
            {
              function: {
                name: "read_file",
                arguments: '{"path":"state/runtime-config.yaml"}',
              },
            },
          ],
        };
      },
    };

    await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [endpoint.endpointId],
      mode: "quick",
      caseIds: ["h04-tool-read-router"],
      useJudge: false,
    });

    expect(subjectBodies.length).toBeGreaterThan(0);
    expect(subjectBodies[0]?.tools).toBeTruthy();
    for (const subjectBody of subjectBodies) {
      expect(subjectBody.response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "benchmark_deliverable",
          strict: true,
          schema: {
            type: "object",
            required: ["answer"],
            properties: {
              answer: { type: "string", minLength: 1 },
            },
          },
        },
      });
    }
  });

  test("preserves repeated same-name tool calls in benchmark artifacts", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-multi-tool-calls-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const endpoint = {
      endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    let turn = 0;
    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [endpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async () => {
        turn += 1;
        if (turn === 1) {
          return {
            contentText:
              '{"answer":"router.yaml and routing-policy.json are the routing-related filenames."}',
            toolCalls: [
              {
                function: {
                  name: "list_dir",
                  arguments: '{"path":"config"}',
                },
              },
              {
                function: {
                  name: "list_dir",
                  arguments: '{"path":"."}',
                },
              },
            ],
          };
        }
        return {
          contentText:
            '{"answer":"router.yaml and routing-policy.json are the routing-related filenames."}',
        };
      },
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [endpoint.endpointId],
      mode: "full",
      caseIds: ["t01-tools-list-dir"],
      useJudge: false,
    });

    const { readFile } = await import("node:fs/promises");
    const responsePath = path.join(
      artifactRoot,
      result.runId,
      "responses",
      endpoint.endpointId,
      "t01-tools-list-dir.json",
    );
    const responseRecord = JSON.parse(await readFile(responsePath, "utf8")) as {
      formattedDeliverable: string;
    };
    const deliverable = JSON.parse(responseRecord.formattedDeliverable) as {
      tool_calls: Array<{ name: string; arguments: { path: string } }>;
    };

    expect(deliverable.tool_calls).toHaveLength(2);
    expect(deliverable.tool_calls.map((toolCall) => toolCall.arguments.path)).toEqual([
      "config",
      ".",
    ]);
  });

  test("forces a post-tool follow-up before accepting tool-grounded deliverables", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-post-tool-followup-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const endpoint = {
      endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    const seenBodies: Array<Record<string, unknown>> = [];
    let turn = 0;
    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [endpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async (body: Record<string, unknown>) => {
        seenBodies.push(body);
        turn += 1;
        if (turn === 1) {
          return {
            contentText:
              '{"answer":"The config directory path was referenced, but no filenames were returned."}',
            toolCalls: [
              {
                function: {
                  name: "list_dir",
                  arguments:
                    '{"path":"C:\\\\Users\\\\erikb\\\\AppData\\\\Local\\\\RMCS\\\\ws\\\\run\\\\config"}',
                },
              },
            ],
          };
        }
        return {
          contentText:
            '{"answer":"router.yaml and routing-policy.json are the routing-related filenames."}',
        };
      },
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [endpoint.endpointId],
      mode: "full",
      caseIds: ["t01-tools-list-dir"],
      useJudge: false,
    });

    expect(seenBodies).toHaveLength(2);
    expect(JSON.stringify(seenBodies[1].messages ?? [])).toContain("router.yaml");
    expect(JSON.stringify(seenBodies[1].messages ?? [])).toContain("routing-policy.json");

    const { readFile } = await import("node:fs/promises");
    const responsePath = path.join(
      artifactRoot,
      result.runId,
      "responses",
      endpoint.endpointId,
      "t01-tools-list-dir.json",
    );
    const responseRecord = JSON.parse(await readFile(responsePath, "utf8")) as {
      formattedDeliverable: string;
    };
    const deliverable = JSON.parse(responseRecord.formattedDeliverable) as {
      answer: string;
      tool_calls: Array<{ arguments: { path: string } }>;
    };

    expect(deliverable.tool_calls).toHaveLength(1);
    expect(deliverable.tool_calls[0]?.arguments.path).toContain("\\config");
    expect(deliverable.answer).toContain("router.yaml");
    expect(deliverable.answer).toContain("routing-policy.json");
  });

  test("code-fence extraction ignores reasoning text from subject turns", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-code-fence-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const endpoint = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
      modelId: "moonshot/kimi-k2.7-code",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [endpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async () => ({
        contentText: [
          "```typescript",
          "export function allowSoleCandidateFallback(): boolean {",
          "  return true;",
          "}",
          "```",
        ].join("\n"),
        reasoningText:
          "The user asked for one ```typescript code fence with the full function. I should think through the constraints first.",
      }),
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [endpoint.endpointId],
      mode: "quick",
      caseIds: ["h07-multi-turn-sla-guard"],
      useJudge: false,
    });

    const { readFile } = await import("node:fs/promises");
    const responsePath = path.join(
      artifactRoot,
      result.runId,
      "responses",
      endpoint.endpointId,
      "h07-multi-turn-sla-guard.json",
    );
    const responseRecord = JSON.parse(await readFile(responsePath, "utf8")) as {
      extractionMethod: string;
      formattedDeliverable: string;
    };
    const deliverable = JSON.parse(responseRecord.formattedDeliverable) as {
      code: string;
    };

    expect(responseRecord.extractionMethod).toBe("code_fence");
    expect(deliverable.code).toContain("export function allowSoleCandidateFallback");
    expect(deliverable.code).not.toContain("I should think through the constraints first.");
  });

  test("persists cross-model compare artifacts for multi-endpoint runs", async () => {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);

    const localEndpoint = {
      endpointId: "local.lfm",
      modelId: "lfm2.5-1.2b-instruct",
      sourceType: "local" as const,
      healthStatus: "healthy",
    };
    const remoteEndpoint = {
      endpointId: "moonshot.kimi",
      modelId: "moonshot/kimi-k2.6",
      sourceType: "remote" as const,
      healthStatus: "healthy",
    };

    const deps = {
      databasePath,
      benchmarkArtifactRoot: artifactRoot,
      listConfiguredEndpoints: async () => [localEndpoint, remoteEndpoint],
      deriveEndpointVersion: () => "v1",
      executeChatCompletions: async (
        body: Record<string, unknown>,
        requestId: string,
        requestOptions?: { endpointId?: string },
      ) => {
        if (requestId.startsWith("bench-judge-compare-")) {
          return {
            contentText:
              '{"relativeRanking":["moonshot.kimi","local.lfm"],"rationale":"Remote answer is stronger."}',
          };
        }
        if (requestId.startsWith("bench-judge-")) {
          return {
            contentText:
              '{"score":1,"rationale":"Deliverable includes required read_file tool call and formatted answer per checklist."}',
          };
        }
        if (requestOptions?.endpointId === localEndpoint.endpointId) {
          return { contentText: '{"answer":"local"}' };
        }
        if (requestOptions?.endpointId === remoteEndpoint.endpointId) {
          return { contentText: '{"answer":"remote"}' };
        }
        return { contentText: "unexpected" };
      },
    };

    const result = await runRoutingCapabilityBenchmark(deps, {
      endpointIds: [localEndpoint.endpointId, remoteEndpoint.endpointId],
      judgeEndpointId: remoteEndpoint.endpointId,
      mode: "quick",
      caseIds: ["h04-tool-read-router"],
      useJudge: true,
    });

    const { readFile } = await import("node:fs/promises");
    const comparePath = path.join(
      artifactRoot,
      result.runId,
      "judge",
      "compare",
      "h04-tool-read-router.json",
    );
    const compare = JSON.parse(await readFile(comparePath, "utf8")) as {
      relativeRanking: string[];
      models: Array<{ endpointId: string }>;
    };
    expect(compare.relativeRanking).toEqual(["moonshot.kimi", "local.lfm"]);
    expect(compare.models).toHaveLength(2);

    const manifest = JSON.parse(
      await readFile(path.join(artifactRoot, result.runId, "manifest.json"), "utf8"),
    ) as { compareArtifactCount: number };
    expect(manifest.compareArtifactCount).toBe(1);
  });
});
