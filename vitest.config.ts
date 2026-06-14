import { defineConfig } from "vitest/config";
import { configDotenv } from "dotenv";
import { expand } from "dotenv-expand";

expand(configDotenv({ override: false, path: [".env.test"] }));

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    strictTags: false,
  },
  resolve: {
    tsconfigPaths: true,
  },
});
