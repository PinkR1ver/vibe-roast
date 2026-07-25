# Vibe Roast Auth · Cloudflare Worker

This Worker is the production OAuth broker and hosted free-roast gateway for
the public npm client. It keeps GitHub secrets off user machines, stores OAuth
flows and one-time tickets in a SQLite-backed Durable Object, and invokes
Cloudflare Workers AI through a server-only binding.

## Configure

Authenticate Wrangler:

```bash
npm run worker:login
```

Set the two server-only secrets:

```bash
npm run worker:secret:github
npm run worker:secret:session
```

- `GITHUB_CLIENT_SECRET`: the GitHub App client secret.
- `AUTH_BROKER_SESSION_SECRET`: at least 32 random bytes; for example,
  `openssl rand -base64 48`.

The public GitHub App client ID lives in `wrangler.jsonc`. Override it there if
the app registration changes.

## Deploy

```bash
npm run worker:deploy
```

Wrangler binds the Worker to the configured Cloudflare Custom Domain:

```text
https://auth.pinktalk.online
```

Configure the GitHub App callback with this exact URL:

```text
https://auth.pinktalk.online/oauth/github/callback
```

The public npm app uses `https://auth.pinktalk.online` automatically. Users do
not need to configure `VIBE_ROAST_AUTH_BROKER_URL`; that variable is only an
override for local development or a self-hosted broker.

`AUTH_BROKER_PUBLIC_URL` pins OAuth redirects to the Custom Domain even when
the `workers.dev` preview URL is also enabled. It is not confidential.

## Hosted free AI

`POST /v1/chat/completions` is an OpenAI-compatible internal endpoint used by
the localhost npm server. It requires the signed broker session returned after
GitHub OAuth; it is not an anonymous public inference endpoint.

- Model: `@cf/qwen/qwen3-30b-a3b-fp8`
- Default quota: 9 model calls per GitHub account per UTC day
- Configuration: `FREE_AI_DAILY_CALLS` in `wrangler.jsonc`
- Limits: at most 8 messages, 50,000 characters of prompt text, and 1,800
  output tokens per call

The local roast writer spends one model call per roast. It validates the
bilingual JSON/schema but does not run a post-generation grounding/style audit,
editor pass, or repair call. Raw prompts and local paths are never sent; only
the aggregate `roast_evidence` packet is used.

The localhost client also sends a compact behavioral snapshot header. The
Durable Object binds the generated roast to the authenticated GitHub identity
and reuses it without consuming quota while the profile remains materially
equivalent. Token growth and minor score movement do not invalidate the cache;
type changes, large axis/radar/category shifts, a substantially different
concept set, or a changed top Agent do. The cache contains aggregate snapshot
fields and generated copy, never raw prompts.

## Local development

Create an ignored `worker/.dev.vars`:

```dotenv
GITHUB_CLIENT_SECRET=...
AUTH_BROKER_SESSION_SECRET=...
AUTH_BROKER_PUBLIC_URL=http://localhost:8787
```

Then run:

```bash
npm run worker:dev
```

The GitHub App must include the matching local callback URL while testing.
