const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { inspectSources } = require("./inspect");

const PORT = Number(process.env.PORT) || 7681;
const DIST_DIR = path.join(__dirname, "..", "dashboard", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
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

function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  filePath = path.join(DIST_DIR, filePath);

  if (!filePath.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // SPA fallback: serve index.html for unknown routes
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
      res.writeHead(500);
      res.end("Internal Server Error");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith("/api/inspect")) {
      return handleApi(req, res);
    }
    serveStatic(req, res);
  });
}

function start() {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      process.stderr.write(`vibe-wrapper dashboard → http://localhost:${PORT}\n`);
      resolve(server);
    });
  });
}

module.exports = { createServer, start };
