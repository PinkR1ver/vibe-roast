const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash, randomBytes, randomUUID } = require("node:crypto");
const { exec } = require("node:child_process");
const { createTerminalLaunch } = require("./lib/terminal-ui");
const { inspectSources } = require("./inspect");
const { generateAiRoast, PROVIDERS } = require("./lib/ai-roast");
const { encodeRoastSnapshot } = require("./lib/roast-snapshot");

const PORT = process.env.PORT === undefined ? 7681 : Number(process.env.PORT);
const ROOT_DIR = path.join(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dashboard", "dist");
const ASSETS_DIR = path.join(ROOT_DIR, "assests");
const DEFAULT_GITHUB_CLIENT_ID = "Iv23li5jqHs7pMarqWPZ";
const DEFAULT_GITHUB_AUTH_BROKER_URL = "https://auth.pinktalk.online";
const GITHUB_OAUTH_FLOWS = new Map();
const GITHUB_SESSION_COOKIE = "vibe_roast_github_session";
const GITHUB_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_JSON_BODY = 64 * 1024;
const FREE_AI_PROVIDER = "cloudflare";
const FREE_AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

function githubClientId() {
  return process.env.VIBE_ROAST_GITHUB_CLIENT_ID || DEFAULT_GITHUB_CLIENT_ID;
}

function githubAuthConfig() {
  const explicitBrokerUrl = String(process.env.VIBE_ROAST_AUTH_BROKER_URL || "").replace(/\/+$/, "");
  if (explicitBrokerUrl) {
    return { configured: true, mode: "broker", brokerUrl: explicitBrokerUrl };
  }
  if (process.env.VIBE_ROAST_GITHUB_CLIENT_SECRET) {
    return {
      configured: true,
      mode: "direct",
      clientId: githubClientId(),
      clientSecret: process.env.VIBE_ROAST_GITHUB_CLIENT_SECRET,
    };
  }
  return {
    configured: true,
    mode: "broker",
    brokerUrl: DEFAULT_GITHUB_AUTH_BROKER_URL,
  };
}

function githubSessionFile() {
  return process.env.VIBE_ROAST_GITHUB_SESSION_FILE
    || path.join(os.homedir(), ".vibe-roast", "github-auth.json");
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function requestOrigin(req) {
  const host = String(req.headers.host || "");
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) {
    throw new Error("GitHub OAuth is only available from the local Vibe Roaster server");
  }
  return `http://${host}`;
}

function githubCallbackUrl(req) {
  return process.env.VIBE_ROAST_GITHUB_CALLBACK_URL
    || `${requestOrigin(req)}/api/auth/github/callback`;
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf("=");
        return separator === -1
          ? [decodeURIComponent(item), ""]
          : [decodeURIComponent(item.slice(0, separator)), decodeURIComponent(item.slice(separator + 1))];
      }),
  );
}

