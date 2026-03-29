import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
    },
    typecheck: {
      enabled: true,
      include: ["test/type/**/*.test.type.ts"],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
