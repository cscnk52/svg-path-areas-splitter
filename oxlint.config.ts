import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "import", "node", "promise", "vitest"],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});
