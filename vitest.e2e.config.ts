import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.e2e-spec.ts"],
    globals: true,
    root: "./",
    // setupFiles: ["./test/test-e2e.ts"],
    testTimeout: 40000,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
