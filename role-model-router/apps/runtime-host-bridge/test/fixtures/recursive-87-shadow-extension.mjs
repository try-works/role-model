export async function run(envelope = {}) {
  const capability = envelope.capability ?? "health:probe";
  if (capability === "health:probe") return { available: true, probe: "run87.shadow" };
  if (capability === "replay:plan-graph") {
    const value = envelope.value;
    return {
      ...value,
      sharedPrefixRef: `${value.sourceGraphRef}#sha256:fixture`,
      digest: "fixture-replay",
    };
  }
  if (capability === "evaluation:run-local") {
    const value = envelope.value;
    return {
      count: value.cases.length,
      scores: value.cases.map((row) => (row.expected === row.actual ? 1 : 0)),
      environment: "local-routing-evaluation",
      provenance: {
        policy: value.policy,
        task: value.task,
        scorer: value.scorer,
        split: value.split,
        seed: value.seed,
        evidenceRef: value.evidenceRef,
      },
    };
  }
  if (capability === "signals:analyze") {
    const value = envelope.value;
    return {
      routeDecisionId: value.routeDecisionId,
      graphRef: value.graphRef,
      signals: [],
      evaluationPriority: "normal",
      classification: "behavioral_diagnostics_not_factual_correctness",
    };
  }
  if (capability === "profile:estimate") {
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
