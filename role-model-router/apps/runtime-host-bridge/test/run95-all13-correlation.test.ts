import { describe, expect, test } from "vitest";

import {
  TRACK_B_CANONICAL_EXTENSION_IDS,
  runTrackBPostObservation,
} from "../src/track-b-runtime.js";

describe("Run 95 all-thirteen occurrence correlation", () => {
  test("every canonical extension receives the same bounded occurrence/content reference", async () => {
    const envelopes = new Map<string, Array<Record<string, unknown>>>();
    const result = await runTrackBPostObservation(
      {
        invoke: async (id, envelope) => {
          const values = envelopes.get(id) ?? [];
          values.push(envelope as Record<string, unknown>);
          envelopes.set(id, values);
          const base = {
            extensionId: id,
            workerPid: 95,
            durableLocator: { id, requestId: envelope.requestId },
            evidenceRef: `evidence:${id}:${envelope.requestId}`,
            businessOutput: { id, bounded: true },
          };
          if (id === "artifact-store") {
            return {
              ...base,
              id: "artifact:run95",
              occurrence: { occurrenceId: "occurrence:run95", contentId: "content:authoritative" },
            };
          }
          if (id === "repository-context") {
            return {
              ...base,
              available: true,
              context: {
                scopeId: envelope.scope,
                repoFingerprint: "a".repeat(64),
                packageId: null,
                fallbackLevel: "repo_task",
                branchCompatibility: "unknown",
                fingerprintEpoch: 1,
              },
              diagnostics: [],
            };
          }
          if (envelope.capability === "knowledge:write") return { ...base, id: "knowledge:run95" };
          if (envelope.capability === "evaluation:run-local") {
            return {
              ...base,
              count: 1,
              scores: [1],
              environment: "local",
              provenance: { evidenceRef: base.evidenceRef },
            };
          }
          if (envelope.capability === "knowledge:eval-consumer") {
            return { ...base, id: "candidate:run95", state: "shadow", productionEffects: {} };
          }
          return base;
        },
      },
      {
        requestId: "request:run95",
        routingDecisionId: "decision:run95",
        endpointId: "endpoint:run95:max",
        modelId: "model:run95",
        reasoningEffort: "max",
        effortSource: "client",
        occurrenceId: "occurrence:run95",
        contentId: "content:caller-placeholder",
      },
      { scope: "tenant:run95", channel: "development", authorizationEpoch: 95 },
    );

    expect(Object.keys(result.extensionClosure.registry)).toEqual(
      [...TRACK_B_CANONICAL_EXTENSION_IDS].sort(),
    );
    expect(envelopes.get("artifact-store")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          occurrence: expect.objectContaining({ occurrenceId: "occurrence:run95" }),
        }),
      ]),
    );
    for (const id of TRACK_B_CANONICAL_EXTENSION_IDS.filter((id) => id !== "artifact-store")) {
      expect(envelopes.get(id)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            occurrence: { occurrenceId: "occurrence:run95", contentId: "content:authoritative" },
          }),
        ]),
      );
    }
    expect(JSON.stringify(result.extensionClosure)).not.toContain("raw-prompt");
  });
});
