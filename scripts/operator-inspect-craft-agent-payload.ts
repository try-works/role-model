import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const CODE_OR_SCHEMA_RE = /\b(code|diff|patch|refactor|schema|contract|validation|test)\b/i;

function resolveDatabasePath(argvPath?: string): string {
  if (argvPath) {
    return argvPath;
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error("LOCALAPPDATA is not set; pass database path as argv[2].");
  }
  return path.join(
    localAppData,
    "Role Model Runtime",
    "standalone-runtime",
    "memory",
    "memory.sqlite",
  );
}

function scoreDifficulty(signals: {
  contextTokens: number;
  toolCount: number;
  historyTurnCount: number;
  instructionConstraintCount: number;
  decompositionKeywordCount: number;
  codeOrSchemaBurden: boolean;
}): "easy" | "medium" | "hard" {
  let score = 0;
  if (signals.contextTokens >= 2000) score += 3;
  else if (signals.contextTokens >= 600) score += 1;
  if (signals.toolCount >= 2) score += 3;
  else if (signals.toolCount === 1) score += 1;
  if (signals.historyTurnCount >= 4) score += 2;
  else if (signals.historyTurnCount >= 2) score += 1;
  if (signals.instructionConstraintCount >= 5) score += 2;
  else if (signals.instructionConstraintCount >= 2) score += 1;
  if (signals.decompositionKeywordCount >= 3) score += 2;
  else if (signals.decompositionKeywordCount >= 1) score += 1;
  if (signals.codeOrSchemaBurden) score += 2;
  if (score >= 7) return "hard";
  if (score >= 3) return "medium";
  return "easy";
}

function summarizeSignals(
  combined: string,
  historyTurnCount: number,
  toolCount = 0,
): {
  contextTokens: number;
  toolCount: number;
  historyTurnCount: number;
  instructionConstraintCount: number;
  decompositionKeywordCount: number;
  codeOrSchemaBurden: boolean;
  difficulty: "easy" | "medium" | "hard";
  matchedCodeOrSchemaTerms: string[];
} {
  const lower = combined.toLowerCase();
  const instructionConstraintCount = (
    lower.match(
      /\b(must|should|need to|required|preserve|verify|strict|do not|don't|never|without|constraint|compatible)\b/g,
    ) ?? []
  ).length;
  const decompositionKeywordCount = (
    lower.match(
      /\b(analyze|compare|iterate|plan|step|decompose|refactor|workflow|multi-step|across)\b/g,
    ) ?? []
  ).length;
  const matchedCodeOrSchemaTerms = [
    ...new Set(
      (
        combined.match(/\b(code|diff|patch|refactor|schema|contract|validation|test)\b/gi) ?? []
      ).map((term) => term.toLowerCase()),
    ),
  ];
  const signals = {
    contextTokens: Math.ceil(combined.length / 4),
    toolCount,
    historyTurnCount,
    instructionConstraintCount,
    decompositionKeywordCount,
    codeOrSchemaBurden: CODE_OR_SCHEMA_RE.test(combined),
  };
  return {
    ...signals,
    difficulty: scoreDifficulty(signals),
    matchedCodeOrSchemaTerms,
  };
}

function main(): void {
  const dbPath = resolveDatabasePath(process.argv[2]);
  const database = new DatabaseSync(dbPath);

  console.log(`database: ${dbPath}`);

  const turns = database
    .prepare(
      "SELECT turn_id, role, content_ref, created_at_ms FROM conversation_turns WHERE conversation_id = 'conversation-main' ORDER BY created_at_ms ASC",
    )
    .all() as Array<{ turn_id: string; role: string; content_ref: string; created_at_ms: number }>;

  console.log(`\n=== conversation-main turns (${turns.length}) ===`);
  const combinedParts: string[] = [];
  for (const turn of turns) {
    const artifact = turn.content_ref
      ? (database
          .prepare("SELECT artifact_kind, storage_ref FROM context_artifacts WHERE artifact_id = ?")
          .get(turn.content_ref) as { artifact_kind: string; storage_ref: string } | undefined)
      : undefined;
    let text = turn.content_ref ?? "";
    if (artifact?.storage_ref) {
      text = artifact.storage_ref;
    }
    combinedParts.push(text);
    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    console.log(`- [${turn.role}] ${preview}`);
  }

  const combined = combinedParts.join("\n");
  const summary = summarizeSignals(combined, turns.length, 0);
  console.log("\n=== difficulty rubric on stored conversation-main ===");
  console.log(JSON.stringify(summary, null, 2));

  const cache = database
    .prepare(
      "SELECT cache_json, updated_at_ms FROM difficulty_classification_cache WHERE conversation_id = 'conversation-main'",
    )
    .get() as { cache_json?: string; updated_at_ms?: number } | undefined;
  if (cache?.cache_json) {
    console.log("\n=== difficulty_classification_cache ===");
    console.log(cache.cache_json);
  }

  const craftLikeSystem =
    "You are Craft Agent, powered by Craft Agents Backend. Help users connect data sources, automate workflows, and validate integrations. Follow the system contract and schema for tool validation.";
  const userOnly = "Whats your name";
  console.log("\n=== hypothesized Craft Agent first-turn payload ===");
  console.log(JSON.stringify(summarizeSignals(`${craftLikeSystem}\n${userOnly}`, 2, 0), null, 2));

  const obs = database
    .prepare(
      `SELECT request_id, observation_json
       FROM runtime_observations
       WHERE observation_json LIKE '%Whats your name%'
          OR observation_json LIKE '%Craft Agent%'
          OR observation_json LIKE '%mixed.local-remote%'
       ORDER BY created_at_ms DESC
       LIMIT 5`,
    )
    .all() as Array<{ request_id: string; observation_json: string }>;

  console.log(`\n=== runtime_observations matching Craft/name (${obs.length}) ===`);
  for (const row of obs) {
    const parsed = JSON.parse(row.observation_json) as {
      routingDiagnostics?: {
        difficultyRouting?: {
          difficulty?: string;
          rubricSignals?: Record<string, unknown>;
        };
      };
    };
    console.log(
      `${row.request_id}: difficulty=${parsed.routingDiagnostics?.difficultyRouting?.difficulty ?? "?"} signals=${JSON.stringify(parsed.routingDiagnostics?.difficultyRouting?.rubricSignals ?? {})}`,
    );
  }

  database.close();
}

main();
