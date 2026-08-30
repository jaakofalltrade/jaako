import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The test runner.
 *
 * Vitest rather than Jest or node:test, and the argument is the one docs/lab.md
 * makes about dependencies: the five it counts are RUNTIME dependencies, and this
 * is a dev dependency, so the discipline it protects is untouched. What that buys
 * is TypeScript and the `@/` alias working from this file alone, with no transform
 * config and no separate TypeScript runner.
 *
 * Only pure functions are tested. There is no jsdom here, no component rendering
 * and no mocked Spotify: the interesting failures in this codebase are in its own
 * arithmetic and its own guards, and a mocked third party mostly tests the mock.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),

      /* `server-only` is a real runtime guard and it works by throwing on import
         outside a server component, which includes here. Aliasing it to an empty
         module is what makes src/server/spotify/mappers.ts testable at all, and it
         costs nothing: the guard exists to fail a BUILD that imports a server
         module from a client one, and this file is not that build. */
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    /* No globals. `describe` and `it` are imported explicitly in every test file,
       so tsconfig needs no extra `types` entry and `next build` type-checks these
       files with everything else rather than around them. */
    globals: false,
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
