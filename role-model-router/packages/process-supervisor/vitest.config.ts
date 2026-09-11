import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Windows process-tree teardown can exceed Vitest's five-second default
    // while the supervisor waits for child handles to close.
    testTimeout: 60_000,
  },
});
