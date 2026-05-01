import { defineConfig } from "vitest/config";
import { configDotenv } from "dotenv";
import { expand } from "dotenv-expand";

expand(configDotenv());

export default defineConfig({
  test: {
    globals: true,
    root: "./",
  },
  resolve: {
    tsconfigPaths: true,
  },
});
