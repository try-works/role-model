export async function run(envelope = {}) {
  const capability = envelope.capability ?? "health:probe";
  if (capability === "health:probe") return { available: true, probe: "run87.shadow" };
  if (capability === "replay:plan-graph") {
    const value = envelope.value;
    return {
      ...value,
      sourceDecisionId: value.sourceDecisionId,
      sourceGraphRef: value.sourceGraphRef,
      sharedPrefixRef: `${value.sourceGraphRef}#sha256:fixture`,
      branches: value.counterfactuals.map((counterfactual) => ({ id: counterfactual.id })),
      digest: "fixture-replay",
    };
  }
  if (capability === "evaluation:register-scorer") return { key: `${envelope.value.id}@${envelope.value.version}` };
  if (capability === "evaluation:create-job") {
    const job = envelope.value;
    return { ...job, status: "queued" };
  }
  if (capability === "evaluation:list-trials") {
    return [{ trialId: `trial:${envelope.value.jobId}`, jobId: envelope.value.jobId }];
  }
  if (capability === "evaluation:claim-trial") {
    return { trialId: envelope.value.trialId, leaseId: `lease:${envelope.value.trialId}` };
  }
  if (capability === "evaluation:execute-trial") {
    const value = envelope.value;
    return {
      outputRef: value.outputRef,
      outputDigest: value.outputDigest,
      stdoutRef: value.stdoutRef,
      stderrRef: value.stderrRef,
      exitCode: value.exitCode,
      measurements: value.measurements,
      scores: [{ scorerId: envelope.scorerDefinitions[0].id, scorerVersion: envelope.scorerDefinitions[0].version, scorerDigest: envelope.scorerDefinitions[0].digest, scorerDefinition: envelope.scorerDefinitions[0], dimension: "correctness", score: value.actual === "expected-route" ? 1 : 0, confidence: 1, source: "deterministic_semantic_criteria" }],
    };
  }
  if (capability === "evaluation:submit-trial-result" || capability === "evaluation:record-trial-score-batch") return { accepted: true };
  if (capability === "evaluation:finalize-comparison-group" || capability === "evaluation:read-comparison-group") return { groupId: envelope.value.groupId, status: "finalized", outcome: "candidate" };
  if (capability === "signals:analyze-finalized-evaluation") {
    const value = envelope.value;
    return {
      routeDecisionId: value.routeDecisionId,
      graphRef: value.graphRef,
      signals: [],
      evaluationPriority: "normal",
      classification: "behavioral_diagnostics_not_factual_correctness",
      evaluationProvenance: value.finalizedEvaluation,
    };
  }
  if (capability === "profile:estimate-finalized-evaluation") {
    const rows = envelope.rows ?? envelope.value.rows;
    return {
      effects: {
        routePackage: {
          values: [rows[0].routePackage],
          sampleCount: rows.length,
          confidence: "insufficient_sample",
          propensity: "observed",
          bias: "observational_noncausal",
          evidenceRefs: rows.map((row) => row.evidenceRef),
        },
      },
      bias: "unadjusted_observational",
      digest: "fixture-profile",
    };
  }
  if (capability === "knowledge:eval-consumer") {
    return {
      schemaVersion: "role-model.route-learning-shadow-candidate.v1",
      state: "shadow",
      routePackageAttribution: { routePackage: envelope.value.scope.routePackage },
      productionEffects: {
        providerCalls: 0,
        promptMutations: 0,
        routeMutations: 0,
        weightMutations: 0,
        activeProfileMutations: 0,
      },
      provenanceDigest: "a".repeat(64),
    };
  }
  throw new Error(`unsupported shadow fixture capability: ${capability}`);
}
