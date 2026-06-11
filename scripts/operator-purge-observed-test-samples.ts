import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import {
  aggregateObservedPerformanceSamples,
  type ObservedPerformanceSample,
} from "../role-model-router/packages/profile-aggregator/src/index.ts";

const DIFFICULTY_BUCKETS = ["easy", "medium", "hard"] as const;

const TEST_REQUEST_SQL = `request_id LIKE 'req-ui-test%'
  OR request_id LIKE 'req-qa-%'
  OR request_id LIKE 'req-live-%'
  OR request_id LIKE 'req-consumer-%'
  OR request_id LIKE 'req-difficulty-%'
  OR request_id LIKE 'trace-%'
  OR request_id LIKE 'bench-%'
  OR request_id LIKE 'req-routing-%'
  OR request_id LIKE 'consumer-%'
  OR request_id LIKE 'req-runtime-host%'`;

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

function rebuildProfilesForEndpoint(database: DatabaseSync, endpointId: string, nowMs: number): void {
  const remainingRows = database
    .prepare(
      "SELECT sample_json FROM observed_performance_samples WHERE endpoint_id = ? ORDER BY timestamp_ms ASC, sample_id ASC",
    )
    .all(endpointId) as Array<{ sample_json: string }>;

  if (remainingRows.length === 0) {
    database.prepare("DELETE FROM observed_profile_snapshots WHERE endpoint_id = ?").run(endpointId);
  } else {
    const samples = remainingRows.map(
      (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
    );
    const profile = aggregateObservedPerformanceSamples(samples, { nowMs });
    database
      .prepare(
        "INSERT OR REPLACE INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
      )
      .run(
        `${endpointId}:${profile.measured_at_ms}`,
        endpointId,
        profile.measured_at_ms,
        JSON.stringify(profile),
      );
  }

  for (const difficultyBucket of DIFFICULTY_BUCKETS) {
    const bucketRows = database
      .prepare(
        "SELECT sample_json FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ? ORDER BY timestamp_ms ASC, sample_id ASC",
      )
      .all(endpointId, difficultyBucket) as Array<{ sample_json: string }>;

    if (bucketRows.length === 0) {
      database
        .prepare(
          "DELETE FROM observed_profile_snapshots_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ?",
        )
        .run(endpointId, difficultyBucket);
      continue;
    }

    const bucketSamples = bucketRows.map(
      (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
    );
    const bucketProfile = aggregateObservedPerformanceSamples(bucketSamples, { nowMs });
    database
      .prepare(
        "INSERT OR REPLACE INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        `${endpointId}:${difficultyBucket}:${bucketProfile.measured_at_ms}`,
        endpointId,
        difficultyBucket,
        bucketProfile.measured_at_ms,
        JSON.stringify(bucketProfile),
      );
  }
}

function purgeEndpoint(database: DatabaseSync, endpointId: string, nowMs: number) {
  const benchmarkDeleted = database
    .prepare(
      "DELETE FROM observed_performance_samples WHERE endpoint_id = ? AND source_type = 'benchmark'",
    )
    .run(endpointId).changes;
  const benchmarkBucketDeleted = database
    .prepare(
      "DELETE FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND source_type = 'benchmark'",
    )
    .run(endpointId).changes;

  const testDeleted = database
    .prepare(
      `DELETE FROM observed_performance_samples WHERE endpoint_id = ? AND source_type = 'live_request' AND (${TEST_REQUEST_SQL})`,
    )
    .run(endpointId).changes;
  const testBucketDeleted = database
    .prepare(
      `DELETE FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND source_type = 'live_request' AND (${TEST_REQUEST_SQL})`,
    )
    .run(endpointId).changes;

  rebuildProfilesForEndpoint(database, endpointId, nowMs);

  const remaining = database
    .prepare(
      "SELECT source_type, COUNT(*) AS count FROM observed_performance_samples WHERE endpoint_id = ? GROUP BY source_type",
    )
    .all(endpointId) as Array<{ source_type: string; count: number }>;

  return {
    endpointId,
    benchmarkDeleted,
    benchmarkBucketDeleted,
    testDeleted,
    testBucketDeleted,
    remaining,
  };
}

function main(): void {
  const dbPath = resolveDatabasePath(process.argv[2]);
  const database = new DatabaseSync(dbPath);
  const nowMs = Date.now();

  const endpointIds = (
    database
      .prepare("SELECT DISTINCT endpoint_id FROM observed_performance_samples ORDER BY endpoint_id")
      .all() as Array<{ endpoint_id: string }>
  ).map((row) => row.endpoint_id);

  console.log(`database: ${dbPath}`);
  console.log(`endpoints: ${endpointIds.length}`);

  const results = endpointIds.map((endpointId) => purgeEndpoint(database, endpointId, nowMs));
  database.close();

  for (const result of results) {
    console.log(`\n${result.endpointId}`);
    console.log(
      `  deleted benchmark=${result.benchmarkDeleted}+${result.benchmarkBucketDeleted} test_live=${result.testDeleted}+${result.testBucketDeleted}`,
    );
    for (const row of result.remaining) {
      console.log(`  remaining ${row.source_type}: ${row.count}`);
    }
  }
}

main();
