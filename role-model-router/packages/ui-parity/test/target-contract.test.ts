import { describe, expect, it } from "vitest";

import {
  type VerificationExecutionState,
  type VerificationTargetIntent,
  type VerificationTargetObservation,
  evaluateVerificationOutcome,
  validateVerificationTarget,
} from "../src/target-contract.js";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function intent(
  overrides: Partial<VerificationTargetIntent> = {},
): VerificationTargetIntent {
  return {
    platform: "windows",
    expectedClientHost: "127.0.0.1",
    expectedClientPort: 4310,
    expectedArtifactSha256: SHA_A,
    expectedSourceTree: "source-tree-a",
    expectedPrivateDistribution: "private-dist-a",
    expectedUiTree: "ui-tree-a",
    expectedPid: 4321,
    expectedStateRoot: "C:\\RoleModel\\run115\\state",
    expectedConfigRoot: "C:\\RoleModel\\run115\\config",
    forbiddenRoots: [
      "C:\\ProgramData\\RoleModel\\operator",
      "C:\\Users\\operator\\AppData\\Local\\role-model",
    ],
    requirePackaged: true,
    ...overrides,
  };
}

function observation(
  overrides: Partial<VerificationTargetObservation> = {},
): VerificationTargetObservation {
  return {
    clientUrl: "http://127.0.0.1:4310",
    artifactSha256: SHA_A,
    sourceTree: "source-tree-a",
    privateDistribution: "private-dist-a",
    uiTree: "ui-tree-a",
    pid: 4321,
    stateRoot: "C:\\RoleModel\\run115\\state",
    configRoot: "C:\\RoleModel\\run115\\config",
    health: "ready",
    provenance: "packaged",
    buildMode: "packaged",
    ...overrides,
  };
}

function codes(findings: readonly { readonly code: string }[]): readonly string[] {
  return findings.map((finding) => finding.code);
}

