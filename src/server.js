const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");
const { inspectSources } = require("./inspect");

const PORT = process.env.PORT === undefined ? 7681 : Number(process.env.PORT);
const ROOT_DIR = path.join(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dashboard", "dist");
const ASSETS_DIR = path.join(ROOT_DIR, "assests");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function parseQuery(url) {
  const q = new URL(url, "http://localhost").searchParams;
  return {
    from: q.get("from") || undefined,
    to: q.get("to") || undefined,
    sources: q.get("sources") || undefined,
  };
}

async function handleApi(req, res) {
  const query = parseQuery(req.url);
  const report = await inspectSources(query);
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(report));
}

function sendFile(filePath, res, { spaFallback = false } = {}) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT" && spaFallback) {
        fs.readFile(path.join(DIST_DIR, "index.html"), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not Found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(data2);
        });
        return;
      }
      if (err.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
      res.writeHead(500);
      res.end("Internal Server Error");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function serveUnderRoot(req, res, rootDir, urlPrefix) {
  const rawPath = decodeURIComponent(req.url.split("?")[0]);
  const relative = rawPath.slice(urlPrefix.length) || "index.html";
  const filePath = path.normalize(path.join(rootDir, relative));
  if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  sendFile(filePath, res);
}

function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  filePath = path.join(DIST_DIR, filePath);

  if (!filePath.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  sendFile(filePath, res, { spaFallback: true });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith("/api/inspect")) {
      return handleApi(req, res);
    }
    if (req.url.startsWith("/assests/") || req.url === "/assests") {
      return serveUnderRoot(req, res, ASSETS_DIR, "/assests");
    }
    serveStatic(req, res);
  });
}

function openBrowser(url) {
  if (process.env.VIBE_WRAPPER_NO_OPEN === "1") return;
  const cmd = process.platform === "darwin" ? `open "${url}"`
    : process.platform === "win32" ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function start() {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : PORT;
      const url = `http://localhost:${port}`;
      process.stderr.write(`vibe-wrapper roast result → ${url}\n`);
      process.stderr.write(`dashboard               → ${url} (nav → Dashboard)\n`);
      process.stderr.write(`static live report      → ${url}/assests/live-report.html\n`);
      process.stderr.write(`visual demo             → ${url}/assests/result.html\n`);
      openBrowser(url);
      resolve(server);
    });
  });
}

module.exports = { createServer, start };
