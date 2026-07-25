# Hosted free AI roast

- Created: 2026-07-24
- Last updated: 2026-07-24
- Status: completed

## Goal

Give public npm users an entertaining LLM-written roast without embedding a
shared provider key or depending on the retiring GitHub Models service.

## Design

- GitHub OAuth supplies account identity and a signed broker session.
- `auth.pinktalk.online/v1/chat/completions` exposes an authenticated,
  OpenAI-compatible gateway backed by Cloudflare Workers AI.
- The hosted model is fixed server-side to `@cf/qwen/qwen3-30b-a3b-fp8`.
- A SQLite Durable Object atomically limits each GitHub account to nine model
  calls per UTC day. The local writer uses one model call per roast.
- Request size, message count, output tokens, and temperature are bounded at
  the gateway. Anonymous callers and expired/tampered sessions are rejected.
- The existing local writer keeps deterministic personality fields immutable,
  sends only `roast_evidence`, and validates the bilingual JSON/schema before
  applying generated copy. It intentionally performs no post-generation
  grounding/style audit, editor pass, repair call, or semantic sanitizer.
- A compact material-change snapshot is stored with the generated roast under
  the authenticated GitHub identity. Reopening the npm app or using another
  device restores the same result and bypasses quota while the profile is
  materially equivalent.
- Cumulative token/activity growth and small score movement do not regenerate.
  Type/top-Agent changes, axis movement of at least 15 points, radar movement of
  at least 18 points, category-distribution movement of at least 20 points,
  confidence movement of at least 20 points, or a substantially replaced
  established concept set trigger a new roast.
- The browser automatically requests the hosted profile when an existing local
  GitHub session is detected. The Worker decides whether to restore or generate.
- BYOK providers and the deterministic local fallback remain available.

## Verification

- Worker tests cover signed-session enforcement, fixed model selection, and
  quota exhaustion, same-profile cache hits, and material-change invalidation.
- Server tests cover the authenticated hosted path and single-call writer flow.
- The full Node suite, UI production build, and Wrangler deployment dry-run are
  expected release checks.
- Worker version `dcf0c74d-8ef4-483b-b23b-327c8b192f00` is deployed at
  `auth.pinktalk.online` and `vibe-roast-auth.pinkr1ver.workers.dev`.
- The custom-domain health endpoint reports the configured Qwen model, the
  OAuth start endpoint redirects to the configured GitHub App callback with
  PKCE, and anonymous AI requests are rejected with HTTP 401.
- The Qwen adapter disables thinking with `/no_think` and normalizes both
  structured `response` objects and Cloudflare's Chat Completions fields,
  including its no-think `reasoning` compatibility field, into JSON text.
- The GitHub App callback is
  `https://auth.pinktalk.online/oauth/github/callback`; its client secret and
  the broker signing secret are stored only as encrypted Worker secrets.
