import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(
        new URL("./src/ha-litter-robot-card.ts", import.meta.url),
      ),
      formats: ["es"],
      fileName: () => "ha-litter-robot-card.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});