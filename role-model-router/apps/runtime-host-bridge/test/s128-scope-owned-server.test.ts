import { Effect, Exit, Scope } from "effect";
import { describe, expect, it } from "vitest";

/**
 * Run 115 S128 (R27 first rewiring slice): the server is owned by an Effect Scope.
 *
 * These pin the two properties cli.ts now relies on: Scope.close runs the acquireRelease finalizer
 * exactly once (twice closing must not double-close the server), and a failing finalizer surfaces
 * as a failure of Scope.close so releaseHostResources can report it like any other release error.
 */
describe("S128 scope-owned host resource", () => {
  it("closes the resource exactly once even when the scope is closed twice", async () => {
    let closes = 0;
    const scope = Effect.runSync(Scope.make());
    const value = await Effect.runPromise(
      Scope.provide(
        Effect.acquireRelease(
          Effect.promise(async () => ({ id: "server" })),
          () =>
            Effect.promise(async () => {
              closes += 1;
            }),
        ),
        scope,
      ),
    );
    expect(value.id).toBe("server");
    await Effect.runPromise(Scope.close(scope, Exit.void));
    await Effect.runPromise(Scope.close(scope, Exit.void));
    expect(closes).toBe(1);
  });

  it("surfaces a failing finalizer instead of swallowing it", async () => {
    const scope = Effect.runSync(Scope.make());
    await Effect.runPromise(
      Scope.provide(
        Effect.acquireRelease(
          Effect.promise(async () => ({ id: "server" })),
          () =>
            Effect.promise(async () => {
              throw new Error("close failed");
            }),
        ),
        scope,
      ),
    );
    const exit = await Effect.runPromiseExit(Scope.close(scope, Exit.void));
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("releases nothing when the acquisition fails", async () => {
    let closes = 0;
    const scope = Effect.runSync(Scope.make());
    const exit = await Effect.runPromiseExit(
      Scope.provide(
        Effect.acquireRelease(
          Effect.promise(async (): Promise<{ id: string }> => {
            throw new Error("bind failed");
          }),
          () =>
            Effect.promise(async () => {
              closes += 1;
            }),
        ),
        scope,
      ),
    );
    await Effect.runPromise(Scope.close(scope, Exit.void));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(closes).toBe(0);
  });
});
