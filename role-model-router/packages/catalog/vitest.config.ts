import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Catalog export tests process the full repository snapshot and can share
    // CPU with the other workspace packages during the root test command.
    testTimeout: 60_000,
  },
});
