const FLOW_TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 2 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_EXCHANGE_BODY = 16 * 1024;
const MAX_AI_BODY = 64 * 1024;
const API_VERSION = "2026-03-10";
const FREE_AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const DEFAULT_FREE_AI_DAILY_CALLS = 9;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function base64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function decodeBase64Url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new Uint8Array([...binary].map((character) => character.charCodeAt(0)));
}

async function sha256(value) {
  return base64Url(new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  ));
}

export function isLoopbackCallback(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:"
      && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      && url.pathname === "/api/auth/github/callback"
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

function brokerPublicUrl(request, env) {
  const configured = String(env.AUTH_BROKER_PUBLIC_URL || "").replace(/\/+$/, "");
  const url = new URL(configured || request.url);
  return url.origin;
}

function assertConfig(env) {
  const missing = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "AUTH_BROKER_SESSION_SECRET",
  ].filter((key) => !env[key]);
  if (missing.length) {
    const error = new Error(`Missing Worker configuration: ${missing.join(", ")}`);
    error.status = 503;
    throw error;
  }
}

function stateStub(env) {
  return env.OAUTH_STATE.get(env.OAUTH_STATE.idFromName("vibe-roast-oauth"));
}

async function stateRequest(env, pathname, payload) {
  const response = await stateStub(env).fetch(`https://oauth-state.internal${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "OAuth state storage failed");
  return body.value ?? null;
}

export async function signedSession(secret, user, expiresAt) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    sub: user.login,
    avatarUrl: user.avatarUrl,
    profileUrl: user.profileUrl,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt / 1000),
  }));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifySignedSession(secret, token) {
  const [encodedHeader, encodedPayload, encodedSignature, ...extra] = String(token || "").split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length) {
    throw Object.assign(new Error("A valid GitHub session is required"), { status: 401 });
  }
  let header;
  let payload;
  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader)));
    payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
  } catch {
    throw Object.assign(new Error("A valid GitHub session is required"), { status: 401 });
  }
  if (header?.alg !== "HS256" || header?.typ !== "JWT" || !payload?.sub) {
    throw Object.assign(new Error("A valid GitHub session is required"), { status: 401 });
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid || !Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error("The GitHub session is invalid or expired"), { status: 401 });
  }
  return payload;
}

async function handleStart(request, env) {
  assertConfig(env);
  const requestUrl = new URL(request.url);
  const callback = String(requestUrl.searchParams.get("callback") || "");
  const localState = String(requestUrl.searchParams.get("state") || "");
  if (!isLoopbackCallback(callback) || !localState || localState.length > 512) {
    return json({ error: "A valid loopback callback and state are required" }, 400);
  }

  const brokerState = randomToken();
  const verifier = randomToken(48);
  await stateRequest(env, "/flow/put", {
    key: brokerState,
    value: {
      callback,
      localState,
      verifier,
      expiresAt: Date.now() + FLOW_TTL_MS,
    },
  });

  const publicUrl = brokerPublicUrl(request, env);
  const authorizationUrl = new URL("https://github.com/login/oauth/authorize");
  authorizationUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", `${publicUrl}/oauth/github/callback`);
  authorizationUrl.searchParams.set("state", brokerState);
  authorizationUrl.searchParams.set("code_challenge", await sha256(verifier));
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  return redirect(authorizationUrl.toString());
}

async function exchangeGithubCode(request, env, flow, code) {
  const publicUrl = brokerPublicUrl(request, env);
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${publicUrl}/oauth/github/callback`,
      code_verifier: flow.verifier,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const error = new Error(payload.error_description || payload.error || "GitHub token exchange failed");
    error.status = 502;
    throw error;
  }
  return payload.access_token;
}

async function fetchGithubUser(accessToken) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "vibe-roast-auth",
      "X-GitHub-Api-Version": API_VERSION,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.login) {
    const error = new Error(payload.message || "GitHub returned no user identity");
    error.status = 502;
    throw error;
  }
  return {
    login: payload.login,
    avatarUrl: payload.avatar_url,
    profileUrl: payload.html_url,
  };
}

