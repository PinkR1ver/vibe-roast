# npm release entrypoint

As of v0.1.0 packaging work, the npm package should open the Roast Result UI by default:

- `npx vibe-wrapper@0.1.0` starts the local server and opens the browser to Roast Result.
- `vibe-wrapper serve` is the explicit equivalent.
- `vibe-wrapper install` remains the manual command for installing Codex/Claude hooks.
- Do not use `postinstall` for hook installation; npm/npx install should not mutate user tool configuration automatically.
- The published package should include only the CLI, server/source files, README, visual assets under `assests/`, and built `dashboard/dist` through the root `files` whitelist.
- `prepack` builds the Roast Result UI so `dashboard/dist` exists before pack/publish.

Release status notes:

- v0.1.0 is published on npm at `https://registry.npmjs.org/vibe-wrapper/-/vibe-wrapper-0.1.0.tgz`.
- Local verification for v0.1.0 package preparation passed: tests pass, `npm pack` includes the built UI assets, and local `npx ./vibe-wrapper-0.1.0.tgz` starts Roast Result.
- Future npm publishes may require an OTP or a granular access token with publish 2FA bypass enabled.
- Keep npm credentials only in ignored local files such as `.env/`; never commit registry tokens.
