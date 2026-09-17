import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { inside, projectRoot } from "./generate-video-poster.mjs";

if (process.env.VERCEL) throw new Error("Media preview is local-only");
const preview = JSON.parse(await readFile(path.join(projectRoot, "media-output/poster-preview.json"), "utf8"));
const allowed = new Map(Object.values(preview).map((entry) => [entry.poster.replace("/local-media-preview", ""), entry.localPath]));
const root = await realpath(path.join(projectRoot, "media-output/r2/images/video-posters"));
const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") throw new Error("method");
    const local = allowed.get(req.url);
    if (!local) throw new Error("not found");
    const file = await realpath(path.resolve(projectRoot, local));
    if (!inside(root, file) || !file.endsWith(".webp")) throw new Error("not a poster");
    const buffer = await readFile(file);
    res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": buffer.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : buffer);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const portIndex = process.argv.indexOf("--port");
const port = portIndex === -1 ? "3005" : process.argv[portIndex + 1];
if (!/^\d+$/.test(port ?? "")) throw new Error("Invalid --port");
console.log(`Local poster preview: http://localhost:${port}. R2 playback URLs unchanged. Stop with Ctrl+C. Restart after preparing new posters.`);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", port], {
  cwd: projectRoot, windowsHide: true, stdio: "inherit",
  env: { ...process.env, MEDIA_PREVIEW_PORT: String(server.address().port) },
});
const stop = () => { child.kill(); server.close(); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
child.on("exit", (code) => { server.close(); process.exitCode = code ?? 0; });
