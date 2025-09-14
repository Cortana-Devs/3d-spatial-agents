import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@components": resolve(__dirname, "components"),
      "@systems": resolve(__dirname, "systems"),
      "@floor-ai": resolve(__dirname, "src/components/floors/ai"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
    css: true,
    clearMocks: true,
    coverage: {
      enabled: false,
      reporter: ["text", "html"],
    },
  },
});
