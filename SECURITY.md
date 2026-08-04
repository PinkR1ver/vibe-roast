# Security Policy

## Supported versions

Security fixes target the latest published version and the current `main`
branch. Older releases may not receive patches.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository's **Security** tab.
2. Select **Advisories**.
3. Choose **Report a vulnerability**.

Include:

- affected version or commit;
- impact and realistic attack scenario;
- minimal reproduction;
- whether secrets or private session data may have been exposed;
- a suggested mitigation, if available.

Do not include real user histories, credentials, API keys, OAuth tokens, or
other people's private data. Use synthetic evidence whenever possible.

Maintainers will acknowledge a complete report as soon as practical, assess
severity, coordinate a fix, and credit the reporter unless anonymity is
requested. Public disclosure should wait until a fix or mitigation is ready.

## Security boundaries

Vibe Roaster is designed for localhost use. Raw prompt records and local
environment metadata are not anonymized API output. Reports involving network
exposure, OAuth, hosted inference, package publishing, or session-file
permissions are especially important.