async function handleCallback(request, env) {
  assertConfig(env);
  const requestUrl = new URL(request.url);
  const brokerState = String(requestUrl.searchParams.get("state") || "");
  const flow = await stateRequest(env, "/flow/take", { key: brokerState });
  if (!flow || flow.expiresAt <= Date.now()) {
    return json({ error: "GitHub authorization expired" }, 400);
  }

  if (requestUrl.searchParams.get("error")) {
    const localUrl = new URL(flow.callback);
    localUrl.searchParams.set("state", flow.localState);
    localUrl.searchParams.set("error", requestUrl.searchParams.get("error"));
    localUrl.searchParams.set(
      "error_description",
      requestUrl.searchParams.get("error_description") || "GitHub authorization was cancelled",
    );
    return redirect(localUrl.toString());
  }

  const accessToken = await exchangeGithubCode(
    request,
    env,
    flow,
    String(requestUrl.searchParams.get("code") || ""),
  );
  const user = await fetchGithubUser(accessToken);
  const sessionExpiresAt = Date.now() + SESSION_TTL_MS;
  const ticket = randomToken();
  await stateRequest(env, "/ticket/put", {
    key: ticket,
    value: {
      callback: flow.callback,
      localState: flow.localState,
      user,
      sessionToken: await signedSession(env.AUTH_BROKER_SESSION_SECRET, user, sessionExpiresAt),
      sessionExpiresAt,
      expiresAt: Date.now() + TICKET_TTL_MS,
    },
  });

  const localUrl = new URL(flow.callback);
  localUrl.searchParams.set("state", flow.localState);
  localUrl.searchParams.set("ticket", ticket);
  return redirect(localUrl.toString());
}

async function readSmallJson(request, maxBytes = MAX_EXCHANGE_BODY) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    const error = new Error("Request body is too large");
    error.status = 413;
    throw error;
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    const error = new Error("Request body is too large");
    error.status = 413;
    throw error;
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

function bearerToken(request) {
  const match = String(request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function freeAiDailyCalls(env) {
  const configured = Number(env.FREE_AI_DAILY_CALLS || DEFAULT_FREE_AI_DAILY_CALLS);
  return Number.isInteger(configured) && configured > 0
    ? Math.min(configured, 100)
    : DEFAULT_FREE_AI_DAILY_CALLS;
}

async function consumeFreeAiQuota(env, subject) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const resetAt = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return stateRequest(env, "/quota/consume", {
    // v4 resets counters from the pre-release response/prompt debugging rollout.
    key: `v4:${subject}:${day}`,
    limit: freeAiDailyCalls(env),
    resetAt,
  });
}

function normalizeMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw Object.assign(new Error("1-8 chat messages are required"), { status: 400 });
  }
  let totalLength = 0;
  const messages = value.map((message) => {
    const role = String(message?.role || "");
    const content = String(message?.content || "");
    if (!["system", "user", "assistant"].includes(role) || !content) {
      throw Object.assign(new Error("Each message needs a valid role and text content"), { status: 400 });
    }
    totalLength += content.length;
    return { role, content };
  });
  if (totalLength > 50_000) {
    throw Object.assign(new Error("AI prompt is too large"), { status: 413 });
  }
  return messages;
}

function roastSnapshot(request) {
  const encoded = String(request.headers.get("x-vibe-roast-snapshot") || "");
  if (!encoded) return null;
  if (encoded.length > 8_000) {
    throw Object.assign(new Error("Roast snapshot is too large"), { status: 413 });
  }
  try {
    const snapshot = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded)));
    if (
      Number(snapshot?.snapshot_version) !== 1
      || !snapshot?.type_code
      || !Array.isArray(snapshot?.axes)
      || !Array.isArray(snapshot?.dimensions)
      || !Array.isArray(snapshot?.category_shares)
      || !Array.isArray(snapshot?.concepts)
    ) {
      throw new Error("invalid shape");
    }
    return snapshot;
  } catch {
    throw Object.assign(new Error("Roast snapshot is invalid"), { status: 400 });
  }
}

function rowsByKey(rows) {
  return new Map((rows || []).map((row) => [String(row?.key || ""), row]));
}

function largestRowDelta(previousRows, nextRows, field) {
  const previous = rowsByKey(previousRows);
  const next = rowsByKey(nextRows);
  const keys = new Set([...previous.keys(), ...next.keys()]);
  let largest = 0;
  for (const key of keys) {
    largest = Math.max(
      largest,
      Math.abs(Number(previous.get(key)?.[field] || 0) - Number(next.get(key)?.[field] || 0)),
    );
  }
  return largest;
}

