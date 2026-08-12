# Security Policy

## Scope

This policy covers the application source code, the management API, the Hermes
MCP bridge, and the deployment scripts in this repository. Personal content,
database files, uploaded media, certificates, API keys, SMTP authorization
codes, and server credentials are deployment data and must never be committed.

## Reporting a vulnerability

Please do not publish credentials, exploit details, or sensitive logs in a
public issue. Use a private GitHub security advisory when available. Otherwise,
contact the repository owner through a private channel and include:

- affected version or commit;
- reproducible steps and expected impact;
- a minimal proof of concept without real credentials or personal data;
- any suggested mitigation.

## Deployment requirements

- Keep `/api/management/` on a private Docker network; do not expose it through
  public Nginx or a reverse proxy.
- Use separate high-entropy tokens for general management and private notes.
- Keep SMTP, Steam, WeRead, Hermes, and server credentials in root-readable
  runtime environment files outside Git.
- Rotate any credential that has appeared in chat, screenshots, logs, or a
  copied configuration file.
- Preserve the SQLite and upload directories during updates, and keep regular
  backups before bulk content changes.
