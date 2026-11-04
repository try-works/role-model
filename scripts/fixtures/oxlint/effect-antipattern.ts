import { Effect } from "../../../role-model-router/packages/effect/src/index.ts";

export const antipattern = Effect.gen(function* () {
  try {
    return yield* Effect.succeed(1);
  } catch {
    return 0;
  }
});
