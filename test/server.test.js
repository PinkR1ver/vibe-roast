const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  DEFAULT_GITHUB_AUTH_BROKER_URL,
  DEFAULT_GITHUB_CLIENT_ID,
  createServer,
  githubAuthConfig,
  githubCallbackUrl,
  githubClientId,
  requestOrigin,
} = require("../src/server");

function preserveEnv(keys) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("GitHub OAuth defaults to the hosted broker and allows explicit development overrides", () => {
  const restore = preserveEnv([
    "VIBE_WRAPPER_AUTH_BROKER_URL",
    "VIBE_WRAPPER_GITHUB_CLIENT_ID",
    "VIBE_WRAPPER_GITHUB_CLIENT_SECRET",
  ]);
  try {
    delete process.env.VIBE_WRAPPER_AUTH_BROKER_URL;
    delete process.env.VIBE_WRAPPER_GITHUB_CLIENT_ID;
    delete process.env.VIBE_WRAPPER_GITHUB_CLIENT_SECRET;
    assert.equal(DEFAULT_GITHUB_CLIENT_ID, "Iv23li5jqHs7pMarqWPZ");
    assert.equal(DEFAULT_GITHUB_AUTH_BROKER_URL, "https://auth.pinktalk.online");
    assert.equal(githubClientId(), DEFAULT_GITHUB_CLIENT_ID);
    assert.deepEqual(githubAuthConfig(), {
      configured: true,
      mode: "broker",
      brokerUrl: DEFAULT_GITHUB_AUTH_BROKER_URL,
    });

    process.env.VIBE_WRAPPER_GITHUB_CLIENT_ID = "Iv1.test-override";
    process.env.VIBE_WRAPPER_GITHUB_CLIENT_SECRET = "local-secret";
    assert.deepEqual(githubAuthConfig(), {
      configured: true,
      mode: "direct",
      clientId: "Iv1.test-override",
      clientSecret: "local-secret",
    });

    process.env.VIBE_WRAPPER_AUTH_BROKER_URL = "https://auth.example.test/";
    assert.deepEqual(githubAuthConfig(), {
      configured: true,
      mode: "broker",
      brokerUrl: "https://auth.example.test",
    });
  } finally {
    restore();
  }
});

test("GitHub OAuth derives only loopback callback origins", () => {
  const localRequest = { headers: { host: "127.0.0.1:7681" } };
  assert.equal(requestOrigin(localRequest), "http://127.0.0.1:7681");
  assert.equal(githubCallbackUrl(localRequest), "http://127.0.0.1:7681/api/auth/github/callback");
  assert.throws(
    () => requestOrigin({ headers: { host: "attacker.example" } }),
    /only available from the local/,
  );
});

