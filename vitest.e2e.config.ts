import { defineConfig } from "vitest/config";
import { configDotenv } from "dotenv";
import { expand } from "dotenv-expand";

expand(configDotenv());

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
