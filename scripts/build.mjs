import { cp, mkdir, rm } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
await rm(dist, { recursive:true, force:true });
await mkdir(new URL("client/", dist), { recursive:true });
await mkdir(new URL("server/", dist), { recursive:true });
await cp(new URL("../public/", import.meta.url), new URL("client/", dist), { recursive:true });
await cp(new URL("../worker/", import.meta.url), new URL("server/", dist), { recursive:true });
console.log("Build complete.");
