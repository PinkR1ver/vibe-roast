const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class FakeStorage {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key);
  }

  async put(key, value) {
    this.values.set(key, structuredClone(value));
  }

  async delete(key) {
    this.values.delete(key);
  }

  async transaction(callback) {
    return callback(this);
  }
}

async function workerFixture() {
  const module = await import("../worker/src/index.mjs");
  const storage = new FakeStorage();
  const durableObject = new module.OAuthState({ storage });
  const namespace = {
    idFromName(name) {
      return name;
    },
    get() {
      return {
        fetch(url, options) {
          return durableObject.fetch(new Request(url, options));
        },
      };
    },
  };
  return {
    module,
    storage,
    env: {
      OAUTH_STATE: namespace,
      GITHUB_CLIENT_ID: "Iv1.worker-test",
      GITHUB_CLIENT_SECRET: "worker-github-secret",
      AUTH_BROKER_SESSION_SECRET: "worker-session-secret-with-more-than-32-bytes",
      AUTH_BROKER_PUBLIC_URL: "https://vibe-roast-auth.example.workers.dev",
    },
  };
}

test("Cloudflare broker only accepts the expected loopback callback", async () => {
  const { module } = await workerFixture();
  assert.equal(module.isLoopbackCallback("http://localhost:7681/api/auth/github/callback"), true);
  assert.equal(module.isLoopbackCallback("http://127.0.0.1:5173/api/auth/github/callback"), true);
  assert.equal(module.isLoopbackCallback("https://localhost:7681/api/auth/github/callback"), false);
  assert.equal(module.isLoopbackCallback("http://localhost:7681/other"), false);
  assert.equal(module.isLoopbackCallback("https://attacker.example/api/auth/github/callback"), false);
});

test("Durable Object take is atomic and one-time", async () => {
  const { module, storage } = await workerFixture();
  const durableObject = new module.OAuthState({ storage });
  await durableObject.fetch(new Request("https://state.internal/flow/put", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "state-1", value: { ok: true } }),
  }));
  const first = await durableObject.fetch(new Request("https://state.internal/flow/take", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "state-1" }),
  }));
  const second = await durableObject.fetch(new Request("https://state.internal/flow/take", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "state-1" }),
  }));
  assert.deepEqual(await first.json(), { value: { ok: true } });
  assert.deepEqual(await second.json(), { value: null });
});

