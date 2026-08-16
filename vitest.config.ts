import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { reporter: ["text", "json-summary"] },
  },
  resolve: {
    alias: {
      "@shared": new URL("./shared", import.meta.url).pathname,
      "@server": new URL("./server", import.meta.url).pathname,
    },
  },
});
