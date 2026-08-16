import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("extension/dist", { recursive: true });
await Promise.all([
  build({ entryPoints: ["extension/background/index.ts"], outfile: "extension/dist/background.js", bundle: true, format: "esm", target: "chrome116", sourcemap: true, tsconfig: "tsconfig.json" }),
  build({ entryPoints: ["extension/offscreen/index.ts"], outfile: "extension/dist/offscreen.js", bundle: true, format: "esm", target: "chrome116", sourcemap: true, tsconfig: "tsconfig.json" }),
  build({ entryPoints: ["extension/content/index.ts"], outfile: "extension/dist/content.js", bundle: true, format: "iife", target: "chrome116", sourcemap: true, tsconfig: "tsconfig.json" }),
  copyFile("extension/manifest.json", "extension/dist/manifest.json"),
  copyFile("extension/offscreen/offscreen.html", "extension/dist/offscreen.html"),
]);