test("Cloudflare Worker completes OAuth and rejects ticket replay", async () => {
  const { module, env } = await workerFixture();
  const originalFetch = global.fetch;
  const callback = "http://localhost:7681/api/auth/github/callback";
  try {
    const startResponse = await module.default.fetch(new Request(
      `https://vibe-roast-auth.example.workers.dev/oauth/github/start?callback=${encodeURIComponent(callback)}&state=local-state`,
    ), env);
    assert.equal(startResponse.status, 302);
    const authorizationUrl = new URL(startResponse.headers.get("location"));
    assert.equal(authorizationUrl.origin, "https://github.com");
    assert.equal(authorizationUrl.searchParams.get("client_id"), "Iv1.worker-test");
    assert.equal(
      authorizationUrl.searchParams.get("redirect_uri"),
      "https://vibe-roast-auth.example.workers.dev/oauth/github/callback",
    );
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
    assert.ok(authorizationUrl.searchParams.get("code_challenge"));
    const brokerState = authorizationUrl.searchParams.get("state");

    global.fetch = async (url, options = {}) => {
      if (String(url) === "https://github.com/login/oauth/access_token") {
        const body = new URLSearchParams(options.body);
        assert.equal(body.get("client_secret"), "worker-github-secret");
        assert.equal(body.get("code"), "github-code");
        assert.ok(body.get("code_verifier"));
        return new Response(JSON.stringify({ access_token: "test-worker-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url) === "https://api.github.com/user") {
        assert.equal(options.headers.Authorization, "Bearer test-worker-token");
        return new Response(JSON.stringify({
          login: "octocat",
          avatar_url: "https://avatars.example/octocat.png",
          html_url: "https://github.com/octocat",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    };

    const callbackResponse = await module.default.fetch(new Request(
      `https://vibe-roast-auth.example.workers.dev/oauth/github/callback?code=github-code&state=${encodeURIComponent(brokerState)}`,
    ), env);
    assert.equal(callbackResponse.status, 302);
    const localRedirect = new URL(callbackResponse.headers.get("location"));
    assert.equal(localRedirect.origin, "http://localhost:7681");
    assert.equal(localRedirect.searchParams.get("state"), "local-state");
    const ticket = localRedirect.searchParams.get("ticket");
    assert.ok(ticket);

    const exchangeBody = JSON.stringify({ ticket, state: "local-state", callback });
    const exchangeResponse = await module.default.fetch(new Request(
      "https://vibe-roast-auth.example.workers.dev/oauth/github/exchange",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: exchangeBody,
      },
    ), env);
    assert.equal(exchangeResponse.status, 200);
    const session = await exchangeResponse.json();
    assert.equal(session.user.login, "octocat");
    assert.equal(session.sessionToken.split(".").length, 3);
    assert.ok(Date.parse(session.expiresAt) > Date.now());
    assert.equal(session.sessionToken.includes("worker-github-secret"), false);
    assert.equal(session.sessionToken.includes("worker-session-secret"), false);

    const replayResponse = await module.default.fetch(new Request(
      "https://vibe-roast-auth.example.workers.dev/oauth/github/exchange",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: exchangeBody,
      },
    ), env);
    assert.equal(replayResponse.status, 400);
    assert.match((await replayResponse.json()).error, /invalid or expired/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Workers AI free completion requires a signed session and enforces the daily limit", async () => {
  const { module, env } = await workerFixture();
  env.FREE_AI_DAILY_CALLS = "1";
  let runs = 0;
  env.AI = {
    async run(model, input) {
      runs += 1;
      assert.equal(model, "@cf/qwen/qwen3-30b-a3b-fp8");
      assert.equal(input.messages[0].role, "system");
      assert.match(input.messages.at(-1).content, /\/no_think$/);
      assert.equal(input.response_format, undefined);
      assert.deepEqual(input.chat_template_kwargs, { enable_thinking: false });
      return {
        response: {
          hashtags: ["PromptCartographer", "UITide", "TestSignal"],
          hashtagsZh: ["提示词制图师", "界面潮汐", "测试信号"],
          roast: "The observed prompts orbit UI details with a testing signal in the rear-view mirror.",
          roastZh: "观察到的提示词围着 UI 细节打转，测试信号则坐在后视镜里。",
          tldr: "Pixel radar on, verification radar warming up.",
          tldrZh: "像素雷达全开，验证雷达预热中。",
        },
        usage: { prompt_tokens: 100, completion_tokens: 80 },
      };
    },
  };
  const requestBody = JSON.stringify({
    model: "ignored-client-model",
    messages: [
      { role: "system", content: "Write a grounded roast." },
      { role: "user", content: "Use this aggregate evidence." },
    ],
    max_tokens: 800,
  });
  const snapshot = {
    snapshot_version: 1,
    writer_prompt_version: 1,
    evidence_schema_version: 1,
    type_code: "MPSF",
    status: "ready",
    confidence: 78,
    axes: [{ key: "verifier_shipper", chosen: "S", left_percent: 35 }],
    dimensions: [{ key: "build", value: 92 }],
    category_shares: [{ key: "implementation", share: 80 }],
    concepts: ["前庭", "hit", "ui", "testing"],
    top_agent: "codex",
  };
  const snapshotHeader = Buffer.from(JSON.stringify(snapshot)).toString("base64url");

  const anonymous = await module.default.fetch(new Request(
    "https://vibe-roast-auth.example.workers.dev/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    },
  ), env);
  assert.equal(anonymous.status, 401);

  const sessionToken = await module.signedSession(
    env.AUTH_BROKER_SESSION_SECRET,
    {
      login: "octocat",
      avatarUrl: "https://avatars.example/octocat.png",
      profileUrl: "https://github.com/octocat",
    },
    Date.now() + 60_000,
  );
  const first = await module.default.fetch(new Request(
    "https://vibe-roast-auth.example.workers.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
        "X-Vibe-Roast-Snapshot": snapshotHeader,
      },
      body: requestBody,
    },
  ), env);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("x-vibe-roast-cache"), "MISS");
  assert.equal(first.headers.get("x-ratelimit-remaining"), "0");
  const firstPayload = await first.json();
  assert.equal(firstPayload.model, "@cf/qwen/qwen3-30b-a3b-fp8");
  assert.equal(typeof firstPayload.choices[0].message.content, "string");
  assert.deepEqual(
    JSON.parse(firstPayload.choices[0].message.content).hashtags,
    ["PromptCartographer", "UITide", "TestSignal"],
  );

  const cached = await module.default.fetch(new Request(
    "https://vibe-roast-auth.example.workers.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
        "X-Vibe-Roast-Snapshot": snapshotHeader,
      },
      body: requestBody,
    },
  ), env);
  assert.equal(cached.status, 200);
  assert.equal(cached.headers.get("x-vibe-roast-cache"), "HIT");
  assert.equal(runs, 1);

  const changedSnapshot = {
    ...snapshot,
    type_code: "MPVF",
  };
  const limited = await module.default.fetch(new Request(
    "https://vibe-roast-auth.example.workers.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
        "X-Vibe-Roast-Snapshot": Buffer.from(JSON.stringify(changedSnapshot)).toString("base64url"),
      },
      body: requestBody,
    },
  ), env);
  assert.equal(limited.status, 429);
  assert.equal(runs, 1);
});

