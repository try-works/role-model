import { Schema } from "effect";

/**
 * S585: the router posture editors write the unified runtime config, so their draft state lives on
 * the shell model and survives route changes. All fields are strings: the host validates them.
 */
export const RouterPostureStateSchema = Schema.Struct({
  agentJson: Schema.String,
  entryDescription: Schema.String,
  entryModel: Schema.String,
  entryName: Schema.String,
  entryRole: Schema.String,
  executionMode: Schema.String,
  message: Schema.optional(Schema.String),
  mode: Schema.String,
  pinWeights: Schema.String,
  scoringStrategy: Schema.String,
  status: Schema.Literals(["idle", "saving", "saved", "error"]),
  token: Schema.Number,
  workloadsJson: Schema.String,
});
export type RouterPostureState = typeof RouterPostureStateSchema.Type;

export const initialRouterPostureState = (): RouterPostureState => ({
  agentJson: "",
  entryDescription: "",
  entryModel: "",
  entryName: "",
  entryRole: "",
  executionMode: "",
  mode: "",
  pinWeights: "off",
  scoringStrategy: "",
  status: "idle",
  token: 0,
  workloadsJson: "",
});

export const ROUTER_MODES = ["baseline", "difficulty", "hybrid", "intelligent"] as const;
export const ROUTER_SCORING_STRATEGIES = ["balanced", "quality", "latency", "cost", "custom"] as const;
export const ROUTER_EXECUTION_MODES = ["decision_only", "hybrid", "local_only", "remote_only"] as const;
