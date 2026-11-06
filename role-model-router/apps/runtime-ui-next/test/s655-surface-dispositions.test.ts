import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SURFACE_DISPOSITIONS } from "../src/route-family-map";

const nextRoot = path.resolve(import.meta.dirname, "..");

describe("R13 missing surfaces and preview disposition", () => {
  it("records explicit dispositions for palette/media/device-auth and de-preview", () => {
    expect(SURFACE_DISPOSITIONS.commandPalette.status).toBe("owner-disposition");
    expect(SURFACE_DISPOSITIONS.mediaCapture.status).toBe("owner-disposition");
    expect(SURFACE_DISPOSITIONS.deviceAuthUi.status).toBe("ported");
    expect(SURFACE_DISPOSITIONS.previewEditors.status).toBe("de-previewed");
  });

  it("renders no preview-only disclosure or disabled preview field", () => {
    const source = readFileSync(path.join(nextRoot, "src/router-family-view.ts"), "utf8");
    expect(source).not.toContain("Preview only");
    expect(source).not.toContain("preview-only");
    expect(source).not.toContain("DataAttribute(\"preview-only\"");
    expect(source).not.toMatch(/const textField =/);
    expect(source).not.toMatch(/const selectField =/);
  });

  it("wires the device-auth surface through the providers view", () => {
    const view = readFileSync(path.join(nextRoot, "src/view.ts"), "utf8");
    expect(view).toContain("deviceAuth");
    expect(view).toContain("providersPage");
  });
});
