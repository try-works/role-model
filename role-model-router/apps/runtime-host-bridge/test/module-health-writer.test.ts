import { Cause, Effect, Exit, Option, Result } from "effect";
import { describe, expect, it } from "vitest";

import { readLocalDiagnostics } from "../src/local-diagnostics-read.js";
import { makeModuleHealthWriter } from "../src/module-health-writer.js";

/**
 * Run 115 S10a (R20 first slice): the bounded module-health record writer.
 *
 * The writer produces the four-scalar records the diagnostics reader consumes
 * (role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts:35-41): atMs, level,
 * code, count. It must never change what the business program returns or throws, and it must not
 * recurse on hostile causes/errors.
 */

const errorOf = (exit: Exit.Exit<unknown, unknown>): unknown =>
  Option.getOrThrow(Exit.findErrorOption(exit));

const defectOf = (exit: Exit.Exit<unknown, unknown>): unknown =>
  Result.getOrThrow(Exit.findDefect(exit));

const defectsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<unknown> => {
  if (!Exit.isFailure(exit)) {
    throw new Error("expected a failed exit");
  }
  return exit.cause.reasons.flatMap((reason) => (reason._tag === "Die" ? [reason.defect] : []));
};

const recordKeys = (record: Record<string, unknown>): string[] => Object.keys(record).sort();