async function readGithubSession(req) {
  const sessionId = parseCookies(req)[GITHUB_SESSION_COOKIE];
  if (!sessionId) return null;
  try {
    const session = JSON.parse(await fsp.readFile(githubSessionFile(), "utf8"));
    if (session?.sessionId !== sessionId || Number(session?.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

async function writeGithubSession(session) {
  const file = githubSessionFile();
  await fsp.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tempFile = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fsp.writeFile(tempFile, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
  await fsp.rename(tempFile, file);
  await fsp.chmod(file, 0o600);
}

async function clearGithubSession(req) {
  const sessionId = parseCookies(req)[GITHUB_SESSION_COOKIE];
  if (!sessionId) return;
  try {
    const session = JSON.parse(await fsp.readFile(githubSessionFile(), "utf8"));
    if (session?.sessionId === sessionId) await fsp.unlink(githubSessionFile());
  } catch {
    // An absent or malformed local session is already logged out.
  }
}

function sessionCookie(sessionId, maxAge = Math.floor(GITHUB_SESSION_TTL_MS / 1000)) {
  return `${GITHUB_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_JSON_BODY) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function handleInspect(req, res) {
  const query = parseQuery(req.url);
  const report = await inspectSources(query);
  report.vibe_profile.roast_source = "deterministic";
  sendJson(res, 200, report);
}

async function handleRoast(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const body = await readJson(req);
  const provider = String(body.provider || "");
  const hosted = body.mode === "hosted" || provider === FREE_AI_PROVIDER;
  if (hosted) {
    const session = await readGithubSession(req);
    const config = githubAuthConfig();
    if (!session?.brokerSessionToken || session.mode !== "broker" || config.mode !== "broker") {
      sendJson(res, 401, { error: "Sign in with GitHub to use the free AI roast" });
      return;
    }
    const evidence = body?.evidence;
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      sendJson(res, 400, { error: "Roast evidence is required" });
      return;
    }
    try {
      const generated = await generateAiRoast(evidence, {
        provider: FREE_AI_PROVIDER,
        apiKey: session.brokerSessionToken,
        baseUrl: `${config.brokerUrl}/v1`,
        model: FREE_AI_MODEL,
        requestHeaders: {
          "X-Vibe-Roast-Snapshot": encodeRoastSnapshot(evidence),
        },
      });
      sendJson(res, 200, { generated });
    } catch (error) {
      const status = Number(error?.status);
      sendJson(res, status === 401 || status === 429 ? status : 502, {
        error: error?.message || String(error),
        fallback_available: true,
      });
    }
    return;
  }
  if (!PROVIDERS[provider]) {
    sendJson(res, 400, { error: "Unsupported AI provider" });
    return;
  }

  const apiKey = String(body.apiKey || "");
  if (!apiKey) {
    sendJson(res, 400, { error: "API key is required" });
    return;
  }

  const evidence = body?.evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    sendJson(res, 400, { error: "Roast evidence is required" });
    return;
  }
  try {
    const generated = await generateAiRoast(evidence, {
      provider,
      apiKey,
      baseUrl: body.baseUrl || undefined,
      model: body.model || undefined,
    });
    sendJson(res, 200, { generated });
  } catch (error) {
    sendJson(res, 502, {
      error: error?.message || String(error),
      fallback_available: true,
    });
  }
}

async function handleProviderCatalog(_req, res) {
  const githubAuth = githubAuthConfig();
  sendJson(res, 200, {
    providers: Object.values(PROVIDERS)
      .filter(({ id }) => id !== FREE_AI_PROVIDER)
      .map(({ id, protocol, baseUrl, model }) => ({
      id,
      protocol,
      baseUrl,
      model,
      })),
    hosted: {
      configured: githubAuth.configured && githubAuth.mode === "broker",
      provider: FREE_AI_PROVIDER,
      model: FREE_AI_MODEL,
      auth: "github",
    },
    github: {
      configured: githubAuth.configured,
      mode: githubAuth.mode,
      inferenceAvailable: false,
      retirementDate: "2026-07-30",
    },
  });
}

async function githubUser(accessToken) {
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2026-03-10",
    },
  });
  const userPayload = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !userPayload.login) {
    throw new Error(userPayload.message || "GitHub returned no user identity");
  }
  return {
    login: userPayload.login,
    avatarUrl: userPayload.avatar_url,
    profileUrl: userPayload.html_url,
  };
}

function sendRedirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
  });
  res.end();
}

function authCallbackPage(res, { ok, message, cookie }) {
  const payload = JSON.stringify({
    type: "vibe-roast:github-auth",
    status: ok ? "connected" : "failed",
    error: ok ? undefined : message,
  }).replace(/</g, "\\u003c");
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
  };
  if (cookie) headers["Set-Cookie"] = cookie;
  res.writeHead(ok ? 200 : 400, headers);
  res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Vibe Roaster · GitHub</title></head>
<body style="font:16px system-ui;padding:40px;text-align:center;background:#f8f5ef;color:#171717">
<p>${ok ? "GitHub connected. You can close this window." : "GitHub sign-in failed."}</p>
<script>
  const payload = ${payload};
  if (window.opener) window.opener.postMessage(payload, window.location.origin);
  if (payload.status === "connected") window.setTimeout(() => window.close(), 350);
</script>
</body></html>`);
}

async function handleGithubOAuthStart(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const config = githubAuthConfig();
  if (!config.configured) {
    sendJson(res, 503, {
      error: "GitHub OAuth is not configured. Set VIBE_ROAST_AUTH_BROKER_URL, or use a local VIBE_ROAST_GITHUB_CLIENT_SECRET for development.",
      code: "github_not_configured",
    });
    return;
  }

  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const callbackUrl = githubCallbackUrl(req);
  GITHUB_OAUTH_FLOWS.set(state, {
    mode: config.mode,
    verifier,
    callbackUrl,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  if (config.mode === "broker") {
    const url = new URL(`${config.brokerUrl}/oauth/github/start`);
    url.searchParams.set("callback", callbackUrl);
    url.searchParams.set("state", state);
    sendRedirect(res, url.toString());
    return;
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  sendRedirect(res, url.toString());
}

async function exchangeDirectGithubCode(config, flow, code) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: flow.callbackUrl,
      code_verifier: flow.verifier,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "GitHub token exchange failed");
  }
  return {
    user: await githubUser(payload.access_token),
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || null,
    tokenExpiresAt: payload.expires_in ? Date.now() + Number(payload.expires_in) * 1000 : null,
  };
}

async function exchangeBrokerTicket(config, flow, ticket, state) {
  const response = await fetch(`${config.brokerUrl}/oauth/github/exchange`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ticket, state, callback: flow.callbackUrl }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.sessionToken || !payload.user?.login) {
    throw new Error(payload.error || "GitHub auth broker exchange failed");
  }
  return {
    user: payload.user,
    brokerSessionToken: payload.sessionToken,
    tokenExpiresAt: payload.expiresAt ? Date.parse(payload.expiresAt) : null,
  };
}

async function refreshDirectGithubSession(session) {
  if (
    session.mode !== "direct"
    || !session.refreshToken
    || !session.tokenExpiresAt
    || Number(session.tokenExpiresAt) > Date.now() + 60_000
  ) {
    return session;
  }
  const config = githubAuthConfig();
  if (!config.configured || config.mode !== "direct") return null;
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) return null;
  const refreshed = {
    ...session,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || session.refreshToken,
    tokenExpiresAt: payload.expires_in ? Date.now() + Number(payload.expires_in) * 1000 : null,
  };
  await writeGithubSession(refreshed);
  return refreshed;
}

async function handleGithubOAuthCallback(req, res) {
  const url = new URL(req.url, requestOrigin(req));
  const state = String(url.searchParams.get("state") || "");
  const flow = GITHUB_OAUTH_FLOWS.get(state);
  GITHUB_OAUTH_FLOWS.delete(state);
  if (!flow || flow.expiresAt <= Date.now()) {
    authCallbackPage(res, { ok: false, message: "GitHub sign-in expired. Start again from Vibe Roaster." });
    return;
  }
  if (url.searchParams.get("error")) {
    authCallbackPage(res, {
      ok: false,
      message: url.searchParams.get("error_description") || url.searchParams.get("error"),
    });
    return;
  }

  try {
    const config = githubAuthConfig();
    if (!config.configured || config.mode !== flow.mode) throw new Error("GitHub OAuth configuration changed during sign-in");
    const identity = config.mode === "broker"
      ? await exchangeBrokerTicket(config, flow, String(url.searchParams.get("ticket") || ""), state)
      : await exchangeDirectGithubCode(config, flow, String(url.searchParams.get("code") || ""));
    const sessionId = base64Url(randomBytes(32));
    const expiresAt = config.mode === "broker" && identity.tokenExpiresAt
      ? Math.min(identity.tokenExpiresAt, Date.now() + GITHUB_SESSION_TTL_MS)
      : Date.now() + GITHUB_SESSION_TTL_MS;
    await writeGithubSession({
      sessionId,
      mode: config.mode,
      user: identity.user,
      accessToken: identity.accessToken || undefined,
      refreshToken: identity.refreshToken || undefined,
      brokerSessionToken: identity.brokerSessionToken || undefined,
      tokenExpiresAt: identity.tokenExpiresAt,
      expiresAt,
      createdAt: Date.now(),
    });
    authCallbackPage(res, {
      ok: true,
      cookie: sessionCookie(sessionId, Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))),
    });
  } catch (error) {
    authCallbackPage(res, { ok: false, message: error?.message || String(error) });
  }
}

