import path from "node:path";
import { defineConfig } from "vitest/config";

// Phase 17 (Testing). Mirrors tsconfig.json's `@/*` -> `./src/*` path alias
// so test files can import production code exactly as the app itself does,
// with no separate import convention for tests. No React/DOM plugin is
// configured - this phase tests pure functions and Service-layer business
// logic (Node environment), not component rendering (see CHANGELOG/
// deliverable report for why).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Every mocked-Service test file otherwise repeats its own
    // `beforeEach(() => vi.clearAllMocks())` - one config flag instead of
    // five identical blocks (Phase 17 self-review: "avoid duplicated test
    // setup").
    clearMocks: true,
  },
});