test("roast cache only invalidates for material profile changes", async () => {
  const { module } = await workerFixture();
  const base = {
    snapshot_version: 1,
    writer_prompt_version: 1,
    evidence_schema_version: 1,
    type_code: "MPSF",
    status: "ready",
    confidence: 78,
    axes: [{ key: "verifier_shipper", chosen: "S", left_percent: 35 }],
    dimensions: [{ key: "build", value: 80 }],
    category_shares: [
      { key: "implementation", share: 70 },
      { key: "testing", share: 30 },
    ],
    concepts: ["前庭", "hit", "ui", "testing"],
    top_agent: "codex",
  };
  assert.equal(module.isMaterialRoastChange(base, {
    ...base,
    confidence: 83,
    axes: [{ ...base.axes[0], left_percent: 42 }],
    dimensions: [{ key: "build", value: 90 }],
  }), false);
  assert.equal(module.isMaterialRoastChange(base, {
    ...base,
    axes: [{ ...base.axes[0], left_percent: 50 }],
  }), true);
  assert.equal(module.isMaterialRoastChange(base, {
    ...base,
    type_code: "MPVF",
  }), true);
});

test("Workers AI content normalization accepts structured and chat-completion responses", async () => {
  const { module } = await workerFixture();
  assert.equal(
    module.workersAiContent({ response: { roast: "structured" } }),
    "{\"roast\":\"structured\"}",
  );
  assert.equal(
    module.workersAiContent({
      response: "",
      choices: [{ message: { content: "{\"roast\":\"chat completion\"}" } }],
    }),
    "{\"roast\":\"chat completion\"}",
  );
  assert.equal(
    module.workersAiContent({
      response: null,
      choices: [{
        message: {
          content: null,
          reasoning: "{\"roast\":\"qwen no-think fallback\"}",
        },
      }],
    }),
    "{\"roast\":\"qwen no-think fallback\"}",
  );
});