describe("module health writer", () => {
  it("keeps a bounded ring buffer and counts every overflow instead of growing", () => {
    let clock = 1_000;
    const writer = makeModuleHealthWriter({
      capacity: 3,
      now: () => {
        clock += 10;
        return clock;
      },
    });

    for (let index = 0; index < 5; index += 1) {
      writer.recordCause(Cause.fail(new Error("business failure")));
    }

    const records = writer.records();
    expect(records).toHaveLength(3);
    expect(records.every((record) => record.code === "cause.fail")).toBe(true);
    expect(writer.loss()).toEqual({ dropped: 2, windowMs: 10 });
    expect(writer.records()[0]?.atMs).toBe(1_050);
    expect(writer.source().records()).toHaveLength(3);
  });

  it("distinguishes Fail, Die and Interrupt and leaves each original cause intact", () => {
    const writer = makeModuleHealthWriter();
    const primary = new Error("primary");
    const defect = new Error("defect");
    const failCause = Cause.fail(primary);
    const dieCause = Cause.die(defect);
    const interruptCause = Cause.interrupt(7);

    expect(writer.recordCause(failCause)).toBeUndefined();
    writer.recordCause(dieCause);
    writer.recordCause(interruptCause);

    const records = writer.records();
    expect(records.map((record) => [record.code, record.level])).toEqual([
      ["cause.interrupt", "warn"],
      ["cause.die", "error"],
      ["cause.fail", "error"],
    ]);

    // The writer observes; it never replaces or wraps the causes it is handed.
    expect(Option.getOrThrow(Cause.findErrorOption(failCause))).toBe(primary);
    expect(Option.isNone(Cause.findErrorOption(dieCause))).toBe(true);
    expect(Result.getOrThrow(Cause.findDefect(dieCause))).toBe(defect);
    expect(Cause.hasInterrupts(interruptCause)).toBe(true);
    expect(failCause.reasons).toHaveLength(1);
    expect(dieCause.reasons).toHaveLength(1);
  });

  it("bounds one cause's reasons and counts the rest instead of growing", () => {
    const writer = makeModuleHealthWriter({ capacity: 32 });
    const reasons = Array.from({ length: 20 }, (_, index) =>
      Cause.makeFailReason(new Error(`reason-${String(index)}`)),
    );

    writer.recordCause(Cause.fromReasons(reasons));

    const records = writer.records();
    expect(records).toHaveLength(9);
    expect(records.filter((record) => record.code === "cause.fail")).toHaveLength(8);
    expect(records[0]).toMatchObject({ code: "cause.truncated", count: 12 });
    expect(records[0]?.level).toBe("warn");
    expect(writer.loss().dropped).toBe(0);
  });

  it("records a plain error without reading hostile accessors", () => {
    const writer = makeModuleHealthWriter();
    const secret = "SECRET-PLAIN-ERROR";
    const hostile = Object.defineProperties(
      {},
      {
        message: {
          get: () => {
            throw new Error(secret);
          },
        },
        name: {
          get: () => {
            throw new Error(secret);
          },
        },
        stack: {
          get: () => {
            throw new Error(secret);
          },
        },
      },
    );

    expect(() => writer.recordError(hostile)).not.toThrow();
    const records = writer.records();
    expect(records).toHaveLength(1);
    expect(records[0]?.code).toBe("error");
    expect(JSON.stringify(records)).not.toContain("SECRET");
  });

  it("contains a throwing reporter so the business result is unchanged", async () => {
    const primary = new Error("business failure");
    const writer = makeModuleHealthWriter({
      onRecord: () => {
        throw new Error("reporter outage");
      },
    });

    const without = await Effect.runPromiseExit(Effect.fail(primary));
    const withWriter = await Effect.runPromiseExit(writer.observe(Effect.fail(primary)));

    expect(errorOf(withWriter)).toBe(errorOf(without));
    expect(errorOf(withWriter)).toBe(primary);
    expect(writer.outages()).toBeGreaterThan(0);
  });

  it("contains a cause whose reasons accessor throws", () => {
    const writer = makeModuleHealthWriter();
    const hostileCause = {
      [Cause.TypeId]: Cause.TypeId,
      get reasons(): ReadonlyArray<Cause.Reason<unknown>> {
        throw new Error("hostile reasons");
      },
    } as unknown as Cause.Cause<unknown>;

    expect(() => writer.recordCause(hostileCause)).not.toThrow();
    expect(writer.outages()).toBeGreaterThan(0);
    expect(writer.records()).toHaveLength(0);
  });

  it("does not recurse on a cyclic error or a reused error", () => {
    const writer = makeModuleHealthWriter();
    const cyclic: Record<string, unknown> = { message: "cyclic" };
    cyclic.self = cyclic;
    const reused = new Error("reused");

    expect(() => {
      writer.recordError(cyclic);
      writer.recordError(reused);
      writer.recordError(reused);
    }).not.toThrow();

    expect(writer.records()).toHaveLength(3);
    expect(() => JSON.stringify(writer.records())).not.toThrow();
  });

  it("records a nested/mixed cause without merging the kinds or recursing", () => {
    const writer = makeModuleHealthWriter();
    const primary = new Error("primary");
    const defect = new Error("defect");
    const mixedCause = Cause.combine(
      Cause.fail(primary),
      Cause.combine(Cause.die(defect), Cause.interrupt(3)),
    );

    writer.recordCause(mixedCause);

    const codes = writer
      .records()
      .map((record) => record.code)
      .sort();
    expect(codes).toEqual(["cause.die", "cause.fail", "cause.interrupt"]);
    expect(mixedCause.reasons).toHaveLength(3);
    expect(Option.getOrThrow(Cause.findErrorOption(mixedCause))).toBe(primary);
    expect(writer.outages()).toBe(0);
  });

  it("preserves an acquire/finalizer mixed exit with and without the writer", async () => {
    const primary = new Error("use failed");
    const releaseDefect = new Error("release died");
    const program = Effect.scoped(
      Effect.acquireRelease(Effect.succeed("resource"), () => Effect.die(releaseDefect)).pipe(
        Effect.flatMap(() => Effect.fail(primary)),
      ),
    );
    const writer = makeModuleHealthWriter();

    const without = await Effect.runPromiseExit(program);
    const withWriter = await Effect.runPromiseExit(writer.observe(program));

    // Effect reports this acquire/finalizer combination as two Die reasons (the typed failure is
    // carried as a defect alongside the release defect); the writer must preserve exactly that
    // cause, not "helpfully" reclassify or drop it.
    expect(defectsOf(withWriter)).toEqual(defectsOf(without));
    expect(defectsOf(withWriter)).toEqual([primary, releaseDefect]);
    const codes = writer.records().map((record) => record.code);
    expect(codes.filter((code) => code === "cause.die")).toHaveLength(2);
    expect(codes).not.toContain("cause.fail");
  });

  it("keeps the business value/error identity identical with and without the writer", async () => {
    const writer = makeModuleHealthWriter();
    const primary = new Error("identity");
    const defect = new Error("defect identity");
    const value = { business: "value" };

    const failWithout = await Effect.runPromiseExit(Effect.fail(primary));
    const failWith = await Effect.runPromiseExit(writer.observe(Effect.fail(primary)));
    expect(errorOf(failWith)).toBe(errorOf(failWithout));
    expect(errorOf(failWith)).toBe(primary);

    const dieWithout = await Effect.runPromiseExit(Effect.die(defect));
    const dieWith = await Effect.runPromiseExit(writer.observe(Effect.die(defect)));
    expect(defectOf(dieWith)).toBe(defectOf(dieWithout));
    expect(defectOf(dieWith)).toBe(defect);

    const successWithout = await Effect.runPromiseExit(Effect.succeed(value));
    const successWith = await Effect.runPromiseExit(writer.observe(Effect.succeed(value)));
    expect(Option.getOrThrow(Exit.getSuccess(successWith))).toBe(value);
    expect(Option.getOrThrow(Exit.getSuccess(successWithout))).toBe(value);

    const interruptWithout = await Effect.runPromiseExit(Effect.interrupt);
    const interruptWith = await Effect.runPromiseExit(writer.observe(Effect.interrupt));
    if (!Exit.isFailure(interruptWith) || !Exit.isFailure(interruptWithout)) {
      throw new Error("interrupt must fail the exit");
    }
    expect(Cause.hasInterruptsOnly(interruptWith.cause)).toBe(
      Cause.hasInterruptsOnly(interruptWithout.cause),
    );
    expect(Cause.hasInterrupts(interruptWith.cause)).toBe(true);
  });

  it("is a single report owner: one write per observed exit and none for success or inner failures", async () => {
    const writer = makeModuleHealthWriter();
    const primary = new Error("outer failure");

    await Effect.runPromiseExit(writer.observe(Effect.fail(primary)));
    expect(writer.records()).toHaveLength(1);

    const successWriter = makeModuleHealthWriter();
    await Effect.runPromiseExit(successWriter.observe(Effect.succeed(42)));
    expect(successWriter.records()).toHaveLength(0);

    const caughtWriter = makeModuleHealthWriter();
    await Effect.runPromiseExit(
      caughtWriter.observe(
        Effect.catchIf(
          Effect.fail(new Error("inner")),
          () => true,
          () => Effect.succeed(1),
        ),
      ),
    );
    expect(caughtWriter.records()).toHaveLength(0);
    expect(writer.outages()).toBe(0);
  });

  it("redacts: only four bounded scalars leave the writer, never a message or fiber dump", () => {
    const writer = makeModuleHealthWriter({ maxCodeBytes: 24 });
    const secret = "SECRET-TOKEN-1234567890";
    const error = new Error(secret);

    writer.recordCause(Cause.fail(error));
    writer.recordCause(Cause.interrupt(11));

    const records = writer.records();
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(recordKeys(record)).toEqual(["atMs", "code", "count", "level"]);
      expect(Buffer.byteLength(record.code, "utf8")).toBeLessThanOrEqual(24);
    }
    const serialized = JSON.stringify({ records, loss: writer.loss(), source: writer.source() });
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("fiber");
    expect(serialized).not.toContain("stack");
  });

  it("feeds the diagnostics read contract: identity, records, loss and empty state", () => {
    const writer = makeModuleHealthWriter({
      buildId: "build-writer",
      capacity: 2,
      instanceId: "instance-writer",
      now: () => 100_000,
    });
    for (let index = 0; index < 3; index += 1) {
      writer.recordCause(Cause.fail(new Error("failure")));
    }

    const read = readLocalDiagnostics({ nowMs: 100_000, source: writer.source() });
    expect(read.status).toBe(200);
    expect(read.body.identity).toEqual({
      buildId: "build-writer",
      instanceId: "instance-writer",
    });
    expect(read.body.state).toBe("dropped");
    expect(read.body.records).toHaveLength(2);
    expect(read.body.loss).toEqual({ dropped: 1, windowMs: 0 });
    for (const record of read.body.records ?? []) {
      expect(recordKeys(record as unknown as Record<string, unknown>)).toEqual([
        "atMs",
        "code",
        "count",
        "level",
      ]);
    }

    const empty = makeModuleHealthWriter({
      buildId: "build-empty",
      instanceId: "instance-empty",
      now: () => 0,
    });
    const emptyRead = readLocalDiagnostics({ nowMs: 0, source: empty.source() });
    expect(emptyRead.body.state).toBe("empty");
    expect(emptyRead.body.records).toEqual([]);
  });
});
