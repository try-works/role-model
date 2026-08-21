import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface BenchmarkResponseRecord {
  readonly runId: string;
  readonly suiteId: string;
  readonly mode: "quick" | "full";
  readonly endpointId: string;
  readonly modelId: string;
  readonly caseId: string;
  readonly requestId: string;
  readonly actualResponse: string;
  readonly rawResponse?: string;
  readonly formattedDeliverable?: string;
  readonly extractionMethod?: string;
  readonly latencyMs: number;
  readonly failure: boolean;
  readonly recordedAtMs: number;
}

export interface BenchmarkJudgeGradingBrief {
  readonly questionTranscript: string;
  readonly exemplarAnswer: string;
  readonly exemplarQuality: "authored" | "derived";
  readonly deliverablesChecklist: readonly string[];
  readonly antiPatterns: readonly string[];
}

export interface BenchmarkResponseChannelDiagnostics {
  readonly hasContentText: boolean;
  readonly hasReasoningText: boolean;
  readonly hasOutputText: boolean;
  readonly hasToolCalls: boolean;
  readonly contentLength: number;
  readonly reasoningLength: number;
}

export interface BenchmarkJudgeRecord {
  readonly runId: string;
  readonly caseId: string;
  readonly endpointId: string;
  readonly judgeEndpointId: string;
  readonly requestId: string;
  readonly attempt: number;
  readonly promptMessages: readonly Record<string, unknown>[];
  readonly rawResponse: string;
  readonly parseSuccess: boolean;
  readonly parsedScore?: number;
  readonly parsedRationale?: string;
  readonly gradingMethod: "judge";
  readonly sourceArtifactPath: string;
  readonly gradingBrief?: BenchmarkJudgeGradingBrief;
  readonly judgeError?: string | null;
  readonly responseChannel?: BenchmarkResponseChannelDiagnostics;
  readonly judgeCircuitOpen?: boolean;
  readonly recordedAtMs: number;
}

export interface BenchmarkCompareModelRecord {
  readonly endpointId: string;
  readonly deliverablePreview: string;
  readonly perCaseScore: number;
}

export interface BenchmarkCompareRecord {
  readonly runId: string;
  readonly caseId: string;
  readonly models: readonly BenchmarkCompareModelRecord[];
  readonly relativeRanking: readonly string[];
  readonly rationale: string;
  readonly rawResponse: string;
  readonly judgeEndpointId: string;
  readonly gradingBrief?: BenchmarkJudgeGradingBrief;
  readonly compareError?: string | null;
  readonly compareFallback?: boolean;
  readonly compareCircuitOpen?: boolean;
  readonly responseChannel?: BenchmarkResponseChannelDiagnostics;
  readonly recordedAtMs: number;
}

export interface BenchmarkRunManifest {
  readonly runId: string;
  readonly suiteId: string;
  readonly mode: "quick" | "full";
  readonly judgeEndpointId: string | null;
  readonly judgeSubjectOverlap?: boolean;
  readonly startWarnings?: readonly string[];
  readonly startedAtMs: number;
  readonly executionCompletedAtMs: number;
  readonly gradingCompletedAtMs?: number;
  readonly endpointIds: readonly string[];
  readonly caseIds: readonly string[];
  readonly responseCount: number;
  readonly judgeArtifactCount?: number;
  readonly compareArtifactCount?: number;
  /** Canonical configured-pool membership revision captured once before execution begins. */
  readonly membershipRevision?: string | null;
  /** Immutable per-endpoint profile evidence revisions for this completed run. */
  readonly profileRevisionByEndpointId?: Readonly<Record<string, string>>;
  /** A run may be retained for diagnostics without being eligible as current evidence. */
  readonly completionState?: "running" | "completed" | "failed" | "cancelled" | "stale";
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function resolveBenchmarkRunArtifactDir(artifactRoot: string, runId: string): string {
  return path.join(artifactRoot, runId);
}

export function toBenchmarkArtifactRelativePath(artifactRoot: string, filePath: string): string {
  const normalizedRoot = path.resolve(artifactRoot);
  const normalizedFile = path.resolve(filePath);
  if (normalizedFile.startsWith(`${normalizedRoot}${path.sep}`)) {
    return path.relative(normalizedRoot, normalizedFile).split(path.sep).join("/");
  }
  return normalizedFile.split(path.sep).join("/");
}

export async function writeBenchmarkResponseRecord(
  artifactRoot: string,
  record: BenchmarkResponseRecord,
): Promise<string> {
  const filePath = path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, record.runId),
    "responses",
    sanitizePathSegment(record.endpointId),
    `${sanitizePathSegment(record.caseId)}.json`,
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
}

export async function writeBenchmarkJudgeRecord(
  artifactRoot: string,
  record: BenchmarkJudgeRecord,
): Promise<string> {
  const filePath = path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, record.runId),
    "judge",
    sanitizePathSegment(record.endpointId),
    sanitizePathSegment(record.caseId),
    `attempt-${record.attempt}.json`,
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
}

export function resolveBenchmarkJudgeSummaryPath(
  artifactRoot: string,
  runId: string,
  endpointId: string,
  caseId: string,
): string {
  return path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, runId),
    "judge",
    sanitizePathSegment(endpointId),
    `${sanitizePathSegment(caseId)}.json`,
  );
}

export async function writeBenchmarkJudgeSummary(
  artifactRoot: string,
  input: {
    readonly runId: string;
    readonly endpointId: string;
    readonly caseId: string;
    readonly judgeEndpointId: string;
    readonly parseSuccess: boolean;
    readonly parsedScore?: number;
    readonly parsedRationale?: string;
    readonly sourceArtifactPath: string;
    readonly attemptArtifactPaths: readonly string[];
    readonly recordedAtMs: number;
  },
): Promise<string> {
  const filePath = resolveBenchmarkJudgeSummaryPath(
    artifactRoot,
    input.runId,
    input.endpointId,
    input.caseId,
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        runId: input.runId,
        endpointId: input.endpointId,
        caseId: input.caseId,
        judgeEndpointId: input.judgeEndpointId,
        parseSuccess: input.parseSuccess,
        parsedScore: input.parsedScore,
        parsedRationale: input.parsedRationale,
        sourceArtifactPath: input.sourceArtifactPath,
        attemptArtifactPaths: input.attemptArtifactPaths,
        gradingMethod: "judge",
        recordedAtMs: input.recordedAtMs,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return filePath;
}

export async function writeBenchmarkCompareRecord(
  artifactRoot: string,
  record: BenchmarkCompareRecord,
): Promise<string> {
  const filePath = path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, record.runId),
    "judge",
    "compare",
    `${sanitizePathSegment(record.caseId)}.json`,
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
}

export async function writeBenchmarkRunManifest(
  artifactRoot: string,
  manifest: BenchmarkRunManifest,
): Promise<string> {
  const filePath = path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, manifest.runId),
    "manifest.json",
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return filePath;
}
