import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("IndexRoute", () => {
  test("redirects immediately to /app without rendering a boot fallback", () => {
    const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");

    expect(source).toContain('import { Navigate } from "react-router"');
    expect(source).toContain('return <Navigate to="/app" replace />');
    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("HydrateFallback");
  });
});
