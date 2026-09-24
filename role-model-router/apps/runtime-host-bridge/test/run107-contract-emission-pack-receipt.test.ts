import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateV11ContractDefinition } from "@role-model/protocol-types";
import { expect, test } from "vitest";

import {
  buildExperiencePackCandidate,
  buildRouteLearningValidationReceipt,
  emitTrackBContract,
} from "../src/track-b-contract-emission.js";

/**
 * Run 107 P13: the learned pack and the validation receipt have to exist in the documented v1.1 vocabulary,
 * not only in the runtime's own record shape.
 *
 * Measured on the live store: 25 of 98 pack records failed `packCandidate` (the closed `$defs.scope` has no
 * `taxonomyVersion` member) and 100 of 149 validation receipts failed `validationReceipt` (the closed contract
 * has no `familyEvidence` member), and `contracts\` held **zero** `ExperiencePackCandidateV1` /
 * `RouteLearningValidationReceiptV1` artifacts - `emitTrackBContract` asserts before it writes, so nothing
 * could be emitted from those records. The fixtures below are live-shaped rows.
 */

const liveShapedPack = {
  packId: "pack-18f93505252e5213848700b148004f1d5a8d2ad3c41f90757ac50f6562ea8e95",
  version: 1,
  // A pack whose scope carries the runtime's own taxonomy member - the shape that fails today.
  scope: {
    endpointId: "moonshot.personal.kimi-code.global.kimi-k3",
    taskTypeId: "coder.review",
    taxonomyVersion: "1.0.0-alpha.1",
  },
  experienceIds: [
    "shadow-0ca38219cfc91190a9c8c94f8aca4697b0a5f4799784ba57e676dbc2cbd3931b",
  ],
  maxTokens: 512,
  placement: "context_block",
  priority: "advisory_only",
  status: "validated",
  createdAt: "2026-09-24T03:23:23.256Z",
  runtimeChannel: "stage",
  scopeId: "standalone-runtime-stage",
  boundaryProtocolVersion: "1.1",
};

const liveShapedReceipt = {
  receiptId: "validation-89b28afcf930026942e63a1d7a577430280c8ee4ff60ae62c395c4fae4fb49db",
  candidateType: "experience",
  candidateId: "shadow-0ca38219cfc91190a9c8c94f8aca4697b0a5f4799784ba57e676dbc2cbd3931b",
  baselineId: "sha256:d3a63510f02e4a5a8b6a3d1e7a2f0c8f7e6d5c4b3a29180f7e6d5c4b3a291807",
  splitHash: "d69747b2114cd597c40ff50f043183ba7fa37d3be47fb53786b136e433926e88",
  caseManifestRef: "manifest:learning-pass:34:1701",
  estimatorVersion: "paired-cluster-bootstrap@1",
  bootstrapSeed: 0,
  qualityDelta: 0.5,
  confidenceLower: 0.5,
  confidenceUpper: 0.5,
  holdoutSampleCount: 2,
  guardrailsPassed: true,
  decision: "validate",
  createdAt: "2026-09-24T03:23:23.179Z",
  runtimeChannel: "stage",
  scopeId: "standalone-runtime-stage",
  boundaryProtocolVersion: "1.1",
  // The additive member the closed contract has no room for.
  familyEvidence: { taskTypeId: "coder.review", decisiveComparisons: 3, excludedByReason: {} },
};

test("run107 P13 the live record shapes are what the closed contracts refuse", () => {
  const pack = validateV11ContractDefinition("routeLearning", "packCandidate", liveShapedPack);
  expect(pack.valid).toBe(false);
  expect(pack.errors.join(" ")).toMatch(/scope/i);
  const receipt = validateV11ContractDefinition(
    "routeLearning",
    "validationReceipt",
    liveShapedReceipt,
  );
  expect(receipt.valid).toBe(false);
  expect(receipt.errors.join(" ")).toMatch(/familyEvidence|additional/i);
});

test("run107 P13 the built pack candidate passes the repo's own validator and keeps the documented identity", () => {
  const built = buildExperiencePackCandidate({
    pack: liveShapedPack,
    channel: "stage",
    scopeId: "standalone-runtime-stage",
  });
  expect(validateV11ContractDefinition("routeLearning", "packCandidate", built)).toMatchObject({
    valid: true,
  });
  // The documented identity survives; only the runtime's own extra is dropped.
  expect(built.scope).toEqual({
    endpointId: "moonshot.personal.kimi-code.global.kimi-k3",
    taskTypeId: "coder.review",
  });
  expect(built.contract).toBe("ExperiencePackCandidateV1");
  expect(built.packId).toBe(liveShapedPack.packId);
});

test("run107 P13 the built validation receipt passes the repo's own validator", () => {
  const built = buildRouteLearningValidationReceipt({
    receipt: liveShapedReceipt,
    channel: "stage",
    scopeId: "standalone-runtime-stage",
  });
  expect(
    validateV11ContractDefinition("routeLearning", "validationReceipt", built),
  ).toMatchObject({ valid: true });
  expect(built.contract).toBe("RouteLearningValidationReceiptV1");
  expect(built.decision).toBe("validate");
  expect("familyEvidence" in built).toBe(false);
});

test("run107 P13 both artifacts emit through emitTrackBContract, which asserts before it writes", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run107-contract-emission-"));
  try {
    const packEmission = emitTrackBContract({
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
      contract: buildExperiencePackCandidate({
        pack: liveShapedPack,
        channel: "stage",
        scopeId: "standalone-runtime-stage",
      }),
    });
    const receiptEmission = emitTrackBContract({
      stateRoot: root,
      scopeId: "standalone-runtime-stage",
      contract: buildRouteLearningValidationReceipt({
        receipt: liveShapedReceipt,
        channel: "stage",
        scopeId: "standalone-runtime-stage",
      }),
    });
    expect(packEmission.contract).toBe("ExperiencePackCandidateV1");
    expect(receiptEmission.contract).toBe("RouteLearningValidationReceiptV1");
    // The written artifact is the validated contract, byte for byte.
    const written = JSON.parse(readFileSync(packEmission.filePath, "utf8")) as Record<string, unknown>;
    expect(written.packId).toBe(liveShapedPack.packId);
    expect(written.scope).toEqual({
      endpointId: "moonshot.personal.kimi-code.global.kimi-k3",
      taskTypeId: "coder.review",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
