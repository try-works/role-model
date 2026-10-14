import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
test("pending dispatch scheduler requests root metadata, not full transcript hydration", () => {
 const source=readFileSync(new URL("../src/cli.ts",import.meta.url),"utf8");
 const start=source.indexOf("readPendingRouteDispatches: async (request)");
 const end=source.indexOf("readRouteReplayableCaptures: async",start);
 expect(source.slice(start,end)).toContain("operations.readLocalRouteCapture({ requestId, metadataOnly: true })");
});