function categoryDistance(previousRows, nextRows) {
  const previous = rowsByKey(previousRows);
  const next = rowsByKey(nextRows);
  const keys = new Set([...previous.keys(), ...next.keys()]);
  let total = 0;
  for (const key of keys) {
    total += Math.abs(Number(previous.get(key)?.share || 0) - Number(next.get(key)?.share || 0));
  }
  return total / 2;
}

function conceptOverlap(previousConcepts, nextConcepts) {
  const previous = new Set((previousConcepts || []).map(String));
  const next = new Set((nextConcepts || []).map(String));
  const union = new Set([...previous, ...next]);
  if (!union.size) return 1;
  let intersection = 0;
  for (const concept of previous) if (next.has(concept)) intersection += 1;
  return intersection / union.size;
}

export function isMaterialRoastChange(previous, next) {
  if (!previous || !next) return true;
  if (
    previous.snapshot_version !== next.snapshot_version
    || previous.writer_prompt_version !== next.writer_prompt_version
    || previous.evidence_schema_version !== next.evidence_schema_version
    || previous.type_code !== next.type_code
    || previous.status !== next.status
  ) return true;
  if (Math.abs(Number(previous.confidence || 0) - Number(next.confidence || 0)) >= 20) return true;

  const previousAxes = rowsByKey(previous.axes);
  const nextAxes = rowsByKey(next.axes);
  if (previousAxes.size !== nextAxes.size) return true;
  for (const [key, axis] of previousAxes) {
    const nextAxis = nextAxes.get(key);
    if (!nextAxis || axis.chosen !== nextAxis.chosen) return true;
  }
  if (largestRowDelta(previous.axes, next.axes, "left_percent") >= 15) return true;
  if (largestRowDelta(previous.dimensions, next.dimensions, "value") >= 18) return true;
  if (categoryDistance(previous.category_shares, next.category_shares) >= 20) return true;
  if (
    previous.concepts?.length >= 4
    && next.concepts?.length >= 4
    && conceptOverlap(previous.concepts, next.concepts) < 0.4
  ) return true;
  if (previous.top_agent && next.top_agent && previous.top_agent !== next.top_agent) return true;
  return false;
}

async function cachedRoast(env, subject) {
  return stateRequest(env, "/roast/get", { key: `v1:${String(subject).toLowerCase()}` });
}

async function storeRoast(env, subject, value) {
  return stateRequest(env, "/roast/put", {
    key: `v1:${String(subject).toLowerCase()}`,
    value,
  });
}

function completionResponse(content, {
  cache,
  createdAt = Date.now(),
  usage,
  quota,
} = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Vibe-Roast-Cache": cache,
  };
  if (quota) {
    headers["X-RateLimit-Limit"] = String(quota.limit);
    headers["X-RateLimit-Remaining"] = String(quota.remaining);
  }
  return new Response(JSON.stringify({
    id: `chatcmpl-${randomToken(12)}`,
    object: "chat.completion",
    created: Math.floor(createdAt / 1000),
    model: FREE_AI_MODEL,
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: "stop",
    }],
    usage,
  }), { status: 200, headers });
}

