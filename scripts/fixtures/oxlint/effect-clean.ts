import { Effect } from "../../../role-model-router/packages/effect/src/index.ts";

export const clean = Effect.gen(function* () {
  const value = yield* Effect.succeed(1);
  return value + 1;
});
