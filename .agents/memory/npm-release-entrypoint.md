# npm release entrypoint

Last reviewed: 2026-07-22

As of v0.1.0 packaging work, the npm package is intended to run the dashboard by default:

- `npx vibe-wrapper@0.1.0` should start the local dashboard server and open the browser.
- `vibe-wrapper serve` is the explicit equivalent.
- `vibe-wrapper install` remains the manual command for installing Codex/Claude hooks.
- Do not use `postinstall` for hook installation; npm/npx install should not mutate user tool configuration automatically.
- The published package should include the CLI, backend source, built `dashboard/dist`, the `assests/` visual pack, and README through the root `files` whitelist.
- `prepack` builds the dashboard so `dashboard/dist` exists before pack/publish.

Release status notes:

- v0.1.0 is published on npm at `https://registry.npmjs.org/vibe-wrapper/-/vibe-wrapper-0.1.0.tgz`.
- Local verification for v0.1.0 package preparation passed: tests pass, `npm pack` includes the built dashboard assets, and local `npx ./vibe-wrapper-0.1.0.tgz` starts the dashboard.
- Future npm publishes may require an OTP or a granular access token with publish 2FA bypass enabled.
- Keep npm credentials only in ignored local files such as `.env/`; never commit registry tokens.
- `assests/` is the stable package directory and URL spelling. Renaming it requires an explicit compatibility migration across score paths, server routes, Vite proxying, README, and existing consumers.
