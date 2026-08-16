import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)), "@client": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "../dist/client", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
});
