import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: {
    "@backend": fileURLToPath(new URL("./backend/src", import.meta.url)),
    "@frontend": fileURLToPath(new URL("./frontend", import.meta.url)),
    "server-only": fileURLToPath(new URL("./backend/tests/integration/server-only-stub.ts", import.meta.url)),
  } },
  test: { environment: "node", include: ["backend/tests/integration/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