async function handleFreeAiCompletion(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.AUTH_BROKER_SESSION_SECRET || !env.AI) {
    return json({ error: "Free AI is not configured" }, 503);
  }
  const session = await verifySignedSession(
    env.AUTH_BROKER_SESSION_SECRET,
    bearerToken(request),
  );
  const body = await readSmallJson(request, MAX_AI_BODY);
  const messages = normalizeMessages(body.messages);
  const snapshot = roastSnapshot(request);
  if (snapshot) {
    const cached = await cachedRoast(env, session.sub).catch(() => null);
    if (cached?.content && !isMaterialRoastChange(cached.snapshot, snapshot)) {
      return completionResponse(cached.content, {
        cache: "HIT",
        createdAt: Number(cached.createdAt) || Date.now(),
      });
    }
  }
  const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (lastUserIndex >= 0) {
    messages[lastUserIndex] = {
      ...messages[lastUserIndex],
      content: `${messages[lastUserIndex].content}\n\n/no_think`,
    };
  }
  const quota = await consumeFreeAiQuota(env, session.sub);
  if (!quota?.allowed) {
    return new Response(JSON.stringify({
      error: {
        message: "Daily free roast limit reached. Use your own provider key or try again after 00:00 UTC.",
        type: "rate_limit_error",
      },
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, Math.ceil((quota.resetAt - Date.now()) / 1000))),
        "X-RateLimit-Limit": String(quota.limit),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  const temperature = Math.max(0, Math.min(1.2, Number(body.temperature) || 0.72));
  const maxTokens = Math.max(128, Math.min(1800, Number(body.max_tokens) || 1200));
  const result = await env.AI.run(FREE_AI_MODEL, {
    messages,
    temperature,
    max_tokens: maxTokens,
    chat_template_kwargs: { enable_thinking: false },
  });
  const content = workersAiContent(result);
  if (!content) {
    throw Object.assign(new Error("Workers AI returned no roast content"), { status: 502 });
  }
  const createdAt = Date.now();
  if (snapshot) {
    await storeRoast(env, session.sub, {
      snapshot,
      content,
      createdAt,
      model: FREE_AI_MODEL,
    }).catch(() => {});
  }
  return completionResponse(content, {
    cache: "MISS",
    createdAt,
    usage: result?.usage,
    quota,
  });
}

export function workersAiContent(result) {
  if (typeof result === "string") return result;
  const candidates = [
    result?.response,
    result?.choices?.[0]?.message?.content,
    result?.choices?.[0]?.text,
    result?.choices?.[0]?.message?.reasoning,
    result?.choices?.[0]?.message?.reasoning_content,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object") return JSON.stringify(candidate);
  }
  return "";
}

async function handleExchange(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readSmallJson(request);
  const ticket = await stateRequest(env, "/ticket/take", { key: String(body.ticket || "") });
  if (
    !ticket
    || ticket.expiresAt <= Date.now()
    || ticket.localState !== String(body.state || "")
    || ticket.callback !== String(body.callback || "")
  ) {
    return json({ error: "The GitHub sign-in ticket is invalid or expired" }, 400);
  }
  return json({
    sessionToken: ticket.sessionToken,
    expiresAt: new Date(ticket.sessionExpiresAt).toISOString(),
    user: ticket.user,
  });
}

export class OAuthState {
  constructor(ctx) {
    this.storage = ctx.storage;
  }

  async take(key) {
    return this.storage.transaction(async (transaction) => {
      const value = await transaction.get(key);
      if (value !== undefined) await transaction.delete(key);
      return value ?? null;
    });
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const key = String(body.key || "");
    if (!key) return json({ error: "Storage key is required" }, 400);
    const namespace = url.pathname.startsWith("/flow/")
      ? "flow"
      : url.pathname.startsWith("/quota/")
        ? "quota"
        : url.pathname.startsWith("/roast/")
          ? "roast"
          : "ticket";
    const storageKey = `${namespace}:${key}`;

    if (url.pathname === "/quota/consume") {
      const limit = Math.max(1, Number(body.limit) || DEFAULT_FREE_AI_DAILY_CALLS);
      const resetAt = Number(body.resetAt) || Date.now() + 24 * 60 * 60 * 1000;
      const value = await this.storage.transaction(async (transaction) => {
        const current = await transaction.get(storageKey);
        const count = Number(current?.count || 0);
        if (count >= limit) {
          return { allowed: false, limit, remaining: 0, resetAt };
        }
        await transaction.put(storageKey, { count: count + 1, resetAt });
        return {
          allowed: true,
          limit,
          remaining: Math.max(0, limit - count - 1),
          resetAt,
        };
      });
      return json({ value });
    }

    if (url.pathname.endsWith("/put")) {
      await this.storage.put(storageKey, body.value);
      return json({ ok: true });
    }
    if (url.pathname.endsWith("/get")) {
      return json({ value: await this.storage.get(storageKey) ?? null });
    }
    if (url.pathname.endsWith("/take")) {
      return json({ value: await this.take(storageKey) });
    }
    return json({ error: "Not found" }, 404);
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        return json({
          ok: true,
          service: "vibe-roast-auth",
          freeAi: Boolean(env.AI),
          model: FREE_AI_MODEL,
        });
      }
      if (url.pathname === "/oauth/github/start" && request.method === "GET") {
        return await handleStart(request, env);
      }
      if (url.pathname === "/oauth/github/callback" && request.method === "GET") {
        return await handleCallback(request, env);
      }
      if (url.pathname === "/oauth/github/exchange") {
        return await handleExchange(request, env);
      }
      if (url.pathname === "/v1/chat/completions") {
        return await handleFreeAiCompletion(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: error?.message || String(error) }, Number(error?.status) || 500);
    }
  },
};
