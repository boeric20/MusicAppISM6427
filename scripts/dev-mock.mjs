/**
 * Local dev server that serves /public and routes /api/* to the Netlify
 * functions, with Suno replaced by an in-memory fake. No credits are spent.
 *
 *   node scripts/dev-mock.mjs            # http://localhost:8888
 *   PORT=3000 node scripts/dev-mock.mjs
 *
 * For the real API, use `netlify dev` with SUNO_API_KEY in .env instead.
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createFakeSuno } from "../test/fake-suno.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const PORT = Number(process.env.PORT || 8888);
const STEP_MS = Number(process.env.FAKE_STEP_MS || 4000);

const fake = createFakeSuno({ credits: 480, stepMs: STEP_MS });
globalThis.fetch = fake.fetch;
process.env.SUNO_API_KEY = "test-key";

const routes = [];
for (const name of ["generate", "extend", "status", "lyrics", "lyrics-status", "credits", "callback", "access"]) {
  const mod = await import(`../netlify/functions/${name}.mjs`);
  routes.push({ path: mod.config.path, handler: mod.default });
}

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = routes.find((r) => r.path === url.pathname);
  if (route) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
    const response = await route.handler(request, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  let file = normalize(join(root, "public", url.pathname === "/" ? "index.html" : url.pathname));
  if (!file.startsWith(join(root, "public"))) { res.writeHead(403); return res.end(); }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    const html = await readFile(join(root, "public", "index.html"));
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(html);
  }
}).listen(PORT, () => console.log(`Mock dev server on http://localhost:${PORT} (fake Suno, ${STEP_MS}ms per stage)`));
