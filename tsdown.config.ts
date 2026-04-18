import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  fixedExtension: false,
  attw: {
    profile: "esm-only",
  },
  deps: {
    onlyBundle: "ts-pattern",
  },
});
