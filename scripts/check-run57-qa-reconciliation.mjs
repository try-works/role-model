import { readFile } from "node:fs/promises";

const file =
  ".recursive/run/57-role-model-taxonomy-v1-phase-1-4/addenda/05-manual-qa.current-state-reconciliation.addendum-02.md";
const contents = await readFile(file, "utf8");

const required = [
  "authoritative current-state Phase 5 QA index",
  "05-manual-qa-addendum-01-healthy-backends.md` supersedes",
  "E2E-P1-001",
  "E2E-P4-005",
  "Proposal Phase 5 benchmark implementation and proposal Phase 6 taxonomy telemetry implementation remain",
  "Audit: PASS",
  "Coverage: PASS",
  "Approval: PASS",
];

const missing = required.filter((token) => !contents.includes(token));
if (missing.length > 0) {
  console.error(`Run 57 QA reconciliation is missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Run 57 QA reconciliation check passed");
