import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  platform: "neutral",
  deps: {
    neverBundle: ["svg-pathdata"],
  },
});
