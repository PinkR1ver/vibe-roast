# npm release entrypoint

Last reviewed: 2026-07-26

As of the v0.98.0 rename, the npm package is `vibe-roast` and runs the dashboard by default:

- `npx vibe-roast@0.98.0` should start the local dashboard server and open the browser.
- `vibe-roast serve` is the explicit equivalent.
- `vibe-roast install` remains the manual command for installing Codex/Claude hooks.
- `vibe-roast` is the sole npm executable. Runtime state lives under `~/.vibe-roast`, and product-specific environment variables use the `VIBE_ROAST_*` prefix.
- Do not use `postinstall` for hook installation; npm/npx install should not mutate user tool configuration automatically.
- The published package should include the CLI, backend source, built `dashboard/dist`, the `assests/` visual pack, and README through the root `files` whitelist.
- `prepack` builds the dashboard so `dashboard/dist` exists before pack/publish.

Release status notes:

- v0.98.0 was published on 2026-07-26: <https://www.npmjs.com/package/vibe-roast/v/0.98.0>.
- v0.98.1 is prepared to remove the temporary legacy CLI alias, retire the old static report, add the interactive terminal launch, and standardize runtime state, environment variables, OAuth identifiers, and hooks on the Vibe Roast brand.
- Future npm publishes may require an OTP or a granular access token with publish 2FA bypass enabled.
- Keep npm credentials only in ignored local files such as `.env/`; never commit registry tokens.
- `assests/` is the stable package directory and URL spelling. Renaming it requires an explicit compatibility migration across score paths, server routes, Vite proxying, README, and existing consumers.
