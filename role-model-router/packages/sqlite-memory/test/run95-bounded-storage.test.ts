import { describe, expect, test } from "vitest";

import * as sqliteMemory from "../src/index.js";

describe("Run 95 bounded storage inventory", () => {
  test("accepts a deduplicated physical inventory and rejects a logical double charge", () => {
    const inventory = {
      accountingState: "physical_resources_deduplicated",
      uniquePhysicalBytes: 4096,
      physicalResources: [
        {
          id: "physical-history",
          physicalBytes: 4096,
          health: "ready",
          logicalClassIds: ["history", "history-index"],
        },
        {
          id: "physical-cloud",
          physicalBytes: null,
          health: "unavailable",
          logicalClassIds: ["cloud-history"],
        },
      ],
      logicalClasses: [
        { id: "history", physicalResourceId: "physical-history", physicalBytes: null },
        { id: "history-index", physicalResourceId: "physical-history", physicalBytes: null },
        { id: "cloud-history", physicalResourceId: "physical-cloud", physicalBytes: null },
      ],
    };
    expect(() => sqliteMemory.validateBoundedStorageInventory(inventory)).not.toThrow();
    expect(() =>
      sqliteMemory.validateBoundedStorageInventory({
        ...inventory,
        logicalClasses: [{ ...inventory.logicalClasses[0], physicalBytes: 4096 }],
      }),
    ).toThrow(/logical|double|physical/i);
    expect(() =>
      sqliteMemory.validateBoundedStorageInventory({
        ...inventory,
        physicalResources: [
          { ...inventory.physicalResources[0], physicalBytes: null },
          ...inventory.physicalResources.slice(1),
        ],
      }),
    ).toThrow(/measured physical resource bytes/i);
  });
});
