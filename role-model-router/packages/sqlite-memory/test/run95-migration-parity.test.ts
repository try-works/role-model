import { expect, test } from "vitest";

import * as sqliteMemory from "../src/index.js";

test("Run 95 occurrence migration state only permits cutover after parity and recovery proof", () => {
  expect(() =>
    sqliteMemory.validateOccurrenceMigrationTransition({
      from: "occurrence_shadow",
      to: "occurrence_primary",
      parityVerified: false,
      backupVerified: true,
      consumersVerified: true,
    }),
  ).toThrow(/parity/i);

  expect(() =>
    sqliteMemory.validateOccurrenceMigrationTransition({
      from: "occurrence_parity",
      to: "occurrence_primary",
      parityVerified: true,
      backupVerified: true,
      consumersVerified: true,
    }),
  ).not.toThrow();
});
