import { describe, expect, test } from "vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";

// Run 108 R7 - the observability spine: module-scope metric declarations for the four chains,
// registry-scoped so tests and per-scope runtimes isolate, per the effect-grep canonical idiom.
import {
  evalFinaliseRefusals,
  learnerDerivations,
  replayAdmissions,
  routerDecisions,
  withStageSpan,
} from "../src/run108-observability.js";

const readIn = (metric: Metric.Metric<unknown, unknown, unknown>, registry: Metric.MetricRegistry) =>
  Effect.runSync(
    Metric.value(metric as never).pipe(Effect.provideService(Metric.MetricRegistry, registry)),
  );

describe("run108 R7 the observability spine", () => {
  test("declares the four chain metrics at module scope with the spec namespaces", () => {
    // The declarations exist (collection-level RED today: no module). Reading in a fresh registry
    // yields zero before any update - the module-scope declaration contract.
    const registry = new Map();
    expect(readIn(routerDecisions, registry)).toEqual({ count: 0, incremental: true });
    expect(readIn(replayAdmissions, registry)).toEqual({ count: 0, incremental: true });
    expect(readIn(evalFinaliseRefusals, registry)).toEqual({ count: 0, incremental: true });
    expect(readIn(learnerDerivations, registry)).toEqual({ count: 0, incremental: true });
  });

  test("updates are scoped to the active MetricRegistry and do not leak across registries", () => {
    const registryA = new Map();
    const registryB = new Map();
    Effect.runSync(
      Metric.update(replayAdmissions as never, 2).pipe(
        Effect.provideService(Metric.MetricRegistry, registryA),
      ),
    );
    expect(readIn(replayAdmissions, registryA)).toEqual({ count: 2, incremental: true });
    expect(readIn(replayAdmissions, registryB)).toEqual({ count: 0, incremental: true });
  });

  test("the finalise-refusal counter carries its guard/reason tag contract", () => {
    const registry = new Map();
    const attributed = Metric.withAttributes(evalFinaliseRefusals as never, {
      guard: "declared_pair",
      reason: "submitted_outside_pair",
    });
    Effect.runSync(
      Metric.update(attributed, 1).pipe(Effect.provideService(Metric.MetricRegistry, registry)),
    );
    expect(readIn(attributed, registry)).toEqual({ count: 1, incremental: true });
  });

  test("withStageSpan runs the work under a named span carrying the stage attributes", () => {
    // RED today: no withStageSpan export (collection failure).
    const recorded: Array<{ name: string; attributes: Record<string, unknown> }> = [];
    let completedExit: unknown = null;
    const makeSpan = (name: string): Tracer.Span => {
      const attributes: Record<string, unknown> = {};
      recorded.push({ name, attributes });
      return {
        _tag: "Span",
        name,
        spanId: "span-1",
        traceId: "trace-1",
        parent: Option.none(),
        annotations: Context.empty(),
        status: { _tag: "Started", startTime: 0n },
        attributes: new Map(),
        links: [],
        sampled: true,
        kind: "internal" as Tracer.SpanKind,
        end(_endTime, exit) {
          completedExit = exit;
        },
        attribute(key, value) {
          attributes[key] = value;
        },
        event() {},
        addLinks() {},
      };
    };
    const spy = Tracer.make({
      span(options) {
        return makeSpan(options.name);
      },
    });
    // The tracer is injectable on the sync wrapper (the host is plain TS, not an Effect program).
    const result = withStageSpan("router.decision", { kind: "live" }, () => 42, { tracer: spy });
    expect(result).toBe(42);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.name).toBe("router.decision");
    expect(recorded[0]?.attributes).toEqual({ kind: "live" });
    // completion recorded as effect.exit (canonical convention)
    expect((completedExit as { _tag: string })._tag).toBe("Success");
  });
});
