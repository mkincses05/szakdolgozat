/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    fs: {
      // `@wildhand/shared` is linked from `../shared` and served from outside this folder.
      allow: [searchForWorkspaceRoot(process.cwd()), "../shared"]
    }
  },
  test: {
    environment: "jsdom",
    // The cached `i18n/index.ts` keeps an outdated `import.meta.glob` result when a page adds
    // translation files, so new namespaces would be missing from the tests.
    fsModuleCache: false,
    globals: true,
    setupFiles: ["./src/test/setup.ts"]
  }
});
