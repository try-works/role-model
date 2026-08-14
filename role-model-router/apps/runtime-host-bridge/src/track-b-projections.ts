import { type ProjectionV2, validateProjectionV2 } from "@role-model-router/trace";

export interface TrackBProjectionConsumerRuntime {
  invoke(id: string, envelope: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export async function consumeTrackBProjection(
  runtime: TrackBProjectionConsumerRuntime,
  value: ProjectionV2,
  input: { readonly channel: string; readonly authorizationEpoch: number },
) {
  const projection = validateProjectionV2(value);
  if (projection.readiness.rolloutPurpose !== "routing_shadow") {
    throw new Error("projection consumers are shadow-only");
  }
  if (
    !projection.readiness.permittedUse ||
    projection.readiness.authorizationState !== "authorized" ||
    projection.readiness.lifecycleReadiness !== "ready" ||
    projection.readiness.routingTrainingSuitability !== "eligible" ||
    projection.readiness.completeness === "unavailable" ||
    projection.readiness.evidenceCapability === "unavailable"
  ) {
    throw new Error("projection evidence is unavailable or not permitted for consumption");
  }
  const consumers = [
    ["evaluation-core", "evaluation:consume-projection"],
    ["profile-learner", "profile:consume-projection"],
    ["knowledge-worker", "knowledge:consume-projection"],
  ] as const;
  const results = [];
  for (const [id, capability] of consumers) {
    results.push(
      await runtime.invoke(id, {
        requestId: `${projection.id}:${id}`,
        protocolVersion: "1.1.0",
        channel: input.channel,
        scope: projection.scope,
        authorizationEpoch: input.authorizationEpoch,
        capability,
        projection,
      }),
    );
  }
  return {
    projectionId: projection.id,
    consumerCount: results.length,
    results,
    productionMutation: false,
  };
}