describe("validateVerificationTarget", () => {
  it.each(["http://127.0.0.1:4310?", "http://127.0.0.1:4310#"]) ("rejects empty raw URL suffix %s", (clientUrl) => {
    expect(validateVerificationTarget(intent(), observation({ clientUrl })).ok).toBe(false);
  });
  it("rejects an invalid forbidden-root entry", () => {
    expect(validateVerificationTarget(intent({ forbiddenRoots: ["relative"] }), observation()).ok).toBe(false);
  });
  it("rejects a relative config root", () => {
    expect(validateVerificationTarget(intent({ expectedConfigRoot: "config" }), observation()).ok).toBe(false);
  });
  it("rejects an empty expected host", () => {
    expect(validateVerificationTarget(intent({ expectedClientHost: "" }), observation()).ok).toBe(false);
  });
  it.each([
    "http://127.0.0.1:4310/..",
    "http://127.0.0.1:4310/.",
    "http://127.0.0.1:4310/%2e%2e",
    "http://127.0.0.1:4310" + String.fromCharCode(92) + "..",
    "http://127.0.0.1:43" + String.fromCharCode(10) + "10",
    "http://127.0.0.1" + String.fromCharCode(9) + ":4310",
  ])("rejects raw URL syntax normalized away by URL: %s", (clientUrl) => {
    expect(validateVerificationTarget(intent(), observation({ clientUrl })).ok).toBe(false);
  });
  it("rejects verification state nested inside an explicitly forbidden operator root", () => {
    const stateRoot = "C:/ProgramData/RoleModel/operator/run115/state";
    const result = validateVerificationTarget(intent({ expectedStateRoot: stateRoot }), observation({ stateRoot }));
    expect(codes(result.findings)).toContain("forbidden_root");
  });
  it("allows a sibling of a forbidden operator root", () => {
    const stateRoot = "C:/ProgramData/RoleModel/operator2/run115/state";
    expect(validateVerificationTarget(intent({ expectedStateRoot: stateRoot }), observation({ stateRoot })).ok).toBe(true);
  });
  it("accepts an exact loopback packaged target", () => {
    expect(validateVerificationTarget(intent(), observation())).toEqual({
      ok: true,
      findings: [],
    });
  });

  it("canonicalizes Windows slash and case for roots", () => {
    const result = validateVerificationTarget(
      intent(),
      observation({
        stateRoot: "c:/rolemodel/run115/state/",
        configRoot: "C:/ROLEMODEL/RUN115/CONFIG/",
      }),
    );

    expect(result).toEqual({ ok: true, findings: [] });
  });

  it("keeps POSIX root comparison case-sensitive", () => {
    const result = validateVerificationTarget(
      intent({
        platform: "posix",
        expectedStateRoot: "/srv/RoleModel/run115/state",
        expectedConfigRoot: "/srv/RoleModel/run115/config",
        forbiddenRoots: ["/srv/operator"],
      }),
      observation({
        stateRoot: "/srv/rolemodel/run115/state",
        configRoot: "/srv/rolemodel/run115/config",
      }),
    );

    expect(result).toEqual({
      ok: false,
      findings: [
        { code: "state_root_mismatch", field: "observation.stateRoot" },
        { code: "config_root_mismatch", field: "observation.configRoot" },
      ],
    });
  });

  it("accepts source-qa provenance when packaged is not required", () => {
    const result = validateVerificationTarget(
      intent({ requirePackaged: false }),
      observation({ provenance: "source_qa", buildMode: "source_qa" }),
    );

    expect(result).toEqual({ ok: true, findings: [] });
  });

  it("rejects protected operator ports on the intent", () => {
    for (const port of [3456, 3457, 3458]) {
      const result = validateVerificationTarget(
        intent({ expectedClientPort: port }),
        observation({ clientUrl: `http://127.0.0.1:${port}` }),
      );

      expect(result.findings).toContainEqual({
        code: "protected_port",
        field: "intent.expectedClientPort",
      });
      expect(result.findings).toContainEqual({
        code: "protected_port",
        field: "observation.clientUrl",
      });
    }
  });

  it("rejects a protected operator port on a non-loopback observation", () => {
    const result = validateVerificationTarget(
      intent(),
      observation({ clientUrl: "http://192.168.1.5:3456" }),
    );

    expect(codes(result.findings)).toContain("protected_port");
    expect(codes(result.findings)).toContain("non_loopback_host");
  });

  it("rejects a non-loopback client host", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://example.com:4310" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "non_loopback_host", field: "observation.clientUrl" }],
    });
  });

  it("rejects a non-loopback expected client host", () => {
    expect(
      validateVerificationTarget(
        intent({ expectedClientHost: "example.com" }),
        observation(),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "non_loopback_host", field: "intent.expectedClientHost" }],
    });
  });

  it("rejects a loopback host that does not match the intent", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://127.0.0.2:4310" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "client_host_mismatch", field: "observation.clientUrl.host" }],
    });
  });

  it("rejects a port that does not match the intent", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://127.0.0.1:4311" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "client_port_mismatch", field: "observation.clientUrl.port" }],
    });
  });

  it("rejects userinfo in the client URL", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://user:secret@127.0.0.1:4310" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.clientUrl" }],
    });
  });

  it("rejects a path in the client URL", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://127.0.0.1:4310/admin" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.clientUrl" }],
    });
  });

  it("rejects a query in the client URL", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://127.0.0.1:4310?token=secret" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.clientUrl" }],
    });
  });

  it("rejects a fragment in the client URL", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://127.0.0.1:4310#fragment" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.clientUrl" }],
    });
  });

  it("rejects a malformed client URL", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "not-a-url" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.clientUrl" }],
    });
  });

  it("rejects a nonpositive expected port", () => {
    expect(
      validateVerificationTarget(
        intent({ expectedClientPort: 0 }),
        observation(),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "intent.expectedClientPort" }],
    });
  });

  it("rejects an out-of-range observed port", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ clientUrl: "http://127.0.0.1:70000" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.clientUrl" }],
    });
  });

  it("rejects an empty source tree identifier", () => {
    expect(
      validateVerificationTarget(
        intent({ expectedSourceTree: "" }),
        observation(),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "intent.expectedSourceTree" }],
    });
  });

  it("rejects a nonpositive expected PID", () => {
    expect(
      validateVerificationTarget(
        intent({ expectedPid: 0 }),
        observation(),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "intent.expectedPid" }],
    });
  });

  it("rejects a noninteger observed PID", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ pid: 1.5 }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.pid" }],
    });
  });

  it("rejects a nonhex expected artifact SHA", () => {
    expect(
      validateVerificationTarget(
        intent({ expectedArtifactSha256: "not-a-sha" }),
        observation(),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "intent.expectedArtifactSha256" }],
    });
  });

  it("rejects a nonhex observed artifact SHA", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ artifactSha256: "zz".repeat(32) }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "observation.artifactSha256" }],
    });
  });

  it("rejects a relative state root", () => {
    expect(
      validateVerificationTarget(
        intent({ expectedStateRoot: "state" }),
        observation(),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "invalid_value", field: "intent.expectedStateRoot" }],
    });
  });

  it("rejects a wrong PID", () => {
    expect(
      validateVerificationTarget(intent(), observation({ pid: 9999 })),
    ).toEqual({
      ok: false,
      findings: [{ code: "pid_mismatch", field: "observation.pid" }],
    });
  });

  it("rejects a wrong state root", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ stateRoot: "C:\\RoleModel\\run115\\other-state" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "state_root_mismatch", field: "observation.stateRoot" }],
    });
  });

  it("rejects a wrong config root", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ configRoot: "C:\\RoleModel\\run115\\other-config" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "config_root_mismatch", field: "observation.configRoot" }],
    });
  });

  it("rejects a wrong source tree", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ sourceTree: "source-tree-b" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "source_tree_mismatch", field: "observation.sourceTree" }],
    });
  });

  it("rejects a wrong private distribution", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ privateDistribution: "private-dist-b" }),
      ),
    ).toEqual({
      ok: false,
      findings: [
        {
          code: "private_distribution_mismatch",
          field: "observation.privateDistribution",
        },
      ],
    });
  });

  it("rejects a wrong UI tree", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ uiTree: "ui-tree-b" }),
      ),
    ).toEqual({
      ok: false,
      findings: [{ code: "ui_tree_mismatch", field: "observation.uiTree" }],
    });
  });

  it("rejects a wrong artifact SHA", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ artifactSha256: SHA_B }),
      ),
    ).toEqual({
      ok: false,
      findings: [
        { code: "artifact_sha_mismatch", field: "observation.artifactSha256" },
      ],
    });
  });

  it("rejects provisional, not-ready, and unavailable health", () => {
    for (const health of ["provisional", "not_ready", "unavailable"] as const) {
      expect(
        validateVerificationTarget(intent(), observation({ health })),
      ).toEqual({
        ok: false,
        findings: [{ code: "health_not_ready", field: "observation.health" }],
      });
    }
  });

  it("rejects source-qa provenance when packaged is required", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ provenance: "source_qa" }),
      ),
    ).toEqual({
      ok: false,
      findings: [
        { code: "packaged_artifact_required", field: "observation.provenance" },
      ],
    });
  });

  it("rejects source-qa build mode when packaged is required", () => {
    expect(
      validateVerificationTarget(
        intent(),
        observation({ buildMode: "source_qa" }),
      ),
    ).toEqual({
      ok: false,
      findings: [
        { code: "build_mode_not_packaged", field: "observation.buildMode" },
      ],
    });
  });

  it("rejects an intended state root listed in the explicit forbidden roots", () => {
    expect(
      validateVerificationTarget(
        intent({
          expectedStateRoot: "C:\\Users\\operator\\AppData\\Local\\role-model",
        }),
        observation({
          stateRoot: "C:\\Users\\operator\\AppData\\Local\\role-model",
        }),
      ),
    ).toEqual({
      ok: false,
      findings: [
        { code: "forbidden_root", field: "intent.expectedStateRoot" },
        { code: "forbidden_root", field: "observation.stateRoot" },
      ],
    });
  });

  it("rejects an intended config root listed in the explicit forbidden roots", () => {
    expect(
      validateVerificationTarget(
        intent({
          expectedConfigRoot: "C:\\ProgramData\\RoleModel\\operator",
        }),
        observation({
          configRoot: "C:\\ProgramData\\RoleModel\\operator",
        }),
      ),
    ).toEqual({
      ok: false,
      findings: [
        { code: "forbidden_root", field: "intent.expectedConfigRoot" },
        { code: "forbidden_root", field: "observation.configRoot" },
      ],
    });
  });

  it("does not echo a malicious client URL or its secrets", () => {
    const result = validateVerificationTarget(
      intent(),
      observation({ clientUrl: "http://user:secret@127.0.0.1:4310" }),
    );
    expect(result.findings).toContainEqual({ code: "invalid_value", field: "observation.clientUrl" });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("http");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("127.0.0.1");
  });
});

