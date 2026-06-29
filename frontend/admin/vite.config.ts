import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    proxy: {
      "/api/v1": {
        // target: "http://127.0.0.1:8000",
        target: "http://124.221.252.106:8000",
        changeOrigin: true,
      },
    },
  },
});