async function handleGithubSession(req, res) {
  if (req.method === "DELETE") {
    await clearGithubSession(req);
    res.setHeader("Set-Cookie", sessionCookie("", 0));
    sendJson(res, 200, { status: "signed_out" });
    return;
  }
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  let session = await readGithubSession(req);
  session = session ? await refreshDirectGithubSession(session) : null;
  if (!session) {
    sendJson(res, 200, { status: "anonymous", user: null });
    return;
  }
  sendJson(res, 200, {
    status: "connected",
    user: session.user,
    mode: session.mode,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
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
    const route = req.url.split("?")[0];
    let task;
    if (route === "/api/inspect") task = handleInspect(req, res);
    else if (route === "/api/roast") task = handleRoast(req, res);
    else if (route === "/api/ai/providers") task = handleProviderCatalog(req, res);
    else if (route === "/api/auth/github/start") task = handleGithubOAuthStart(req, res);
    else if (route === "/api/auth/github/callback") task = handleGithubOAuthCallback(req, res);
    else if (route === "/api/auth/github/session") task = handleGithubSession(req, res);
    if (task) {
      Promise.resolve(task).catch((error) => {
        if (!res.headersSent) sendJson(res, 500, { error: error?.message || String(error) });
        else res.end();
      });
      return;
    }
    if (req.url.startsWith("/assests/") || req.url === "/assests") {
      return serveUnderRoot(req, res, ASSETS_DIR, "/assests");
    }
    serveStatic(req, res);
  });
}

function openBrowser(url) {
  if (process.env.VIBE_ROAST_NO_OPEN === "1") return;
  const cmd = process.platform === "darwin" ? `open "${url}"`
    : process.platform === "win32" ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function start({ terminal = createTerminalLaunch() } = {}) {
  terminal.intro();
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(PORT, async () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : PORT;
      const url = `http://localhost:${port}`;
      await terminal.ready(url);
      openBrowser(url);
      resolve(server);
    });
  });
}

module.exports = {
  DEFAULT_GITHUB_AUTH_BROKER_URL,
  DEFAULT_GITHUB_CLIENT_ID,
  createServer,
  githubAuthConfig,
  githubCallbackUrl,
  githubClientId,
  githubSessionFile,
  requestOrigin,
  start,
};