describe("evaluateVerificationOutcome", () => {
  const targetPass: readonly [] = [];
  const targetFailure = [
    { code: "pid_mismatch", field: "observation.pid" },
  ] as const;

  it("marks a pure guard pass as VERIFIED with an honest adapter limitation", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "executed", provider: "available" },
        "complete",
      ),
    ).toEqual({
      status: "VERIFIED",
      findings: [
        { code: "pure_guard_pass_not_environment_verification" },
        { code: "adapter_must_resolve_realpath_and_check_processes" },
      ],
    });
  });

  it("does not mark a NOT_RUN execution as VERIFIED", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "not_run", reason: "missing_prerequisite" },
        "complete",
      ),
    ).toEqual({
      status: "NOT_RUN",
      findings: [{ code: "execution_not_run" }],
    });
  });

  it("does not mark a missing provider as VERIFIED", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "not_run", reason: "missing_provider" },
        "complete",
      ),
    ).toEqual({
      status: "NOT_RUN",
      findings: [
        { code: "execution_not_run" },
        { code: "provider_missing" },
      ],
    });
  });

  it("does not mark an executed run with a missing provider as VERIFIED", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "executed", provider: "missing" },
        "complete",
      ),
    ).toEqual({
      status: "NOT_RUN",
      findings: [
        { code: "execution_not_run" },
        { code: "provider_missing" },
      ],
    });
  });

  it("does not mark missing correlated evidence as VERIFIED", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "executed", provider: "available" },
        "missing",
      ),
    ).toEqual({
      status: "NOT_RUN",
      findings: [{ code: "correlated_evidence_missing" }],
    });
  });

  it("marks invalid correlated evidence as FAILED", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "executed", provider: "available" },
        "invalid",
      ),
    ).toEqual({
      status: "FAILED",
      findings: [{ code: "correlated_evidence_invalid" }],
    });
  });

  it("marks target findings as FAILED", () => {
    expect(
      evaluateVerificationOutcome(
        targetFailure,
        { kind: "executed", provider: "available" },
        "complete",
      ),
    ).toEqual({
      status: "FAILED",
      findings: [{ code: "target_contract_failed" }],
    });
  });

  it("marks a failed execution as FAILED", () => {
    expect(
      evaluateVerificationOutcome(
        targetPass,
        { kind: "failed" },
        "complete",
      ),
    ).toEqual({
      status: "FAILED",
      findings: [{ code: "execution_failed" }],
    });
  });

  it("returns only bounded static codes and no environment values", () => {
    const state: VerificationExecutionState = {
      kind: "executed",
      provider: "available",
    };
    const outcome = evaluateVerificationOutcome(targetPass, state, "complete");
    expect(outcome.findings.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(outcome);

    expect(serialized).not.toContain("http");
    expect(serialized).not.toContain("C:");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("secret");
  });
});



