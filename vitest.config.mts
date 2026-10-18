import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/data\//, replacement: at("./backend/data/") },
      { find: /^@\/lib\//, replacement: at("./backend/lib/") },
      { find: /^@\//, replacement: at("./src/") },
    ],
  },
  test: { include: ["src/**/*.test.ts"] },
});
