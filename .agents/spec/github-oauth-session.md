# One-click GitHub OAuth identity session

- Created: 2026-07-24
- Last updated: 2026-07-24
- Status: completed

## Goal

Replace repeated GitHub Device Code entry with a browser OAuth flow that returns automatically to the local npm app, while keeping the GitHub Client Secret out of the published package.

## Delivered

- GitHub authorization uses `state`, PKCE S256, a loopback callback, and a popup completion message.
- The local server keeps an HttpOnly SameSite cookie and persists its session outside the project at `~/.vibe-wrapper/github-auth.json` with `0600` permissions.
- `worker/src/index.mjs` runs as the production Cloudflare Worker broker, owns the GitHub secret through Cloudflare Secrets, validates loopback callbacks, and returns a two-minute one-time ticket.
- Public npm clients default to `https://auth.pinktalk.online`, which is configured as the Worker's Cloudflare Custom Domain. The environment variable remains an explicit self-hosting/development override, so end users see a normal **Continue with GitHub** action rather than deployment configuration.
- A SQLite-backed Durable Object persists OAuth flow/ticket state and atomically consumes each value once, so Worker isolates and restarts do not break the exchange.
- A direct OAuth mode using `VIBE_WRAPPER_GITHUB_CLIENT_SECRET` remains available for local development only.
- GitHub Models was removed from the writer providers. GitHub login represents identity only and never promises inference quota.
- The API-key and deterministic local roast paths remain independent of GitHub login.

## Broker contract

- `GET /oauth/github/start?callback=<loopback>&state=<local-state>` starts authorization.
- GitHub returns to `/oauth/github/callback` on the broker.
- The broker redirects to the local callback with `ticket` and the original local state.
- `POST /oauth/github/exchange` accepts `{ ticket, state, callback }` exactly once and returns a signed session plus the public GitHub user identity.

## Verification

- Backend tests cover configuration precedence, loopback rejection, PKCE parameters, Durable Object one-time consumption, callback exchange, replay rejection, cookie session lookup, and `0600` persistence.
- Wrangler dry-run validates the Worker bundle, Durable Object binding, and SQLite migration.
- The complete Node test suite and production Vite build pass.
