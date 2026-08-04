---
applyTo: "worker/**,src/server.js,src/lib/ai-roast.js,src/lib/roast-evidence.js"
---

Treat these paths as security-sensitive.

- Check OAuth state, PKCE, callback origin, cookie flags, replay resistance, and
  quota atomicity.
- Confirm provider credentials remain process-local and are never logged.
- Hosted inference receives aggregate evidence, not raw prompts or paths.
- Require bounded input, explicit failure behavior, and tests for malformed or
  unauthorized requests.
- Flag any new permissive network exposure or CORS behavior.
