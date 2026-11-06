import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  outcomeParity,
  parseCompareCounts,
  parseRunOutcomes,
  scanSelfcheckSurface,
  selfcheckSurfaceVerdict,
} from "./packaged-parity-lane.mjs";
import {
  evaluateSelfcheckSurfaceRuns,
  parseSelfcheckSurfaceDom,
} from "./parity-selfcheck-surface.mjs";

/**
 * S612 (R14): unit contract for the packaged parity lane's pure helpers.
 *
 * The lane itself boots packaged binaries (slow, live), so its judgement is factored into helpers and
 * pinned here: identical assertion outcomes across the deterministic double run, the cross-artifact
 * comparison verdict, and the honest selfcheck-surface absence check. RED first: these helpers did not
 * exist before this file.
 */

const runLog = (lines) => lines.join("\n");

describe("packaged parity lane helpers", () => {
  it("parses PASS/FAIL assertion outcomes in order and ignores narrating lines", () => {
    const outcomes = parseRunOutcomes(
      runLog([
        "# S601 packaged routing E2E",
        "HTTP GET /healthz -> 200",
        "PASS health: healthy 0.0.20-471-g2e4aca6b",
        "PASS deepseek alias is served by /v1/models: deepseek/deepseek-flash (3 deepseek alias(es))",
        "FAIL POST /v1/chat/completions returns a real completion: chat HTTP 502",
        "RESULT: FAIL (1 failure(s))",
      ]),
    );
    assert.deepEqual(
      outcomes.map((entry) => [entry.status, entry.name]),
      [
        ["PASS", "health"],
        ["PASS", "deepseek alias is served by /v1/models"],
        ["FAIL", "POST /v1/chat/completions returns a real completion"],
      ],
    );
  });

  it("reports PARITY for identical outcomes and DIVERGENCE for a changed one", () => {
    const first = parseRunOutcomes(runLog(["PASS a: 1", "PASS b: 2"]));
    const same = parseRunOutcomes(runLog(["PASS a: 1", "PASS b: 2"]));
    const changed = parseRunOutcomes(runLog(["PASS a: 1", "FAIL b: 2"]));
    assert.equal(outcomeParity(first, same).verdict, "PARITY");
    const divergence = outcomeParity(first, changed);
    assert.equal(divergence.verdict, "DIVERGENCE");
    assert.match(divergence.detail, /b/);
  });

  it("reports INCOMPLETE when a run produced no assertion outcomes", () => {
    assert.equal(outcomeParity([], []).verdict, "INCOMPLETE");
    assert.equal(outcomeParity(parseRunOutcomes("PASS a: 1"), []).verdict, "INCOMPLETE");
  });

  it("classifies a compare-release summary: same/additive/environment is parity, different is not", () => {
    const clean = parseCompareCounts(
      runLog([
        "identity left=0.0.20 right=0.0.20-471-g2e4aca6b",
        "same /api/role-model/models (200/200)",
        "additive-shape /api/role-model/router/summary (200/200)",
        '{"same":5,"additive-shape":2,"environment-state":1}',
      ]),
    );
    assert.equal(clean.verdict, "PARITY");
    assert.deepEqual(clean.counts, { same: 5, "additive-shape": 2, "environment-state": 1 });

    const divergent = parseCompareCounts(
      runLog([
        "same /api/role-model/models (200/200)",
        "different /api/role-model/endpoints (200/200)",
        '{"same":1,"different":1}',
      ]),
    );
    assert.equal(divergent.verdict, "DIVERGENCE");

    assert.equal(
      parseCompareCounts("NOT RUN: --left-exe did not become healthy").verdict,
      "NOT_RUN",
    );
    assert.equal(parseCompareCounts("").verdict, "NOT_RUN");
  });

  it("states the selfcheck surface honestly", () => {
    assert.equal(selfcheckSurfaceVerdict([]), "NOT PRESENT");
    assert.equal(selfcheckSurfaceVerdict([{ file: "x", line: "selfcheck" }]), "PRESENT");
  });
});

describe("selfcheck surface scan is not fooled by minified bundles", () => {
  it("ignores react+digest co-occurrence inside a one-line bundle but reports a route marker in source", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "r14-scan-"));
    try {
      mkdirSync(path.join(root, "assets"), { recursive: true });
      writeFileSync(
        path.join(root, "assets", "main.js"),
        'const framework="react";const hash="sha256";const digest="x";\n',
        "utf8",
      );
      const bundleOnly = scanSelfcheckSurface([root]);
      assert.equal(
        bundleOnly.matches.length,
        0,
        "a minified bundle's react+digest co-occurrence is not a selfcheck surface",
      );
      mkdirSync(path.join(root, "src"), { recursive: true });
      writeFileSync(
        path.join(root, "src", "route.ts"),
        'const probe = "/api/role-model/selfcheck";\n',
        "utf8",
      );
      const withRoute = scanSelfcheckSurface([root]);
      assert.equal(withRoute.matches.length, 1);
      assert.match(withRoute.matches[0].line, /selfcheck/);
      assert.equal(selfcheckSurfaceVerdict(withRoute.matches), "PRESENT");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe("served selfcheck surface", () => {
  const html = (marker, theme) =>
    `<main data-selfcheck-marker="${marker}">` +
    `<div data-selfcheck-key="surface" data-selfcheck-value="rm3-selfcheck-v1"></div>` +
    `<div data-selfcheck-key="theme" data-selfcheck-value="${theme}"></div>` +
    "</main>";

  it("extracts the served marker and ordered specimen entries from rendered DOM", () => {
    const parsed = parseSelfcheckSurfaceDom(html("a1b2c3d4", "dark"), "react");
    assert.equal(parsed.marker, "a1b2c3d4");
    assert.deepEqual(parsed.entries, [
      { key: "surface", value: "rm3-selfcheck-v1" },
      { key: "theme", value: "dark" },
    ]);
    assert.equal(parsed.targetId, "react");
  });

  it("reports 0DIFF for identical packaged React and Foldkit surfaces across a double run", () => {
    const run = [
      parseSelfcheckSurfaceDom(html("a1b2c3d4", "dark"), "react"),
      parseSelfcheckSurfaceDom(html("a1b2c3d4", "dark"), "foldkit"),
    ];
    const result = evaluateSelfcheckSurfaceRuns({ chromeAvailable: true, runs: [run, run] });
    assert.equal(result.status, "PASSED");
    assert.equal(result.verdict, "0DIFF");
  });

  it("reports the divergence instead of 0DIFF when an entry differs", () => {
    const result = evaluateSelfcheckSurfaceRuns({
      chromeAvailable: true,
      runs: [
        [
          parseSelfcheckSurfaceDom(html("a1b2c3d4", "dark"), "react"),
          parseSelfcheckSurfaceDom(html("a1b2c3d4", "light"), "foldkit"),
        ],
        [
          parseSelfcheckSurfaceDom(html("a1b2c3d4", "dark"), "react"),
          parseSelfcheckSurfaceDom(html("a1b2c3d4", "light"), "foldkit"),
        ],
      ],
    });
    assert.equal(result.status, "FAILED");
    assert.match(String(result.reason), /mismatch|divergence/);
  });
});
