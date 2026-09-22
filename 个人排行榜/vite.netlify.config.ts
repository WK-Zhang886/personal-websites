import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "netlify-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "netlify-index.html",
    },
  },
});