test("one-click GitHub OAuth uses PKCE and persists an owner-only local session", async () => {
  const restore = preserveEnv([
    "VIBE_WRAPPER_AUTH_BROKER_URL",
    "VIBE_WRAPPER_GITHUB_CALLBACK_URL",
    "VIBE_WRAPPER_GITHUB_CLIENT_ID",
    "VIBE_WRAPPER_GITHUB_CLIENT_SECRET",
    "VIBE_WRAPPER_GITHUB_SESSION_FILE",
  ]);
  const originalFetch = global.fetch;
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "vibe-wrapper-auth-"));
  const sessionFile = path.join(tempRoot, "github-auth.json");
  const server = createServer();
  try {
    delete process.env.VIBE_WRAPPER_AUTH_BROKER_URL;
    delete process.env.VIBE_WRAPPER_GITHUB_CALLBACK_URL;
    process.env.VIBE_WRAPPER_GITHUB_CLIENT_ID = "Iv1.oauth-test";
    process.env.VIBE_WRAPPER_GITHUB_CLIENT_SECRET = "test-secret";
    process.env.VIBE_WRAPPER_GITHUB_SESSION_FILE = sessionFile;

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    const startResponse = await originalFetch(`${baseUrl}/api/auth/github/start`, {
      redirect: "manual",
    });
    assert.equal(startResponse.status, 302);
    const authorizationUrl = new URL(startResponse.headers.get("location"));
    assert.equal(authorizationUrl.origin, "https://github.com");
    assert.equal(authorizationUrl.pathname, "/login/oauth/authorize");
    assert.equal(authorizationUrl.searchParams.get("client_id"), "Iv1.oauth-test");
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
    assert.ok(authorizationUrl.searchParams.get("code_challenge"));
    const state = authorizationUrl.searchParams.get("state");

    global.fetch = async (url, options = {}) => {
      if (String(url) === "https://github.com/login/oauth/access_token") {
        const body = new URLSearchParams(options.body);
        assert.equal(body.get("code"), "temporary-code");
        assert.equal(body.get("client_secret"), "test-secret");
        assert.ok(body.get("code_verifier"));
        return new Response(JSON.stringify({
          access_token: "test-access-token",
          expires_in: 28_800,
          refresh_token: "test-refresh-token",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url) === "https://api.github.com/user") {
        return new Response(JSON.stringify({
          login: "octocat",
          avatar_url: "https://avatars.example/octocat.png",
          html_url: "https://github.com/octocat",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return originalFetch(url, options);
    };

    const callbackResponse = await originalFetch(
      `${baseUrl}/api/auth/github/callback?code=temporary-code&state=${encodeURIComponent(state)}`,
      { redirect: "manual" },
    );
    assert.equal(callbackResponse.status, 200);
    const cookie = callbackResponse.headers.get("set-cookie").split(";")[0];
    assert.match(cookie, /^vibe_wrapper_github_session=/);

    const statusResponse = await originalFetch(`${baseUrl}/api/auth/github/session`, {
      headers: { Cookie: cookie },
    });
    const status = await statusResponse.json();
    assert.equal(status.status, "connected");
    assert.equal(status.mode, "direct");
    assert.equal(status.user.login, "octocat");
    assert.equal(status.user.profileUrl, "https://github.com/octocat");
    assert.ok(Date.parse(status.expiresAt) > Date.now());
    assert.equal(fs.statSync(sessionFile).mode & 0o777, 0o600);
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
    restore();
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});

test("GitHub broker sessions can generate through the hosted free AI endpoint", async () => {
  const restore = preserveEnv([
    "VIBE_WRAPPER_AUTH_BROKER_URL",
    "VIBE_WRAPPER_GITHUB_SESSION_FILE",
  ]);
  const originalFetch = global.fetch;
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "vibe-wrapper-hosted-ai-"));
  const sessionFile = path.join(tempRoot, "github-auth.json");
  const sessionId = "local-session-id";
  const brokerSessionToken = "signed-broker-session";
  const server = createServer();
  const modelPayload = {
    hashtags: ["PromptCartographer", "UITide", "TestSignal"],
    hashtagsZh: ["提示词制图师", "界面潮汐", "测试信号"],
    roast: "The observed prompts orbit interface details while the testing signal waits in the lobby.",
    roastZh: "观察到的提示词围着界面细节转圈，测试信号则在大厅里等号。",
    tldr: "The pixels have a project plan; verification has a calendar invite.",
    tldrZh: "像素已有项目计划，验证还只有日历邀请。",
  };
  try {
    process.env.VIBE_WRAPPER_AUTH_BROKER_URL = "https://auth.example.test";
    process.env.VIBE_WRAPPER_GITHUB_SESSION_FILE = sessionFile;
    await fsp.writeFile(sessionFile, JSON.stringify({
      sessionId,
      mode: "broker",
      user: { login: "octocat" },
      brokerSessionToken,
      expiresAt: Date.now() + 60_000,
    }), { mode: 0o600 });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    let hostedCalls = 0;
    global.fetch = async (url, options = {}) => {
      if (String(url) === "https://auth.example.test/v1/chat/completions") {
        hostedCalls += 1;
        assert.equal(options.headers.Authorization, `Bearer ${brokerSessionToken}`);
        const snapshot = JSON.parse(
          Buffer.from(options.headers["X-Vibe-Roast-Snapshot"], "base64url").toString("utf8"),
        );
        assert.equal(snapshot.type_code, "MPSF");
        const request = JSON.parse(options.body);
        assert.equal(request.model, "@cf/qwen/qwen3-30b-a3b-fp8");
        return new Response(JSON.stringify({
          model: request.model,
          choices: [{ message: { content: JSON.stringify(modelPayload) } }],
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Vibe-Roast-Cache": "MISS",
          },
        });
      }
      return originalFetch(url, options);
    };

    const anonymous = await originalFetch(`${baseUrl}/api/roast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "hosted",
        provider: "cloudflare",
        evidence: {
          schema_version: 1,
          immutable_profile: {
            type_code: "MPSF",
            status: "ready",
            confidence: 78,
            axes: [],
            dimensions: [],
          },
        },
      }),
    });
    assert.equal(anonymous.status, 401);

    const generatedResponse = await originalFetch(`${baseUrl}/api/roast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `vibe_wrapper_github_session=${sessionId}`,
      },
      body: JSON.stringify({
        mode: "hosted",
        provider: "cloudflare",
        evidence: {
          schema_version: 1,
          immutable_profile: {
            type_code: "MPSF",
            status: "ready",
            confidence: 78,
            axes: [],
            dimensions: [],
          },
        },
      }),
    });
    assert.equal(generatedResponse.status, 200);
    const generated = await generatedResponse.json();
    assert.equal(generated.generated.writer.provider, "cloudflare");
    assert.equal(generated.generated.writer.model, "@cf/qwen/qwen3-30b-a3b-fp8");
    assert.equal(generated.generated.writer.cached, false);
    assert.equal(hostedCalls, 1);
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
    restore();
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});
